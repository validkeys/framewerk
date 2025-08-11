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
 *   database: createMockDatabase(),
 *   logger: createMockLogger()
 * })
 *
 * // Test handler execution
 * const result = await testHarness.callHandler('getUser', { id: '123' })
 * expect(result.isOk()).toBe(true)
 *
 * // Assert on mock calls
 * expect(testHarness.deps.database.findUser).toHaveBeenCalledWith('123')
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
  deps: TDeps
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
    // Type assertion to access handler - this is safe as we know the structure
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

    if (typeof current !== 'function' || !('mock' in current)) {
      throw new Error(`Path '${mockPath}' is not a mock function`)
    }

    if (times !== undefined) {
      expect(current).toHaveBeenCalledTimes(times)
    } else {
      expect(current).toHaveBeenCalled()
    }
  }

  return {
    service,
    deps: dependencies,
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
 * Service metadata testing utilities
 */
export const ServiceTestUtils = {
  /**
   * Assert that a service has specific handlers
   */
  assertHasHandlers(service: ServiceDefinition<string, Record<string, unknown>>, expectedHandlers: string[]): void {
    const metadata = service.getMetadata()
    const handlerNames = Object.keys(metadata.handlers)
    
    expectedHandlers.forEach(handler => {
      expect(handlerNames).toContain(handler)
    })
  },

  /**
   * Assert that a service has specific metadata
   */
  assertMetadata(
    metadata: EnhancedServiceMetadata,
    expected: Partial<EnhancedServiceMetadata>
  ): void {
    if (expected.name) expect(metadata.name).toBe(expected.name)
    if (expected.version) expect(metadata.version).toBe(expected.version)
    if (expected.tags) expect(metadata.tags).toEqual(expect.arrayContaining(expected.tags))
    if (expected.dependencyTypes) {
      expect(metadata.dependencyTypes).toEqual(expect.arrayContaining(expected.dependencyTypes))
    }
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

/**
 * Result assertion helpers for neverthrow
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

// Re-export vitest utilities for convenience
export { expect, describe, it, test, beforeEach, afterEach, beforeAll, afterAll, vi }

import { expect, describe, it, test, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { ok, err, type Result } from 'neverthrow'
import type { ServiceDefinition, HandlerDefinition } from './service'
import type { MergedContext, HandlerOptions } from './types'
import type { EnhancedServiceMetadata } from './introspection'

/**
 * Mock dependency builder for creating test dependencies
 */
export class MockDependencyBuilder<T extends Record<string, unknown>> {
  private mocks: Partial<T> = {}

  /**
   * Add a mock for a specific dependency
   */
  mock<K extends keyof T>(key: K, mock: T[K]): this {
    this.mocks[key] = mock
    return this
  }

  /**
   * Add a spy mock that tracks calls
   */
  spy<K extends keyof T>(key: K, implementation?: T[K]): this & { getMock: (key: K) => T[K] } {
    const spy = vi.fn(implementation as unknown)
    this.mocks[key] = spy as T[K]
    
    return Object.assign(this, {
      getMock: (k: K) => this.mocks[k] as T[K]
    })
  }

  /**
   * Build the complete mock dependencies object
   */
  build(): T {
    return this.mocks as T
  }
}

/**
 * Service test harness for comprehensive testing
 */
export interface ServiceTestHarness<
  TService extends ServiceDefinition<string, TDeps>,
  TDeps extends Record<string, unknown>
> {
  /** The service instance */
  service: TService
  /** Mock dependencies */
  deps: TDeps
  /** Mock builder for additional setup */
  mockBuilder: MockDependencyBuilder<TDeps>
  /** Execute a handler with mocked context */
  executeHandler: <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions
  ) => Promise<Result<TOutput, TError>>
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
  const mockBuilder = new MockDependencyBuilder<TDeps>()
  
  // Set up initial mocks
  Object.entries(dependencies).forEach(([key, value]) => {
    mockBuilder.mock(key as keyof TDeps, value)
  })

  const executeHandler = async <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions
  ): Promise<Result<TOutput, TError>> => {
    const handlers = service.getHandlers()
    const handler = handlers[handlerName]
    
    if (!handler) {
      throw new Error(`Handler '${handlerName}' not found in service '${service.name}'`)
    }

    // Create merged context for testing
    const context: MergedContext<TDeps> = {
      ...dependencies,
      // Add default handler context
      traceId: `test-${Date.now()}`,
      startTime: Date.now(),
      correlationId: `test-corr-${Math.random()}`
    } as MergedContext<TDeps>

    return await handler(input, options, context)
  }

  const resetMocks = () => {
    Object.values(dependencies).forEach(dep => {
      if (typeof dep === 'function' && 'mockReset' in dep) {
        (dep as any).mockReset()
      }
    })
  }

  return {
    service,
    deps: dependencies,
    mockBuilder,
    executeHandler,
    resetMocks
  }
}

/**
 * Handler test result assertion builder
 */
export class HandlerTestAssertion<TOutput, TError> {
  constructor(
    private readonly resultPromise: Promise<Result<TOutput, TError>>
  ) {}

  /**
   * Assert that the handler succeeded with specific output
   */
  async toReturn(expectedOutput: TOutput): Promise<void> {
    const result = await this.resultPromise
    expect(result.isOk()).toBe(true)
    
    if (result.isOk()) {
      expect(result.value).toEqual(expectedOutput)
    }
  }

  /**
   * Assert that the handler succeeded and returned truthy value
   */
  async toSucceed(): Promise<TOutput> {
    const result = await this.resultPromise
    expect(result.isOk()).toBe(true)
    
    if (result.isOk()) {
      return result.value
    }
    throw new Error('Handler did not succeed')
  }

  /**
   * Assert that the handler failed with specific error
   */
  async toThrow(expectedError: TError | string): Promise<void> {
    const result = await this.resultPromise
    expect(result.isErr()).toBe(true)
    
    if (result.isErr()) {
      if (typeof expectedError === 'string') {
        expect(result.error).toMatch(expectedError)
      } else {
        expect(result.error).toEqual(expectedError)
      }
    }
  }

  /**
   * Assert that the handler failed
   */
  async toFail(): Promise<TError> {
    const result = await this.resultPromise
    expect(result.isErr()).toBe(true)
    
    if (result.isErr()) {
      return result.error
    }
    throw new Error('Handler did not fail')
  }

  /**
   * Assert custom conditions on the result
   */
  async toSatisfy(predicate: (result: Result<TOutput, TError>) => boolean): Promise<void> {
    const result = await this.resultPromise
    expect(predicate(result)).toBe(true)
  }
}

/**
 * Expect a handler to succeed
 */
export function expectHandlerSuccess<TInput, TOutput, TError>(
  harness: ServiceTestHarness<any, any>,
  handlerName: string,
  input: TInput,
  options?: HandlerOptions
): HandlerTestAssertion<TOutput, TError> {
  const resultPromise = harness.executeHandler<TInput, TOutput, TError>(handlerName, input, options)
  return new HandlerTestAssertion(resultPromise)
}

/**
 * Expect a handler to fail
 */
export function expectHandlerError<TInput, TOutput, TError>(
  harness: ServiceTestHarness<any, any>,
  handlerName: string,
  input: TInput,
  options?: HandlerOptions
): HandlerTestAssertion<TOutput, TError> {
  const resultPromise = harness.executeHandler<TInput, TOutput, TError>(handlerName, input, options)
  return new HandlerTestAssertion(resultPromise)
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
 * Service metadata testing utilities
 */
export const ServiceTestUtils = {
  /**
   * Assert that a service has specific handlers
   */
  assertHasHandlers(service: ServiceDefinition<string, any>, expectedHandlers: string[]): void {
    const handlers = service.getHandlers()
    const handlerNames = Object.keys(handlers)
    
    expectedHandlers.forEach(handler => {
      expect(handlerNames).toContain(handler)
    })
  },

  /**
   * Assert that a service has specific metadata
   */
  assertMetadata(
    metadata: EnhancedServiceMetadata,
    expected: Partial<EnhancedServiceMetadata>
  ): void {
    if (expected.name) expect(metadata.name).toBe(expected.name)
    if (expected.version) expect(metadata.version).toBe(expected.version)
    if (expected.tags) expect(metadata.tags).toEqual(expect.arrayContaining(expected.tags))
    if (expected.dependencyTypes) {
      expect(metadata.dependencyTypes).toEqual(expect.arrayContaining(expected.dependencyTypes))
    }
  },

  /**
   * Create a test service factory
   */
  createTestService: <TDeps extends Record<string, unknown>>(
    name: string,
    dependencies: TDeps,
    handlers: Record<string, HandlerDefinition<any, any, any, TDeps>>
  ) => {
    // This would create a minimal service for testing
    // Implementation would depend on the actual service builder
    return {
      name,
      dependencies,
      handlers,
      getMetadata: () => ({ name, handlers: {}, dependencyTypes: [] }),
      getHandlers: () => handlers
    }
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
      await harness.executeHandler(handlerName, input)
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
 * Integration testing utilities
 */
export const IntegrationTestUtils = {
  /**
   * Create a test context with real dependencies
   */
  createIntegrationContext: <T extends Record<string, unknown>>(
    config: T
  ): T => {
    // This would set up real dependencies for integration testing
    return config
  },

  /**
   * Clean up integration test resources
   */
  cleanup: async (resources: Array<{ close?: () => Promise<void> }>): Promise<void> => {
    await Promise.all(
      resources.map(resource => resource.close?.())
    )
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
