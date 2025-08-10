/**
 * @fileoverview Testing Utilities for Framewerk Services
 *
 * This module provides comprehensive testing utilities for services built with framewerk,
 * including mock helpers, assertion utilities, and test patterns.
 */

import { vi } from 'vitest'
import { ok, err, type Result } from 'neverthrow'
import type { ServiceDefinition } from './service.ts'
import type { HandlerOptions, HandlerContext } from './types.ts'

/**
 * Service test harness for comprehensive testing
 */
export interface ServiceTestHarness<
  TService extends ServiceDefinition<string, TDeps>,
  TDeps extends Record<string, unknown>
> {
  /** Service instance with injected dependencies */
  service: ReturnType<TService['make']>
  /** Mock dependencies */
  mockDependencies: TDeps
  /** Call a handler on the service instance */
  callHandler: <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions,
    context?: HandlerContext
  ) => Promise<Result<TOutput, TError>>
  /** Assert that a mock was called */
  assertMockCalled: (mockPath: string, times?: number) => void
  /** Assert that a mock was called with specific arguments */
  assertMockCalledWith: (mockPath: string, ...args: unknown[]) => void
  /** Reset all mocks */
  resetMocks: () => void
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
  
  const serviceInstance = service.make(dependencies)

  return {
    service: serviceInstance,
    mockDependencies: dependencies,
    
    callHandler: async <TInput, TOutput, TError>(
      handlerName: string, 
      input: TInput,
      options?: HandlerOptions,
      context?: HandlerContext
    ): Promise<Result<TOutput, TError>> => {
      const handler = (serviceInstance as Record<string, unknown>)[handlerName]
      if (!handler || typeof handler !== 'function') {
        throw new Error(`Handler '${handlerName}' not found in service`)
      }
      
      const defaultContext = {
        requestId: `test-${Date.now()}`,
        traceId: `test-trace-${Math.random()}`,
        ...context
      }
      
      return handler(input, options, defaultContext) as Promise<Result<TOutput, TError>>
    },

    assertMockCalled: (mockPath: string, times?: number) => {
      const mockFn = getMockByPath(dependencies, mockPath)
      if (times !== undefined) {
        expect(mockFn).toHaveBeenCalledTimes(times)
      } else {
        expect(mockFn).toHaveBeenCalled()
      }
    },

    assertMockCalledWith: (mockPath: string, ...args: unknown[]) => {
      const mockFn = getMockByPath(dependencies, mockPath)
      expect(mockFn).toHaveBeenCalledWith(...args)
    },

    resetMocks: () => {
      resetAllMocks(dependencies)
    }
  }
}

/**
 * Helper function to get a mock by path (e.g., "database.findUser")
 */
function getMockByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => 
    current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, 
    obj
  )
}

/**
 * Helper function to reset all mocks in an object
 */
function resetAllMocks(obj: Record<string, unknown>): void {
  if (!obj || typeof obj !== 'object') return
  
  Object.values(obj).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as { mockReset: () => void }).mockReset()
    } else if (typeof value === 'object' && value !== null) {
      resetAllMocks(value as Record<string, unknown>)
    }
  })
}

/**
 * Mock factory utilities
 */
export const MockFactories = {
  /**
   * Create a mock database with common methods
   */
  database: () => ({
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listUsers: vi.fn(),
    findByEmail: vi.fn(),
    exists: vi.fn(),
    count: vi.fn(),
    transaction: vi.fn()
  }),

  /**
   * Create a mock logger
   */
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn()
    })
  }),

  /**
   * Create a mock HTTP client
   */
  httpClient: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn()
  }),

  /**
   * Create a mock cache
   */
  cache: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn()
  }),

  /**
   * Create a mock event emitter
   */
  eventEmitter: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    listenerCount: vi.fn()
  })
}

