/**
 * @fileoverview Testing Utilities for Framewerk Services
 *
 * This module provides comprehensive testing utilities for services built with framewerk,
 * including mock helpers, assertion utilities, and test patterns.
 *
 * @example
 * ```typescript
 * // Basic service testing
 * const testHarness = createServiceTestHarness(userService, {
 *   database: MockFactories.database(),
 *   logger: MockFactories.logger()
 * })
 *
 * // Test handler execution
 * const result = await testHarness.callHandler('getUser', { id: '123' })
 * expect(result.isOk()).toBe(true)
 *
 * // Assert on mock calls
 * expect(testHarness.mockDependencies.database.findUser).toHaveBeenCalledWith('123')
 * ```
 */

import { expect, describe, it, test, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { ok, err, type Result } from 'neverthrow'
import type { ServiceDefinition, HandlerDefinition } from './service'
import type { MergedContext, HandlerOptions } from './types'
import type { EnhancedServiceMetadata } from './introspection'

/**
 * Service test harness for comprehensive testing
 */
export interface ServiceTestHarness<
  TService extends ServiceDefinition<string, TDeps>,
  TDeps extends Record<string, unknown>
> {
  /** The service definition */
  service: TService
  /** Mock dependencies */
  mockDependencies: TDeps
  /** Service instance with injected dependencies */
  instance: ReturnType<TService['make']>
  /** Call a handler on the service instance */
  callHandler: <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions,
    context?: Record<string, unknown>
  ) => Promise<Result<TOutput, TError>>
  /** Reset all mocks */
  resetMocks: () => void
  /** Assert that a mock was called */
  assertMockCalled: (mockPath: string, times?: number) => void
}

/**
 * Create a test harness for a service
 */
export function createServiceTestHarness<
  TService extends ServiceDefinition<string, TDeps>,
  TDeps extends Record<string, unknown>
>(
  service: TService,
  dependencies: TDeps
): ServiceTestHarness<TService, TDeps> {
  const instance = service.make(dependencies)

  const callHandler = async <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions,
    context?: Record<string, unknown>
  ): Promise<Result<TOutput, TError>> => {
    const handlerMethod = (instance as any)[handlerName]
    
    if (!handlerMethod) {
      throw new Error(`Handler '${handlerName}' not found in service '${service.name}'`)
    }

    const defaultContext = {
      requestId: `test-${Date.now()}`,
      traceId: `test-trace-${Math.random()}`,
      ...context
    }

    return await handlerMethod(input, options, defaultContext)
  }

  const resetMocks = () => {
    Object.values(dependencies).forEach(dep => {
      if (dep && typeof dep === 'object') {
        Object.values(dep).forEach(method => {
          if (typeof method === 'function' && 'mockReset' in method) {
            (method as any).mockReset()
          }
        })
      }
    })
  }

  const assertMockCalled = (mockPath: string, times?: number) => {
    const pathParts = mockPath.split('.')
    let current: any = dependencies
    
    for (const part of pathParts) {
      current = current[part]
      if (!current) {
        throw new Error(`Mock path '${mockPath}' not found`)
      }
    }
    
    if (typeof current === 'function' && 'toHaveBeenCalledTimes' in current) {
      if (times !== undefined) {
        expect(current).toHaveBeenCalledTimes(times)
      } else {
        expect(current).toHaveBeenCalled()
      }
    } else {
      throw new Error(`'${mockPath}' is not a mock function`)
    }
  }

  return {
    service,
    mockDependencies: dependencies,
    instance,
    callHandler,
    resetMocks,
    assertMockCalled
  }
}

/**
 * Mock factory utilities
 */
export const MockFactories = {
  /**
   * Create a mock database with common methods
   */
  database: () => ({
    findUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn()
  }),

  /**
   * Create a mock logger
   */
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => MockFactories.logger())
  }),

  /**
   * Create a mock HTTP client
   */
  httpClient: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn()
  }),

  /**
   * Create a mock cache
   */
  cache: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn()
  }),

  /**
   * Create a mock event emitter
   */
  eventEmitter: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn()
  })
}

