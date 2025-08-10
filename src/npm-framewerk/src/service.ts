/**
 * @fileoverview Service Builder Pattern for Type-Safe Service Definitions
 *
 * This module provides a fluent builder pattern for defining services with dependency injection,
 * handler registration, and type-safe factory pattern.
 *
 * @example
 * ```typescript
 * // Define service dependencies
 * interface AccountDeps {
 *   database: Database;
 *   logger: Logger;
 * }
 *
 * // Create handlers
 * const listAccountsHandler = defineHandler("listAccounts")
 *   .withInput<ListAccountsInput>()
 *   .withOutput<ListAccountsOutput>()
 *   .handler(async (input, options, ctx) => {
 *     // ctx.database (from ServiceDeps)
 *     // ctx.requestId (from HandlerContext)
 *     return ok(await ctx.database.listAccounts(input.filters))
 *   })
 *
 * // Define service
 * export const accountService = defineService("AccountService")
 *   .withServiceDependencies<AccountDeps>()
 *   .addHandler("listAccounts", listAccountsHandler)
 *   .addHandler("createAccount", createAccountHandler)
 *   .build()
 *
 * // Use service
 * const service = accountService.make({ database, logger })
 * const result = await service.listAccounts(input, options)
 * ```
 */

import type { HandlerContext, HandlerOptions, MergedContext } from "./types.ts"

/**
 * Marker symbol for service definitions
 */
export const ServiceMarker = Symbol("ServiceMarker")

/**
 * Service metadata for introspection and codegen
 */
export interface ServiceMetadata {
  name: string
  handlers: Record<string, unknown>
  dependencyTypes?: string[]
  version?: string
  tags?: string[]
}

/**
 * A handler definition that can be registered in a service
 */
export interface HandlerDefinition<TInput = unknown, TOutput = unknown, TError = unknown, TServiceDeps = object> {
  (input: TInput, options: HandlerOptions | undefined, ctx: MergedContext<TServiceDeps>): Promise<import("neverthrow").Result<TOutput, TError>>
  /** Handler metadata for introspection */
  metadata?: {
    name: string
    inputSchema?: unknown
    outputSchema?: unknown
    errorSchemas?: unknown[]
  }
}

/**
 * Consumer-facing handler signature after service factory curries dependencies
 */
export type ServiceHandler = (
  input: unknown,
  options?: HandlerOptions,
  ctx?: HandlerContext
) => Promise<import("neverthrow").Result<unknown, unknown>>

/**
 * Service handlers registry
 */
export type ServiceHandlers = Record<string, ServiceHandler>

/**
 * Progressive type states for the service builder
 */

// Base state - service name defined
export interface ServiceBuilderBase<TName extends string> {
  withServiceDependencies<TDeps extends object>(): ServiceBuilderWithDeps<TName, TDeps>
}

// Has service dependencies defined
export interface ServiceBuilderWithDeps<TName extends string, TDeps extends object> {
  addHandler<THandlerName extends string, TInput, TOutput, TError>(
    name: THandlerName,
    handler: HandlerDefinition<TInput, TOutput, TError, TDeps>
  ): ServiceBuilderWithHandlers<TName, TDeps>
}

// Has handlers registered  
export interface ServiceBuilderWithHandlers<TName extends string, TDeps extends object> {
  addHandler<THandlerName extends string, TInput, TOutput, TError>(
    name: THandlerName, 
    handler: HandlerDefinition<TInput, TOutput, TError, TDeps>
  ): ServiceBuilderWithHandlers<TName, TDeps>
  
  build(): ServiceDefinition<TName, TDeps>
}

/**
 * Final service definition with factory method
 */
export interface ServiceDefinition<TName extends string, TDeps extends object> {
  [ServiceMarker]: true
  name: TName
  make(dependencies: TDeps): ServiceHandlers
  getMetadata(): ServiceMetadata
}

/**
 * Main service builder class
 */
export class ServiceBuilder<TName extends string> implements ServiceBuilderBase<TName> {
  constructor(private readonly serviceName: TName) {}

  withServiceDependencies<TDeps extends object>(): ServiceBuilderWithDeps<TName, TDeps> {
    return new ServiceBuilderWithDependencies(this.serviceName)
  }
}

/**
 * Service builder with dependencies defined
 */
export class ServiceBuilderWithDependencies<TName extends string, TDeps extends object> 
  implements ServiceBuilderWithDeps<TName, TDeps> {
  
  constructor(private readonly serviceName: TName) {}

  addHandler<THandlerName extends string, TInput, TOutput, TError>(
    name: THandlerName,
    handler: HandlerDefinition<TInput, TOutput, TError, TDeps>
  ): ServiceBuilderWithHandlers<TName, TDeps> {
    const handlers = {
      [name]: handler as HandlerDefinition<unknown, unknown, unknown, TDeps>
    }
    
    return new ServiceBuilderWithHandlerRegistry(this.serviceName, handlers)
  }
}

/**
 * Service builder with handlers registered
 */
export class ServiceBuilderWithHandlerRegistry<TName extends string, TDeps extends object>
  implements ServiceBuilderWithHandlers<TName, TDeps> {
  
  constructor(
    private readonly serviceName: TName,
    private readonly handlers: Record<string, HandlerDefinition<unknown, unknown, unknown, TDeps>>
  ) {}

  addHandler<THandlerName extends string, TInput, TOutput, TError>(
    name: THandlerName,
    handler: HandlerDefinition<TInput, TOutput, TError, TDeps>
  ): ServiceBuilderWithHandlers<TName, TDeps> {
    const newHandlers = {
      ...this.handlers,
      [name]: handler as HandlerDefinition<unknown, unknown, unknown, TDeps>
    }
    
    return new ServiceBuilderWithHandlerRegistry(this.serviceName, newHandlers)
  }

  build(): ServiceDefinition<TName, TDeps> {
    return new ServiceImplementation(this.serviceName, this.handlers)
  }
}

/**
 * Final service implementation
 */
export class ServiceImplementation<TName extends string, TDeps extends object>
  implements ServiceDefinition<TName, TDeps> {
  
  readonly [ServiceMarker] = true as const
  
  constructor(
    public readonly name: TName,
    private readonly handlerDefinitions: Record<string, HandlerDefinition<unknown, unknown, unknown, TDeps>>
  ) {}

  make(dependencies: TDeps): ServiceHandlers {
    const serviceHandlers: ServiceHandlers = {}
    
    for (const [handlerName, handlerDef] of Object.entries(this.handlerDefinitions)) {
      // Create a curried handler that merges dependencies into context
      serviceHandlers[handlerName] = (input: unknown, options?: HandlerOptions, ctx?: HandlerContext) => {
        // Merge the service dependencies into the context
        const mergedContext: MergedContext<TDeps> = { ...ctx, ...dependencies } as MergedContext<TDeps>
        
        // Call the original handler with the merged context
        return handlerDef(input, options, mergedContext)
      }
    }
    
    return serviceHandlers
  }

  getMetadata(): ServiceMetadata {
    return {
      name: this.name,
      handlers: this.handlerDefinitions,
      dependencyTypes: [], // TODO: Extract from type system
      version: "1.0.0", // TODO: Make configurable
      tags: [] // TODO: Extract from handler metadata
    }
  }
}

/**
 * Entry point for creating a new service
 */
export function defineService<TName extends string>(name: TName): ServiceBuilderBase<TName> {
  return new ServiceBuilder(name)
}
