// Decorators for NestJS services
// These are placeholders that will be fully implemented in services

/**
 * Decorator to mark a method as requiring authentication
 */
export function RequireAuth(): MethodDecorator {
  return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    return descriptor;
  };
}

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
export function RateLimit(limit: number, windowMs: number): MethodDecorator {
  return (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('rateLimit', { limit, windowMs }, descriptor.value);
    return descriptor;
  };
}

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
