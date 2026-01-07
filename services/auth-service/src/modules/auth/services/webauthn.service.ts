import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server/script/deps';

@Injectable()
export class WebAuthnService {
  private rpName: string;
  private rpID: string;
  private origin: string;

  constructor(private configService: ConfigService) {
    this.rpName = this.configService.get('WEBAUTHN_RP_NAME', 'Auth Service');
    this.rpID = this.configService.get('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get('WEBAUTHN_ORIGIN', 'http://localhost:3000');
  }

  /**
   * Generate registration options for WebAuthn
   */
  async generateRegistrationOptions(
    userId: string,
    email: string,
    existingCredentials: any[] = [],
  ) {
    return generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: userId,
      userName: email,
      userDisplayName: email,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });
  }

  /**
   * Verify registration response
   */
  async verifyRegistration(
    response: RegistrationResponseJSON,
    expectedChallenge: string,
  ): Promise<VerifiedRegistrationResponse> {
    return verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });
  }

  /**
   * Generate authentication options
   */
  async generateAuthenticationOptions(credentials: any[]) {
    return generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    });
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: any,
  ): Promise<VerifiedAuthenticationResponse> {
    return verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      authenticator: {
        credentialID: credential.credentialID,
        credentialPublicKey: credential.credentialPublicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });
  }
}
