// The entire implementation supporting both sync and async generators

// Simple type for service shape
type ServiceShape = Record<string, (...args: any[]) => any>;

// Service instance with metadata
export class ServiceInstance<T extends ServiceShape> {
  constructor(
    public readonly name: string,
    public readonly shape: T
  ) {}
  
  // Make it yieldable in sync generators
  *[Symbol.iterator](): Generator<ServiceInstance<T>, T, T> {
    return yield this;
  }
  
  // Make it yieldable in async generators
  async *[Symbol.asyncIterator](): AsyncGenerator<ServiceInstance<T>, T, T> {
    return yield this;
  }
}

// Service constructor function
export function Service<T extends ServiceShape>(
  name: string, 
  shape: T
): ServiceInstance<T> {
  return new ServiceInstance(name, shape);
}

// Type to extract services from generators
type ExtractServices<G> = G extends Generator<infer S, any, any> | AsyncGenerator<infer S, any, any>
  ? S extends ServiceInstance<infer T>
    ? T
    : never
  : never;

// Type for service implementations
type ServiceImpls<G> = {
  [K in ExtractServices<G> extends never ? never : ExtractServices<G>['name']]: 
    Extract<ExtractServices<G>, { name: K }>['shape']
};

// Main run function - now supports both sync and async generators
export async function run<T, G extends Generator<any, T, any> | AsyncGenerator<any, T, any>>(
  generator: G,
  services: ServiceImpls<G>
): Promise<T> {
  // Convert sync generator to async generator if needed
  const asyncGen = isAsyncGenerator(generator) 
    ? generator 
    : toAsyncGenerator(generator as Generator<any, T, any>);
  
  let result = await asyncGen.next();
  
  while (!result.done) {
    if (result.value instanceof ServiceInstance) {
      const impl = services[result.value.name];
      if (!impl) {
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
export default { Service, run };