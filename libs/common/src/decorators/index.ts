import { UseGuards, applyDecorators, SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RequestContext } from '../types';

// Export the CurrentUser decorator
export { CurrentUser } from './user.decorator';

/**
 * Create context for request to add aditional information
 */
export const ReqContext = createParamDecorator(
  (_, ctx: ExecutionContext): RequestContext =>
    ctx.switchToHttp().getRequest().context,
);


/**
 * Decorator to mark a method or controller as requiring authentication
 */
export function RequireAuth() {
  return applyDecorators(UseGuards(JwtAuthGuard), ApiBearerAuth());
}

/**
 * Decorator to mark a method as public (bypassing JwtAuthGuard)
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Decorator to mark a method as requiring specific KYC level
 */
export function RequireKyc(level: number): MethodDecorator {
  return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('kycLevel', level, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to mark a method as requiring specific user tier
 */
export function RequireTier(...tiers: string[]): MethodDecorator {
  return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('requiredTiers', tiers, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator for rate limiting
 */
// export function RateLimit(limit: number, windowMs: number): MethodDecorator {
//   return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
//     Reflect.defineMetadata('rateLimit', { limit, windowMs }, descriptor.value);
//     return descriptor;
//   };
// }

/**
 * Decorator to log method execution time
 */
export function LogExecutionTime(): MethodDecorator {
  return (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const start = Date.now();
      try {
        return await originalMethod.apply(this, args);
      } finally {
        const duration = Date.now() - start;
        console.log(`[${String(propertyKey)}] executed in ${duration}ms`);
      }
    };
    return descriptor;
  };
}
