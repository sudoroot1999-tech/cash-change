import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  Reflect.metadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      this.checkPermission(user.permissions || [], permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private checkPermission(userPermissions: string[], required: string): boolean {
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check exact match
    if (userPermissions.includes(required)) {
      return true;
    }

    // Check for wildcard in specific resource (e.g., "users:*")
    const [resource] = required.split(':');
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    return false;
  }
}
