import { SetMetadata } from '@nestjs/common';

export enum Role {
  USER = 'user',
  TRADER = 'trader',
  VERIFIED_TRADER = 'verified_trader',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
