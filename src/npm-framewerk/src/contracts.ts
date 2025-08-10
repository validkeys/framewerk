/**
 * @fileoverview Contract Type System for Service/Handler Type Extraction
 *
 * This module provides utilities for extracting type-only contracts from services
 * and handlers, enabling cross-package imports in monorepo architectures.
 *
 * @example
 * ```typescript
 * // In service package - export contracts
 * export type AccountServiceContract = ExtractServiceContract<typeof accountService>
 * export type { ListAccountsContract, CreateAccountContract } from './handlers'
 *
 * // In consuming package - import types only
 * import type { AccountServiceContract } from '@my-org/account-service'
 * 
 * function useAccountService(service: AccountServiceContract) {
 *   // Full type safety without implementation dependency
 * }
 * ```
 */

import type { ServiceDefinition, ServiceHandlers } from "./service.ts"
import type { HandlerOptions, HandlerContext } from "./types.ts"
import type { Result } from "neverthrow"

/**
 * Extract the contract type from a handler definition
 */
export type HandlerContract<TInput = unknown, TOutput = unknown, TError = unknown> = (
  input: TInput,
  options?: HandlerOptions,
  ctx?: HandlerContext
) => Promise<Result<TOutput, TError>>

/**
 * Extract service contract from service definition
 */
export type ExtractServiceContract<T> = T extends ServiceDefinition<string, object>
  ? {
      [K in keyof ServiceHandlers]: ServiceHandlers[K] extends HandlerContract<infer TInput, infer TOutput, infer TError>
        ? HandlerContract<TInput, TOutput, TError>
        : never
    }
  : never

/**
 * Utility type to extract handler contracts from a service
 */
export type ServiceHandlerContracts<T extends ServiceDefinition<string, object>> = 
  T extends ServiceDefinition<string, object>
    ? ReturnType<T['make']>
    : never

/**
 * Extract input type from handler contract
 */
export type ExtractHandlerInput<T> = T extends HandlerContract<infer TInput, unknown, unknown>
  ? TInput
  : never

/**
 * Extract output type from handler contract  
 */
export type ExtractHandlerOutput<T> = T extends HandlerContract<unknown, infer TOutput, unknown>
  ? TOutput
  : never

/**
 * Extract error type from handler contract
 */
export type ExtractHandlerError<T> = T extends HandlerContract<unknown, unknown, infer TError>
  ? TError
  : never

/**
 * Create a contract interface from service definition
 */
export type CreateServiceContract<
  TServiceName extends string,
  THandlers extends Record<string, HandlerContract>
> = {
  readonly serviceName: TServiceName
} & THandlers

/**
 * Helper to define handler contracts with explicit types
 */
export interface DefineHandlerContract<TInput, TOutput, TError = unknown> {
  input: TInput
  output: TOutput
  error: TError
  contract: HandlerContract<TInput, TOutput, TError>
}

/**
 * Utility function to create a handler contract definition
 */
export function defineHandlerContract<TInput, TOutput, TError = unknown>(): DefineHandlerContract<TInput, TOutput, TError> {
  return {} as DefineHandlerContract<TInput, TOutput, TError>
}

/**
 * Helper to create service contract from handler contracts
 */
export function defineServiceContract<
  TServiceName extends string,
  THandlers extends Record<string, DefineHandlerContract<unknown, unknown, unknown>>
>(
  serviceName: TServiceName,
  handlers: THandlers
): CreateServiceContract<
  TServiceName,
  {
    [K in keyof THandlers]: THandlers[K]['contract']
  }
> {
  return {
    serviceName,
    ...Object.fromEntries(
      Object.entries(handlers).map(([key, value]) => [key, value.contract])
    )
  } as CreateServiceContract<
    TServiceName,
    {
      [K in keyof THandlers]: THandlers[K]['contract']
    }
  >
}

/**
 * Type-only export utilities for service contracts
 */
export interface ServiceContractExports<T extends ServiceDefinition<string, object>> {
  /** Extract the full service contract type */
  ServiceContract: ServiceHandlerContracts<T>
  
  /** Extract individual handler contracts */
  HandlerContracts: {
    [K in keyof ServiceHandlerContracts<T>]: ServiceHandlerContracts<T>[K]
  }
  
  /** Extract handler input/output types */
  Types: {
    [K in keyof ServiceHandlerContracts<T>]: {
      Input: ExtractHandlerInput<ServiceHandlerContracts<T>[K]>
      Output: ExtractHandlerOutput<ServiceHandlerContracts<T>[K]>
      Error: ExtractHandlerError<ServiceHandlerContracts<T>[K]>
    }
  }
}

/**
 * Create contract exports for a service definition
 */
export function createServiceContracts<T extends ServiceDefinition<string, object>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _service: T
): ServiceContractExports<T> {
  // This is a type-only function, no runtime implementation needed
  return {} as ServiceContractExports<T>
}
