import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { DOCUMENT_TYPE, DocumentType } from '@exchange/common';

export interface OcrResult {
  documentType: DocumentType;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  expiryDate?: Date;
  issueDate?: Date;
  issuingCountry?: string;
  address?: string;
  confidence: number;
  rawData: any;
}

@Injectable()
export class OcrService {
  private ocrClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    // Initialize OCR client (e.g., AWS Textract, Google Vision API, or Azure Computer Vision)
    const ocrProvider = this.configService.get<string>('OCR_PROVIDER', 'AWS');

    if (ocrProvider === 'AWS') {
      // AWS Textract configuration would go here
      // For now, we'll use a generic REST API pattern
    } else if (ocrProvider === 'GOOGLE') {
      // Google Vision API configuration
    }

    // Generic OCR API client
    this.ocrClient = axios.create({
      baseURL: this.configService.get<string>('OCR_API_URL'),
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('OCR_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Extracts text from a document image using OCR
   */
  async extractDocumentData(
    imageBuffer: Buffer,
    documentType: DocumentType,
  ): Promise<OcrResult> {
    try {
      // Convert buffer to base64 for API submission
      const base64Image = imageBuffer.toString('base64');

      // This is a mock implementation - in production, you'd call the actual OCR service
      const mockResult = await this.mockOcrExtraction(base64Image, documentType);

      // Parse OCR results based on document type
      return this.parseOcrResults(mockResult, documentType);
    } catch (error) {
      throw new Error(`OCR extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Mock OCR extraction (replace with actual API calls in production)
   */
  private async mockOcrExtraction(
    base64Image: string,
    documentType: DocumentType,
  ): Promise<any> {
    // In production, this would call AWS Textract, Google Vision, or similar
    // Example AWS Textract call:
    // const AWS = require('aws-sdk');
    // const textract = new AWS.Textract();
    // const params = {
    //   Document: { Bytes: Buffer.from(base64Image, 'base64') },
    //   FeatureTypes: ['FORMS', 'TABLES']
    // };
    // return await textract.analyzeDocument(params).promise();

    // Mock response for demonstration
    return {
      blocks: [
        { text: 'PASSPORT', confidence: 95 },
        { text: 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<', confidence: 90 },
        { text: '1234567890', confidence: 88 },
        { text: '01 JAN 1990', confidence: 92 },
        { text: '01 JAN 2030', confidence: 91 },
      ],
    };
  }

  /**
   * Parses OCR results based on document type
   */
  private parseOcrResults(
    rawData: any,
    documentType: DocumentType,
  ): OcrResult {
    const result: OcrResult = {
      documentType,
      confidence: 0,
      rawData,
    };

    // Extract confidence score
    if (rawData.blocks && rawData.blocks.length > 0) {
      const confidences = rawData.blocks.map((b: any) => b.confidence || 0);
      result.confidence =
        confidences.reduce((a: number, b: number) => a + b, 0) /
        confidences.length;
    }

    // Parse based on document type
    switch (documentType) {
      case DOCUMENT_TYPE.PASSPORT:
        return this.parsePassport(rawData, result);
      case DOCUMENT_TYPE.DRIVER_LICENSE:
        return this.parseDriversLicense(rawData, result);
      case DOCUMENT_TYPE.NATIONAL_ID:
        return this.parseNationalId(rawData, result);
      case DOCUMENT_TYPE.UTILITY_BILL:
      case DOCUMENT_TYPE.BANK_STATEMENT:
      case DOCUMENT_TYPE.PROOF_OF_ADDRESS:
        return this.parseAddressDocument(rawData, result);
      default:
        return result;
    }
  }

  /**
   * Parses passport OCR data
   */
  private parsePassport(rawData: any, result: OcrResult): OcrResult {
    // Parse MRZ (Machine Readable Zone) for passports
    const mrzPattern =
      /P<([A-Z]{3})([A-Z<]+)<<([A-Z<]+)<+([A-Z0-9]{9})([0-9])([A-Z]{3})([0-9]{6})([0-9])([MF<])([0-9]{6})([0-9])/;

    const text = rawData.blocks?.map((b: any) => b.text).join(' ') || '';
    const match = text.match(mrzPattern);

    if (match) {
      result.issuingCountry = match[1];
      result.lastName = match[2].replace(/</g, ' ').trim();
      result.firstName = match[3].replace(/</g, ' ').trim();
      result.documentNumber = match[4];

      // Parse dates (YYMMDD format)
      const birthDate = this.parseDate(match[7]);
      const expiryDate = this.parseDate(match[10]);

      if (birthDate) result.dateOfBirth = birthDate;
      if (expiryDate) result.expiryDate = expiryDate;
    }

    return result;
  }

  /**
   * Parses driver's license OCR data
   */
  private parseDriversLicense(rawData: any, result: OcrResult): OcrResult {
    // Extract common fields from driver's license
    const text = rawData.blocks?.map((b: any) => b.text).join(' ') || '';

    // Look for license number pattern (varies by country/state)
    const licenseNumberPattern = /[A-Z0-9]{8,15}/;
    const match = text.match(licenseNumberPattern);
    if (match) {
      result.documentNumber = match[0];
    }

    // Extract dates
    const datePattern = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g;
    const dates = [...text.matchAll(datePattern)];
    if (dates.length > 0) {
      result.dateOfBirth = this.parseDate(dates[0][0]);
    }
    if (dates.length > 1) {
      result.expiryDate = this.parseDate(dates[1][0]);
    }

    return result;
  }

  /**
   * Parses national ID OCR data
   */
  private parseNationalId(rawData: any, result: OcrResult): OcrResult {
    const text = rawData.blocks?.map((b: any) => b.text).join(' ') || '';

    // Extract ID number
    const idPattern = /[A-Z0-9]{8,20}/;
    const match = text.match(idPattern);
    if (match) {
      result.documentNumber = match[0];
    }

    // Extract dates
    const datePattern = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g;
    const dates = [...text.matchAll(datePattern)];
    if (dates.length > 0) {
      result.dateOfBirth = this.parseDate(dates[0][0]);
    }

    return result;
  }

  /**
   * Parses address proof documents
   */
  private parseAddressDocument(rawData: any, result: OcrResult): OcrResult {
    const text = rawData.blocks?.map((b: any) => b.text).join('\n') || '';

    // Extract address (simplified pattern)
    const addressLines = text
      .split('\n')
      .filter((line) => line.length > 10 && /\d/.test(line));

    if (addressLines.length > 0) {
      result.address = addressLines.slice(0, 3).join(', ');
    }

    // Extract issue date
    const datePattern = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
    const match = text.match(datePattern);
    if (match) {
      result.issueDate = this.parseDate(match[0]);
    }

    return result;
  }

  /**
   * Helper method to parse dates in various formats
   */
  private parseDate(dateString: string): Date | undefined {
    try {
      // Try YYMMDD format
      if (/^\d{6}$/.test(dateString)) {
        const year = parseInt(dateString.substring(0, 2));
        const month = parseInt(dateString.substring(2, 4)) - 1;
        const day = parseInt(dateString.substring(4, 6));
        const fullYear = year > 50 ? 1900 + year : 2000 + year;
        return new Date(fullYear, month, day);
      }

      // Try DD/MM/YYYY or MM/DD/YYYY format
      if (/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(dateString)) {
        return new Date(dateString);
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Validates OCR results against user-provided data
   */
  validateOcrData(
    ocrResult: OcrResult,
    userProvidedData: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: Date;
      documentNumber?: string;
    },
  ): { isValid: boolean; discrepancies: string[] } {
    const discrepancies: string[] = [];

    if (
      userProvidedData.firstName &&
      ocrResult.firstName &&
      !this.fuzzyMatch(userProvidedData.firstName, ocrResult.firstName)
    ) {
      discrepancies.push('First name mismatch');
    }

    if (
      userProvidedData.lastName &&
      ocrResult.lastName &&
      !this.fuzzyMatch(userProvidedData.lastName, ocrResult.lastName)
    ) {
      discrepancies.push('Last name mismatch');
    }

    if (
      userProvidedData.documentNumber &&
      ocrResult.documentNumber &&
      userProvidedData.documentNumber !== ocrResult.documentNumber
    ) {
      discrepancies.push('Document number mismatch');
    }

    if (
      userProvidedData.dateOfBirth &&
      ocrResult.dateOfBirth &&
      userProvidedData.dateOfBirth.getTime() !== ocrResult.dateOfBirth.getTime()
    ) {
      discrepancies.push('Date of birth mismatch');
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies,
    };
  }

  /**
   * Fuzzy string matching for names (allows for minor OCR errors)
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');

    // Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = 1 - distance / maxLength;

    // Allow up to 10% difference
    return similarity >= 0.9;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1, // substitution
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
          );
        }
      }
    }

    return dp[m][n];
  }
}