/**
 * Test data builders for common patterns
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {}

  constructor(private defaults: T) {}

  /**
   * Set a specific field
   */
  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value
    return this
  }

  /**
   * Set multiple fields
   */
  withFields(fields: Partial<T>): this {
    Object.assign(this.data, fields)
    return this
  }

  /**
   * Build the final object
   */
  build(): T {
    return { ...this.defaults, ...this.data }
  }

  /**
   * Build multiple objects with different variations
   */
  buildMany(count: number, variations?: Array<Partial<T>>): T[] {
    const results: T[] = []
    
    for (let i = 0; i < count; i++) {
      const variation = variations?.[i] || {}
      results.push({ ...this.defaults, ...this.data, ...variation })
    }
    
    return results
  }
}

/**
 * Create a test data builder
 */
export function createTestDataBuilder<T>(defaults: T): TestDataBuilder<T> {
  return new TestDataBuilder(defaults)
}

/**
 * Result testing utilities for neverthrow Results
 */
export const ResultTestUtils = {
  /**
   * Assert that a result is Ok and return the value
   */
  expectOk: <T, E>(result: Result<T, E>): T => {
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      return result.value
    }
    throw new Error('Expected Ok result but got Err')
  },

  /**
   * Assert that a result is Err and return the error
   */
  expectErr: <T, E>(result: Result<T, E>): E => {
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      return result.error
    }
    throw new Error('Expected Err result but got Ok')
  },

  /**
   * Assert that a result is Ok with specific value
   */
  expectOkValue: <T, E>(result: Result<T, E>, expectedValue: T): void => {
    const value = ResultTestUtils.expectOk(result)
    expect(value).toEqual(expectedValue)
  },

  /**
   * Assert that a result is Err with specific error
   */
  expectErrValue: <T, E>(result: Result<T, E>, expectedError: E): void => {
    const error = ResultTestUtils.expectErr(result)
    expect(error).toEqual(expectedError)
  }
}

/**
 * Performance testing utilities
 */
export const PerformanceTestUtils = {
  /**
   * Measure handler execution time
   */
  async measureHandlerTime<TInput, TOutput, TError>(
    harness: ServiceTestHarness<any, any>,
    handlerName: string,
    input: TInput,
    iterations: number = 1
  ): Promise<{ avgTime: number; minTime: number; maxTime: number }> {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await harness.callHandler(handlerName, input)
      const end = performance.now()
      times.push(end - start)
    }
    
    return {
      avgTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    }
  },

  /**
   * Assert handler execution time is within limits
   */
  async expectHandlerPerformance<TInput>(
    harness: ServiceTestHarness<any, any>,
    handlerName: string,
    input: TInput,
    maxTimeMs: number
  ): Promise<void> {
    const { avgTime } = await this.measureHandlerTime(harness, handlerName, input, 5)
    expect(avgTime).toBeLessThan(maxTimeMs)
  }
}

/**
 * Common test patterns and fixtures
 */
export const TestFixtures = {
  /**
   * Standard user object for testing
   */
  user: createTestDataBuilder({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01'),
    isActive: true
  }),

  /**
   * Standard error responses
   */
  errors: {
    notFound: (resource: string) => new Error(`${resource} not found`),
    validation: (field: string) => new Error(`Validation failed for ${field}`),
    unauthorized: () => new Error('Unauthorized access'),
    serverError: () => new Error('Internal server error')
  },

  /**
   * Common mock responses
   */
  responses: {
    success: <T>(data: T) => ok(data),
    error: <E>(error: E) => err(error),
    async: <T>(data: T, delay: number = 0) => 
      new Promise<Result<T, never>>(resolve => 
        setTimeout(() => resolve(ok(data)), delay)
      )
  }
}

// Re-export vitest utilities for convenience
export { expect, describe, it, test, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
