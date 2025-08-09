// Enhanced DI implementation with runtime-based type safety

export class ServiceInstance<Name extends string, T> {
  constructor(
    public readonly name: Name,
    public readonly contract: T
  ) {}
  
  *[Symbol.iterator](): Generator<ServiceInstance<Name, T>, T, T> {
    return yield this;
  }
  
  async *[Symbol.asyncIterator](): AsyncGenerator<ServiceInstance<Name, T>, T, T> {
    return yield this;
  }
  
  make(implementation: T): T {
    return implementation;
  }
  
  mock(partial: Partial<T>): T {
    return partial as T;
  }
}

export function Service<Name extends string, T>(
  name: Name, 
  contract: T
): ServiceInstance<Name, T> {
  return new ServiceInstance(name, contract);
}

// Create a runtime for type-safe dependency injection
export function createRuntime<T extends Record<string, ServiceInstance<any, any>>>(services: T) {
  type ServiceMap = {
    [K in keyof T]: T[K] extends ServiceInstance<any, infer Contract> ? Contract : never
  };
  
  return {
    services,
    
    async run<TReturn>(
      generator: Generator<any, TReturn, any> | AsyncGenerator<any, TReturn, any>,
      implementations: ServiceMap
    ): Promise<TReturn> {
      return runCore(generator, implementations);
    },
    
    runSync<TReturn>(
      generator: Generator<any, TReturn, any>,
      implementations: ServiceMap
    ): TReturn {
      return runSyncCore(generator, implementations);
    },
    
    // Additional helper to create a scoped runtime with partial implementations
    withDefaults(defaults: Partial<ServiceMap>) {
      return {
        async run<TReturn>(
          generator: Generator<any, TReturn, any> | AsyncGenerator<any, TReturn, any>,
          implementations: Partial<ServiceMap> = {}
        ): Promise<TReturn> {
          return runCore(generator, { ...defaults, ...implementations } as ServiceMap);
        },
        
        runSync<TReturn>(
          generator: Generator<any, TReturn, any>,
          implementations: Partial<ServiceMap> = {}
        ): TReturn {
          return runSyncCore(generator, { ...defaults, ...implementations } as ServiceMap);
        }
      };
    }
  };
}

// Core run implementation
async function runCore<TReturn>(
  generator: Generator<any, TReturn, any> | AsyncGenerator<any, TReturn, any>,
  services: Record<string, any>
): Promise<TReturn> {
  const asyncGen = isAsyncGenerator(generator) 
    ? generator 
    : toAsyncGenerator(generator as Generator<any, TReturn, any>);
  
  let result = await asyncGen.next();
  
  while (!result.done) {
    if (result.value instanceof ServiceInstance) {
      const impl = services[result.value.name];
      if (impl === undefined) {
        throw new Error(`Service '${result.value.name}' not provided`);
      }
      result = await asyncGen.next(impl);
    } else if (isAsyncGenerator(result.value) || isGenerator(result.value)) {
      const nested = await runCore(result.value, services);
      result = await asyncGen.next(nested);
    } else {
      result = await asyncGen.next(result.value);
    }
  }
  
  return result.value;
}

function runSyncCore<TReturn>(
  generator: Generator<any, TReturn, any>,
  services: Record<string, any>
): TReturn {
  let result = generator.next();
  
  while (!result.done) {
    if (result.value instanceof ServiceInstance) {
      const impl = services[result.value.name];
      if (impl === undefined) {
        throw new Error(`Service '${result.value.name}' not provided`);
      }
      result = generator.next(impl);
    } else if (isGenerator(result.value)) {
      const nested = runSyncCore(result.value, services);
      result = generator.next(nested);
    } else {
      result = generator.next(result.value);
    }
  }
  
  return result.value;
}

// Keep the original functions for backward compatibility
export const run = runCore;
export const runSync = runSyncCore;

// Helper functions
function isAsyncGenerator(value: any): value is AsyncGenerator {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

function isGenerator(value: any): value is Generator {
  return value && typeof value[Symbol.iterator] === 'function' && !isAsyncGenerator(value);
}

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

export default {
  Service,
  createRuntime,
  run,
  runSync,
  ServiceInstance
};