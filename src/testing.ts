/**
 * @fileoverview Testing Utilities for Framewerk Services
 *
 * This module provides test-runner agnostic testing utilities specifically designed
 * for services built with framewerk. It includes service test harnesses and
 * utilities for testing with neverthrow Result types.
 */

import { type Result } from 'neverthrow'
import type { ServiceDefinition } from './service.ts'
import type { HandlerOptions, HandlerContext } from './types.ts'

/**
 * Service test harness for comprehensive testing
 * 
 * This provides a structured way to test Framewerk services with dependency injection
 * and mock verification capabilities.
 */
export interface ServiceTestHarness<
  TService extends ServiceDefinition<string, TDeps>,
  TDeps extends Record<string, unknown>
> {
  /** Service instance with injected dependencies */
  service: ReturnType<TService['make']>
  /** Mock dependencies for verification */
  mockDependencies: TDeps
  /** Call a handler on the service instance */
  callHandler: <TInput, TOutput, TError>(
    handlerName: string,
    input: TInput,
    options?: HandlerOptions,
    context?: HandlerContext
  ) => Promise<Result<TOutput, TError>>
}

/**
 * Create a test harness for a Framewerk service
 * 
 * @param service The service definition to test
 * @param dependencies Mock dependencies to inject
 * @returns Test harness with service instance and utilities
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
    service: serviceInstance as ReturnType<TService['make']>,
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
    }
  }
}

/**
 * Result testing utilities for neverthrow
 * 
 * These utilities provide type-safe assertion helpers for testing Result types
 * without depending on any specific test framework.
 */
export const ResultTestUtils = {
  /**
   * Assert that a result is Ok and return the value
   * @param result The result to check
   * @returns The Ok value
   * @throws Error if result is Err
   */
  expectOk: <T, E>(result: Result<T, E>): T => {
    if (result.isErr()) {
      throw new Error(`Expected Ok but got Err: ${JSON.stringify(result.error)}`)
    }
    return result.value
  },

  /**
   * Assert that a result is Err and return the error
   * @param result The result to check
   * @returns The Err value
   * @throws Error if result is Ok
   */
  expectErr: <T, E>(result: Result<T, E>): E => {
    if (result.isOk()) {
      throw new Error(`Expected Err but got Ok: ${JSON.stringify(result.value)}`)
    }
    return result.error
  },

  /**
   * Check if a result is Ok with a specific value
   * @param result The result to check
   * @param expectedValue The expected value
   * @returns true if result is Ok and value matches
   */
  isOkValue: <T, E>(result: Result<T, E>, expectedValue: T): boolean => {
    return result.isOk() && JSON.stringify(result.value) === JSON.stringify(expectedValue)
  },

  /**
   * Check if a result is Err with a specific error
   * @param result The result to check
   * @param expectedError The expected error
   * @returns true if result is Err and error matches
   */
  isErrValue: <T, E>(result: Result<T, E>, expectedError: E): boolean => {
    return result.isErr() && JSON.stringify(result.error) === JSON.stringify(expectedError)
  }
}

/**
 * Performance testing utilities for measuring handler execution
 */
export const PerformanceTestUtils = {
  /**
   * Measure handler execution time over multiple iterations
   * 
   * @param harness The service test harness
   * @param handlerName Name of the handler to measure
   * @param input Input to pass to the handler
   * @param iterations Number of iterations to run (default: 1)
   * @returns Performance metrics
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
   * Check if handler performance is within expected range
   * 
   * @param harness The service test harness
   * @param handlerName Name of the handler to test
   * @param input Input to pass to the handler
   * @param maxTimeMs Maximum allowed time in milliseconds
   * @returns true if performance is within range
   */
  async isWithinPerformanceRange<TInput>(
    harness: ServiceTestHarness<ServiceDefinition<string, Record<string, unknown>>, Record<string, unknown>>,
    handlerName: string,
    input: TInput,
    maxTimeMs: number
  ): Promise<boolean> {
    const { avgTime } = await this.measureHandlerTime(harness, handlerName, input, 5)
    return avgTime < maxTimeMs
  }
}
