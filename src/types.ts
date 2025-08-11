import { Result } from "neverthrow"

/**
 * HandlerContext is an optional parameter passed to resolver functions.
 * It's primarily used for request-specific data when integrating with HTTP frameworks.
 *
 * Common use cases:
 * - Fastify request/reply objects
 * - User session data
 * - Request tracing information
 * - Authentication context
 *
 * Extend this interface via declaration merging to add framework-specific properties:
 *
 * @example
 * ```typescript
 * declare module '@framewerk/std/handler' {
 *   interface HandlerContext {
 *     requestId: string;
 *     session?: {
 *       userId: string;
 *       permissions: string[];
 *     };
 *     fastify?: {
 *       request: FastifyRequest;
 *       reply: FastifyReply;
 *     };
 *   }
 * }
 * ```
 */
export interface HandlerContext {
  [x: string]: unknown
}

/**
 * Options parameter for handlers - contains optional request-specific data
 * like transactions, request metadata, etc.
 */
export interface HandlerOptions {
  /** Optional database transaction */
  transaction?: unknown
  /** Request-specific metadata */
  requestMetadata?: Record<string, unknown>
  /** Additional request context */
  [key: string]: unknown
}

/**
 * Merged context type that combines HandlerContext with ServiceDependencies
 */
export type MergedContext<TServiceDeps = object> = HandlerContext & TServiceDeps

/**
 * Updated handler method signature: (input, options?, ctx) => Result
 * Where ctx is merged HandlerContext + ServiceDependencies
 */
export type HandlerMethod<TInput, TOkOutput, TErrorOutput, TServiceDeps = object> = (
  input: TInput,
  options: HandlerOptions | undefined,
  ctx: MergedContext<TServiceDeps>
) => Promise<Result<TOkOutput, TErrorOutput>>

export type SyncHandlerMethod<TInput, TOkOutput, TErrorOutput, TServiceDeps = object> = (
  input: TInput,
  options: HandlerOptions | undefined,
  ctx: MergedContext<TServiceDeps>
) => Result<TOkOutput, TErrorOutput>

/**
 * Legacy handler method signature for backward compatibility
 */
export type LegacyHandlerMethod<TInput, TOkOutput, TErrorOutput> = (
  input: TInput,
  ctx?: HandlerContext
) => Promise<Result<TOkOutput, TErrorOutput>>