import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { KYC_PROVIDER, KycProvider } from '@exchange/common';

export interface ProviderCheckResult {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  result?: any;
  confidence?: number;
  details?: any;
}

@Injectable()
export class KycProviderService {
  private onfidoClient: AxiosInstance;
  private jumioClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Initialize Onfido client
    this.onfidoClient = axios.create({
      baseURL: this.configService.get<string>(
        'ONFIDO_API_URL',
        'https://api.onfido.com/v3',
      ),
      headers: {
        Authorization: `Token token=${this.configService.get<string>('ONFIDO_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
    });

    // Initialize Jumio client
    this.jumioClient = axios.create({
      baseURL: this.configService.get<string>(
        'JUMIO_API_URL',
        'https://api.jumio.com/api/v4',
      ),
      auth: {
        username: this.configService.get<string>('JUMIO_API_TOKEN', ''),
        password: this.configService.get<string>('JUMIO_API_SECRET', ''),
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Creates an Onfido applicant
   */
  async createOnfidoApplicant(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string> {
    try {
      const response = await this.onfidoClient.post('/applicants', {
        first_name: firstName,
        last_name: lastName,
        email,
      });

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create Onfido applicant: ${(error as Error).message}`);
    }
  }

  /**
   * Uploads a document to Onfido
   */
  async uploadOnfidoDocument(
    applicantId: string,
    file: Buffer,
    documentType: string,
    side: 'front' | 'back',
  ): Promise<string> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', file, { filename: 'document.jpg' });
      formData.append('type', documentType);
      formData.append('side', side);

      const response = await this.onfidoClient.post(
        `/applicants/${applicantId}/documents`,
        formData,
        {
          headers: formData.getHeaders(),
        },
      );

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to upload Onfido document: ${(error as Error).message}`);
    }
  }

  /**
   * Creates an Onfido check
   */
  async createOnfidoCheck(
    applicantId: string,
    reportTypes: string[] = ['document', 'facial_similarity_photo'],
  ): Promise<string> {
    try {
      const response = await this.onfidoClient.post('/checks', {
        applicant_id: applicantId,
        report_names: reportTypes,
      });

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create Onfido check: ${(error as Error).message}`);
    }
  }

  /**
   * Gets Onfido check result
   */
  async getOnfidoCheckResult(checkId: string): Promise<ProviderCheckResult> {
    try {
      const response = await this.onfidoClient.get(`/checks/${checkId}`);
      const check = response.data;

      let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
      if (check.status === 'complete') {
        status = check.result === 'clear' ? 'APPROVED' : 'REJECTED';
      }

      return {
        status,
        result: check.result,
        details: check,
      };
    } catch (error) {
      throw new Error(`Failed to get Onfido check result: ${(error as Error).message}`);
    }
  }

  /**
   * Handles Onfido webhook
   */
  async handleOnfidoWebhook(payload: any): Promise<ProviderCheckResult> {
    const { resource_type, action, object } = payload;

    if (resource_type === 'check' && action === 'check.completed') {
      return {
        status: object.result === 'clear' ? 'APPROVED' : 'REJECTED',
        result: object.result,
        details: object,
      };
    }

    return {
      status: 'PENDING',
      details: payload,
    };
  }

  /**
   * Creates a Jumio verification
   */
  async createJumioVerification(
    customerInternalReference: string,
    workflowId: string,
    callbackUrl?: string,
  ): Promise<{ transactionReference: string; redirectUrl: string }> {
    try {
      const response = await this.jumioClient.post('/initiateNetverify', {
        customerInternalReference,
        workflowDefinition: {
          key: workflowId,
        },
        callbackUrl:
          callbackUrl ||
          this.configService.get<string>('JUMIO_CALLBACK_URL'),
      });

      return {
        transactionReference: response.data.transactionReference,
        redirectUrl: response.data.redirectUrl,
      };
    } catch (error) {
      throw new Error(`Failed to create Jumio verification: ${(error as Error).message}`);
    }
  }

  /**
   * Gets Jumio verification result
   */
  async getJumioVerificationResult(
    transactionReference: string,
  ): Promise<ProviderCheckResult> {
    try {
      const response = await this.jumioClient.get(
        `/retrieveScanStatus/${transactionReference}`,
      );

      const scan = response.data;
      let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

      if (scan.status === 'SUCCESS') {
        status = scan.decision === 'PASSED' ? 'APPROVED' : 'REJECTED';
      } else if (scan.status === 'FAILED') {
        status = 'REJECTED';
      }

      return {
        status,
        result: scan.decision,
        confidence: scan.similarity ? parseFloat(scan.similarity) : undefined,
        details: scan,
      };
    } catch (error) {
      throw new Error(
        `Failed to get Jumio verification result: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Handles Jumio webhook
   */
  async handleJumioWebhook(payload: any): Promise<ProviderCheckResult> {
    const { verificationStatus, decision } = payload;

    let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

    if (verificationStatus === 'APPROVED_VERIFIED') {
      status = 'APPROVED';
    } else if (verificationStatus === 'DENIED_FRAUD' || verificationStatus === 'ERROR') {
      status = 'REJECTED';
    }

    return {
      status,
      result: decision,
      details: payload,
    };
  }

  /**
   * Main method to initiate KYC check with preferred provider
   */
  async initiateKycCheck(
    provider: KycProvider,
    userId: string,
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<string> {
    switch (provider) {
      case KYC_PROVIDER.ONFIDO:
        return await this.createOnfidoApplicant(firstName, lastName, email);

      case KYC_PROVIDER.JUMIO:
        const result = await this.createJumioVerification(
          userId,
          this.configService.get<string>('JUMIO_WORKFLOW_ID', 'default'),
        );
        return result.transactionReference;

      case KYC_PROVIDER.MANUAL:
        return 'MANUAL_REVIEW';

      default:
        throw new Error(`Unsupported KYC provider: ${provider}`);
    }
  }

  /**
   * Main method to get KYC check result
   */
  async getKycCheckResult(
    provider: KycProvider,
    checkId: string,
  ): Promise<ProviderCheckResult> {
    switch (provider) {
      case KYC_PROVIDER.ONFIDO:
        return await this.getOnfidoCheckResult(checkId);

      case KYC_PROVIDER.JUMIO:
        return await this.getJumioVerificationResult(checkId);

      case KYC_PROVIDER.MANUAL:
        return {
          status: 'PENDING',
          details: { message: 'Manual review required' },
        };

      default:
        throw new Error(`Unsupported KYC provider: ${provider}`);
    }
  }
}
