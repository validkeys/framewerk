/**
 * @framewerk/core - Main Package Exports
 * 
 * A complete service/action architecture toolkit with type-safe builders and codegen support
 */

// Individual exports (for direct imports and backward compatibility)
export * from "./handler.ts"
export * from "./service.ts" 
export * from "./types.ts"
export * from "./errors.ts"
export * from "./contracts.ts"
export * from "./introspection.ts"
export * from "./testing.ts"

// Re-export common utilities for convenience
export { ok, err, Result } from 'neverthrow'
export { z } from 'zod'

// Import all the pieces for the namespace
import { defineHandler } from "./handler.ts"
import { defineService } from "./service.ts"
import { 
  FramewerkError as BaseFramewerkError, 
  TaggedError as TaggedErrorFactory,
  AbstractError,
  createHandlerError,
  mapHandlerError
} from "./errors.ts"
import { ServiceRegistry, ServiceInspector } from "./introspection.ts"
import { createServiceContracts } from "./contracts.ts"
import { createServiceTestHarness, ResultTestUtils, PerformanceTestUtils } from "./testing.ts"

/**
 * Main Framewerk namespace - provides organized access to all framework APIs
 * 
 * @example
 * ```typescript
 * import { Framewerk } from "@framewerk/core"
 * 
 * // Define services
 * const service = Framewerk.defineService("UserService")
 *   .withDependencies<UserDeps>()
 *   .addHandler("getUser", handler)
 *   .build()
 * 
 * // Define handlers
 * const handler = Framewerk.defineHandler("getUser", "Get user by ID")
 *   .input(schema)
 *   .resolver(async () => {})
 *   .build()
 * 
 * // Create errors
 * class MyError extends Framewerk.Error.tagged("MyError") {}
 * const QuickError = Framewerk.TaggedError("QuickError")
 * ```
 */
export const Framewerk = {
  // Core builders
  defineService,
  defineHandler,
  
  // Error system with organized namespace
  Error: {
    /**
     * Create a tagged error class with automatic type inference
     * @example
     * ```typescript
     * class UserNotFoundError extends Framewerk.Error.tagged("UserNotFoundError") {
     *   static readonly httpStatus = 404
     *   constructor(userId: string) {
     *     super(`User ${userId} not found`)
     *   }
     * }
     * ```
     */
    tagged: BaseFramewerkError.tagged.bind(BaseFramewerkError),
    
    /**
     * Base FramewerkError class for manual extension
     */
    Base: BaseFramewerkError,
    
    /**
     * Legacy AbstractError class (deprecated)
     * @deprecated Use Framewerk.Error.tagged() instead
     */
    Abstract: AbstractError,
    
    /**
     * Utility to create handler error responses
     */
    createHandlerError,
    
    /**
     * Map common errors to HTTP responses
     */
    mapHandlerError,
  },
  
  /**
   * Factory function for quick tagged error creation
   * @example
   * ```typescript
   * const NetworkError = Framewerk.TaggedError("NetworkError")
   * const error = new NetworkError("Connection failed")
   * ```
   */
  TaggedError: TaggedErrorFactory,
  
  // Introspection and metadata
  Registry: ServiceRegistry,
  Inspector: ServiceInspector,
  
  // Registry instance for global service registration
  registry: new ServiceRegistry(),
  
  // Contract system
  createContracts: createServiceContracts,
  
  // Testing utilities
  Testing: {
    createHarness: createServiceTestHarness,
    ResultTestUtils,
    PerformanceTestUtils,
  },
} as const