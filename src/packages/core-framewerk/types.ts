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

export type HandlerMethod<TInput, TOkOutput, TErrorOutput> = (
  input: TInput,
  ctx?: HandlerContext
) => Promise<Result<TOkOutput, TErrorOutput>>

export type SyncHandlerMethod<TInput, TOkOutput, TErrorOutput> = (
  input: TInput,
  ctx?: HandlerContext
) => Result<TOkOutput, TErrorOutput>