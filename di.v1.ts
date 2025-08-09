// Enhanced DI implementation with better type safety

// Service instance that can hold any type
export class ServiceInstance<Name extends string, T> {
  constructor(
    public readonly name: Name,
    public readonly defaultValue?: T
  ) {}
  
  // Make it yieldable in sync generators
  *[Symbol.iterator](): Generator<ServiceInstance<Name, T>, T, T> {
    return yield this;
  }
  
  // Make it yieldable in async generators
  async *[Symbol.asyncIterator](): AsyncGenerator<ServiceInstance<Name, T>, T, T> {
    return yield this;
  }
  
  // Create a typed implementation
  make(implementation: T): T {
    return implementation;
  }
  
  // Create a mock implementation (for testing)
  mock(partial: Partial<T>): T {
    if (typeof this.defaultValue === 'object' && this.defaultValue !== null) {
      return { ...this.defaultValue, ...partial } as T;
    }
    return partial as T;
  }
}

// Main Service function - now captures the name as a literal type
export function Service<Name extends string, T>(
  name: Name, 
  contract: T
): ServiceInstance<Name, T> {
  return new ServiceInstance(name, contract);
}

// Helper to extract all yielded services from a generator
type YieldedServices<T> = T extends Generator<infer Y, any, any> | AsyncGenerator<infer Y, any, any>
  ? Y extends ServiceInstance<infer Name, infer Contract>
    ? { [K in Name]: Contract }
    : YieldedServices<Y>
  : {};

// Merge all service requirements
type MergeServices<T> = T extends {}
  ? { [K in keyof T]: T[K] }
  : never;

// Main run function with better type inference
export async function run<TReturn>(
  generator: Generator<any, TReturn, any> | AsyncGenerator<any, TReturn, any>,
  services: MergeServices<YieldedServices<typeof generator>>
): Promise<TReturn> {
  // Convert sync generator to async generator if needed
  const asyncGen = isAsyncGenerator(generator) 
    ? generator 
    : toAsyncGenerator(generator as Generator<any, TReturn, any>);
  
  let result = await asyncGen.next();
  
  while (!result.done) {
    if (result.value instanceof ServiceInstance) {
      const impl = (services as any)[result.value.name];
      if (impl === undefined) {
        throw new Error(`Service '${result.value.name}' not provided`);
      }
      result = await asyncGen.next(impl);
    } else if (isAsyncGenerator(result.value) || isGenerator(result.value)) {
      // Handle nested generators
      const nested = await run(result.value, services);
      result = await asyncGen.next(nested);
    } else {
      // Pass through other values
      result = await asyncGen.next(result.value);
    }
  }
  
  return result.value;
}

// Alternative approach: Use a function wrapper for better type inference
export function createProgram<TServices extends Record<string, ServiceInstance<any, any>>, TReturn>(
  services: TServices,
  program: (services: {
    [K in keyof TServices]: TServices[K] extends ServiceInstance<any, infer T> ? T : never
  }) => Generator<any, TReturn, any> | AsyncGenerator<any, TReturn, any>
) {
  return {
    services,
    async run(implementations: {
      [K in keyof TServices]: TServices[K] extends ServiceInstance<any, infer T> ? T : never
    }): Promise<TReturn> {
      // Create a proxy to intercept service access
      const serviceProxy = new Proxy({} as any, {
        get(_, prop) {
          return function* () {
            return yield services[prop as keyof TServices];
          };
        }
      });
      
      const generator = program(serviceProxy);
      return run(generator, implementations as any);
    }
  };
}

// Sync version
export function runSync<TReturn>(
  generator: Generator<any, TReturn, any>,
  services: MergeServices<YieldedServices<typeof generator>>
): TReturn {
  let result = generator.next();
  
  while (!result.done) {
    if (result.value instanceof ServiceInstance) {
      const impl = (services as any)[result.value.name];
      if (impl === undefined) {
        throw new Error(`Service '${result.value.name}' not provided`);
      }
      result = generator.next(impl);
    } else if (isGenerator(result.value)) {
      // Handle nested sync generators
      const nested = runSync(result.value, services);
      result = generator.next(nested);
    } else {
      // Pass through other values
      result = generator.next(result.value);
    }
  }
  
  return result.value;
}

// Helper type guards
function isAsyncGenerator(value: any): value is AsyncGenerator {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

function isGenerator(value: any): value is Generator {
  return value && typeof value[Symbol.iterator] === 'function' && !isAsyncGenerator(value);
}

// Convert sync generator to async generator
async function* toAsyncGenerator<T, TReturn, TNext>(
  gen: Generator<T, TReturn, TNext>
): AsyncGenerator<T, TReturn, TNext> {
  let result = gen.next();
  while (!result.done) {
    try {
      const value = yield result.value;
      result = gen.next(value as TNext);
    } catch (e) {
      result = gen.throw!(e);
    }
  }
  return result.value;
}

// Export everything
export default { 
  Service, 
  run, 
  runSync,
  createProgram,
  ServiceInstance 
};