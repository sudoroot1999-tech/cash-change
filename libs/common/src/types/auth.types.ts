export interface JwtPayload {
  sub: string;
  email: string;
  tier: string;
  kycLevel: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  tier: string;
  kycLevel: number;
}