/**
 * Test data builder for creating test fixtures
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {}

  constructor(private readonly defaults: T) {}

  /**
   * Set a specific field value
   */
  with<K extends keyof T>(field: K, value: T[K]): TestDataBuilder<T> {
    const newBuilder = new TestDataBuilder(this.defaults)
    newBuilder.data = { ...this.data, [field]: value }
    return newBuilder
  }

  /**
   * Set multiple field values
   */
  withMany(values: Partial<T>): TestDataBuilder<T> {
    const newBuilder = new TestDataBuilder(this.defaults)
    newBuilder.data = { ...this.data, ...values }
    return newBuilder
  }

  /**
   * Build the final object
   */
  build(): T {
    return { ...this.defaults, ...this.data }
  }

  /**
   * Build multiple objects with variations
   */
  buildMany(count: number, variations: Partial<T>[] = []): T[] {
    const results: T[] = []
    for (let i = 0; i < count; i++) {
      const variation = variations[i] || {}
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
 * Result testing utilities for neverthrow
 */
export const ResultTestUtils = {
  /**
   * Assert that a result is Ok and return the value
   */
  expectOk: <T, E>(result: Result<T, E>): T => {
    if (result.isErr()) {
      throw new Error(`Expected Ok but got Err: ${result.error}`)
    }
    return result.value
  },

  /**
   * Assert that a result is Err and return the error
   */
  expectErr: <T, E>(result: Result<T, E>): E => {
    if (result.isOk()) {
      throw new Error(`Expected Err but got Ok: ${result.value}`)
    }
    return result.error
  },

  /**
   * Assert that a result is Ok with a specific value
   */
  expectOkValue: <T, E>(result: Result<T, E>, expectedValue: T): void => {
    const value = ResultTestUtils.expectOk(result)
    expect(value).toEqual(expectedValue)
  },

  /**
   * Assert that a result is Err with a specific error
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
  async measureHandlerTime<TInput>(
    harness: ServiceTestHarness<ServiceDefinition<string, Record<string, unknown>>, Record<string, unknown>>,
    handlerName: string,
    input: TInput,
    iterations: number = 1
  ): Promise<{ avgTime: number; maxTime: number; minTime: number }> {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await harness.callHandler(handlerName, input)
      const end = performance.now()
      times.push(end - start)
    }
    
    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times)
    }
  },

  /**
   * Assert handler performance is within expected range
   */
  async expectHandlerPerformance<TInput>(
    harness: ServiceTestHarness<ServiceDefinition<string, Record<string, unknown>>, Record<string, unknown>>,
    handlerName: string,
    input: TInput,
    maxTimeMs: number
  ): Promise<void> {
    const { avgTime } = await this.measureHandlerTime(harness, handlerName, input, 5)
    expect(avgTime).toBeLessThan(maxTimeMs)
  }
}

/**
 * Test fixtures for common patterns
 */
export const TestFixtures = {
  /**
   * Standard user object for testing
   */
  user: createTestDataBuilder({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }),

  /**
   * Standard order object for testing
   */
  order: createTestDataBuilder({
    id: 'order-123',
    userId: 'user-123',
    total: 100.00,
    status: 'pending' as const,
    items: [],
    createdAt: new Date('2024-01-01T00:00:00Z')
  }),

  /**
   * Standard error fixtures
   */
  errors: {
    notFound: (entityType: string) => new Error(`${entityType} not found`),
    validation: (field: string) => new Error(`Validation failed for ${field}`),
    unauthorized: () => new Error('Unauthorized access'),
    serverError: (message?: string) => new Error(message || 'Internal server error')
  },

  /**
   * Standard response fixtures
   */
  responses: {
    success: <T>(data: T) => ok(data),
    error: (error: Error) => err(error),
    paginated: <T>(items: T[], page: number = 1, pageSize: number = 10) => ok({
      data: items,
      pagination: {
        page,
        pageSize,
        total: items.length,
        totalPages: Math.ceil(items.length / pageSize)
      }
    })
  }
}

// Need to import expect from vitest for the functions above
import { expect } from 'vitest'

// Re-export vitest utilities for convenience  
export { expect, describe, it, test, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
