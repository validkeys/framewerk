// Enhanced DI with compile-time and runtime dependency checking

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

// The magic: Tag generators with their dependencies
export type WithDeps<TGen, TDeps> = TGen & { __deps?: TDeps };

// Helper to declare dependencies
export function deps<TDeps extends Record<string, any>>() {
  return <TGen extends (...args: any[]) => any>(
    generator: TGen
  ): WithDeps<TGen, TDeps> => {
    return generator as WithDeps<TGen, TDeps>;
  };
}

// Extract dependency types from a generator
type ExtractDeps<T> = T extends WithDeps<any, infer D> ? D : {};

// Merge dependency types
type MergeDeps<T extends Record<string, any>, U extends Record<string, any>> = T & U;

// Create a runtime that enforces dependencies at compile time
export function createRuntime<T extends Record<string, ServiceInstance<any, any>>>(services: T) {
  type ServiceMap = {
    [K in keyof T]: T[K] extends ServiceInstance<any, infer Contract> ? Contract : never
  };
  
  return {
    // Type-safe run that requires all dependencies
    run<TGen extends WithDeps<any, any>>(
      generator: TGen,
      implementations: ExtractDeps<TGen> extends ServiceMap 
        ? ServiceMap
        : ExtractDeps<TGen> extends Partial<ServiceMap>
          ? Required<Pick<ServiceMap, Extract<keyof ExtractDeps<TGen>, keyof ServiceMap>>>
          : never
    ): Promise<TGen extends (...args: any[]) => AsyncGenerator<any, infer R, any> ? R 
                : TGen extends (...args: any[]) => Generator<any, infer R, any> ? R 
                : never> {
      return runCore(
        typeof generator === 'function' ? generator() : generator, 
        implementations as any
      );
    },
    
    withDefaults(defaults: Partial<ServiceMap>) {
      return {
        run<TGen extends WithDeps<any, any>>(
          generator: TGen,
          implementations: Omit<ExtractDeps<TGen>, keyof typeof defaults> extends ServiceMap 
            ? Omit<ServiceMap, keyof typeof defaults>
            : Omit<ExtractDeps<TGen>, keyof typeof defaults> extends Partial<ServiceMap>
              ? Required<Pick<ServiceMap, Extract<keyof Omit<ExtractDeps<TGen>, keyof typeof defaults>, keyof ServiceMap>>>
              : {}
        ): Promise<TGen extends (...args: any[]) => AsyncGenerator<any, infer R, any> ? R 
                    : TGen extends (...args: any[]) => Generator<any, infer R, any> ? R 
                    : never> {
          return runCore(
            typeof generator === 'function' ? generator() : generator,
            { ...defaults, ...implementations } as any
          );
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
    const value = yield result.value;
    result = gen.next(value as TNext);
  }
  return result.value;
}

// Backwards compatibility
export const run = runCore;