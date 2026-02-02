// Auth Types

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;
}