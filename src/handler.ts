import { z } from "zod"
import { HandlerMethod } from "./types.ts"
/**
 * @fileoverview Handler Builder Pattern for Type-Safe API Handler Definitions
 *
 * This module provides a fluent builder pattern for defining API handlers with full type safety,
 * dependency injection support, and compile-time validation of required fields.
 *
 * @example
 * ```typescript
 * // Define your dependencies interface
 * interface MyDependencies {
 *   userRepo: UserRepository;
 *   logger: Logger;
 * }
 *
 * // Create a handler using the builder pattern
 * export const GetUser = defineHandler("users.getUser", "Retrieves a user by ID")
 *   .tags("Users", "Public")
 *   .auth({ required: true, scopes: ["users:read"] })
 *   .input(z.object({
 *     userId: z.string().uuid()
 *   }))
 *   .output(z.object({
 *     id: z.string(),
 *     name: z.string(),
 *     email: z.string().email()
 *   }))
 *   .errors([
 *     {
 *       code: "NOT_FOUND",
 *       status: 404,
 *       schema: z.object({
 *         code: z.literal("NOT_FOUND"),
 *         message: z.string()
 *       })
 *     }
 *   ] as const)
 *   .withDependencies<MyDependencies>()
 *   .resolver((deps) => async (input, ctx) => {
 *     // ctx is optional - only needed for request-specific data like session info
 *     const requestId = ctx?.requestId || 'unknown';
 *     deps.logger.info(`Processing request ${requestId} for user ${input.userId}`);
 *
 *     const user = await deps.userRepo.findById(input.userId);
 *     if (!user) {
 *       return err({ code: "NOT_FOUND", message: "User not found" });
 *     }
 *     return ok(user);
 *   })
 *   .build();
 *
 * // Initialize with dependencies
 * const handler = GetUser({ userRepo, logger });
 * ```
 *
 * @remarks
 * ## Key Features:
 *
 * 1. **Type-Safe Builder Pattern**: Methods must be called in the correct order to ensure all
 *    required fields are set before building. The resolver method is only available after
 *    input, output, and dependencies are defined.
 *
 * 2. **Dependency Injection**: Use `.withDependencies<T>()` to specify the type of dependencies
 *    your handler requires. Dependencies are injected when the handler factory is called.
 *
 * 3. **Full Type Inference**: Input and output types are automatically inferred in the resolver
 *    function based on the Zod schemas provided.
 *
 * 4. **Error Type Safety**: Error codes in the resolver are type-checked against the defined
 *    errors array, preventing typos and ensuring all errors have proper schemas.
 *
 * 5. **OpenAPI Compatible**: All metadata (operationId, description, tags, auth) is preserved
 *    for automatic OpenAPI documentation generation.
 *
 * ## Builder Method Order:
 *
 * 1. `defineHandler(operationId, description)` - Start the builder
 * 2. Optional configuration methods (any order):
 *    - `.tags(...tags)` - Add tags for grouping in documentation
 *    - `.auth(config)` - Specify authentication requirements
 *    - `.private(boolean)` - Mark handler as private (excluded from public API)
 *    - `.errors(array)` - Define possible error responses
 * 3. Required definition methods (must be called before resolver):
 *    - `.input(zodSchema)` - Define input validation schema
 *    - `.output(zodSchema)` - Define output validation schema
 *    - `.withDependencies<T>()` - Specify dependency types
 * 4. `.resolver(fn)` - Define the handler logic (only available after step 3)
 * 5. `.build()` - Finalize and return the handler factory
 *
 * ## Dependency Injection Pattern:
 *
 * Handlers are defined as factories that accept dependencies. This allows:
 * - Easy testing with mock dependencies
 * - Different dependency implementations per environment
 * - Clear separation of concerns
 * - Type-safe dependency requirements
 *
 * ## Error Handling:
 *
 * Errors must be defined with:
 * - `code`: A unique string identifier (becomes a literal type)
 * - `status`: HTTP status code for the error
 * - `schema`: Zod schema that MUST include a `code` field matching the error code
 *
 * The resolver function returns `Result<Output, ErrorUnion>` from neverthrow, ensuring
 * all errors are handled explicitly.
 *
 * ## Integration with HandlerContext:
 *
 * The resolver receives an optional `HandlerContext` as the second parameter, which is
 * primarily used for request-specific data when integrating with HTTP frameworks like Fastify.
 * The context typically contains:
 * - Request metadata (requestId, timestamps)
 * - Session information (user authentication, permissions)
 * - Framework-specific objects (Fastify request/reply)
 * - Tracing and logging context
 *
 * For pure business logic handlers that don't need request context, the parameter can be omitted.
 * The HandlerContext interface can be extended via TypeScript declaration merging to add
 * framework-specific properties.
 *
 * ```typescript
 * // Example with context (HTTP handler)
 * .resolver((deps) => async (input, ctx) => {
 *   const userId = ctx?.session?.userId;
 *   // ... handler logic with session data
 * })
 *
 * // Example without context (pure business logic)
 * .resolver((deps) => async (input) => {
 *   // ... handler logic without request context
 * })
 * ```
 *
 * ## Codegen Compatibility:
 *
 * The built handler includes a `HandlerMarker` symbol and exports all necessary metadata
 * for automatic route generation, OpenAPI spec generation, and client SDK generation.
 *
 * @see HandlerContext - For extending the context object
 * @see defineHandler - Entry point for creating handlers
 * @see HandlerBuilder - Main builder class with all available methods
 *
 * @module
 */
export const HandlerMarker = Symbol("HandlerMarker")

export type HandlerAuth = {
  required?: boolean
  scopes?: string[]
}

export type HandlerError<Code extends string, S extends z.ZodTypeAny> = {
  code: Code
  status: number
  schema: S
}

// Tagged error interface for type constraints (FramewerkError compatibility)
interface TaggedErrorInterface {
  readonly _tag: string
  name: string
  message: string
  cause?: unknown
}

// Error class constructor interface with static methods
type ErrorClassConstructor = {
  new (...args: any[]): TaggedErrorInterface
  httpStatus?: number
  handlerError?: (status?: number) => { code: string; status: number; schema: z.ZodTypeAny }
  getSchema?(): z.ZodTypeAny // Legacy AbstractError support
}

// Type to extract union of error instances from array of error class constructors
type ErrorUnionFromClasses<
  T extends readonly ErrorClassConstructor[]
> = T extends readonly [] ? never : InstanceType<T[number]>

// Track builder state with flags
type BuilderState = {
  hasInput: boolean
  hasOutput: boolean
  hasDependencies: boolean
  hasResolver: boolean
}

// Builder class with progressive type refinement
export class HandlerBuilder<
  TState extends BuilderState,
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny,
  TErrors extends readonly ErrorClassConstructor[],
  TDeps
> {
  constructor(
    private config: {
      operationId: string
      description: string
      tags?: string[]
      auth?: HandlerAuth
      errors?: TErrors
      private?: boolean
      input?: TInput
      output?: TOutput
      dependencies?: TDeps

      resolver?: (
        deps: TDeps
      ) => HandlerMethod<
        z.infer<TInput>,
        z.infer<TOutput>,
        ErrorUnionFromClasses<TErrors>
      >
    }
  ) {}

  input<I extends z.ZodTypeAny>(
    schema: I
  ): HandlerBuilder<TState & { hasInput: true }, I, TOutput, TErrors, TDeps> {
    return new HandlerBuilder<
      TState & { hasInput: true },
      I,
      TOutput,
      TErrors,
      TDeps
    >({
      ...this.config,
      input: schema,
    } as unknown as ConstructorParameters<typeof HandlerBuilder<TState & { hasInput: true }, I, TOutput, TErrors, TDeps>>[0])
  }

  output<O extends z.ZodTypeAny>(
    schema: O
  ): HandlerBuilder<TState & { hasOutput: true }, TInput, O, TErrors, TDeps> {
    return new HandlerBuilder<
      TState & { hasOutput: true },
      TInput,
      O,
      TErrors,
      TDeps
    >({
      ...this.config,
      output: schema,
    } as unknown as ConstructorParameters<typeof HandlerBuilder<TState & { hasOutput: true }, TInput, O, TErrors, TDeps>>[0])
  }

  errors<E extends readonly ErrorClassConstructor[]>(
    errorClasses: E
  ): HandlerBuilder<TState, TInput, TOutput, E, TDeps> {
    return new HandlerBuilder<TState, TInput, TOutput, E, TDeps>({
      ...this.config,
      errors: errorClasses,
    } as unknown as ConstructorParameters<typeof HandlerBuilder<TState, TInput, TOutput, E, TDeps>>[0])
  }

  auth(
    auth: HandlerAuth
  ): HandlerBuilder<TState, TInput, TOutput, TErrors, TDeps> {
    return new HandlerBuilder({
      ...this.config,
      auth,
    })
  }

  private(
    isPrivate = true
  ): HandlerBuilder<TState, TInput, TOutput, TErrors, TDeps> {
    return new HandlerBuilder({
      ...this.config,
      private: isPrivate,
    })
  }

  tags(
    ...tags: string[]
  ): HandlerBuilder<TState, TInput, TOutput, TErrors, TDeps> {
    return new HandlerBuilder({
      ...this.config,
      tags,
    })
  }

  withDependencies<D>(): HandlerBuilder<
    TState & { hasDependencies: true },
    TInput,
    TOutput,
    TErrors,
    D
  > {
    return new HandlerBuilder<
      TState & { hasDependencies: true },
      TInput,
      TOutput,
      TErrors,
      D
    >({
      ...this.config,
      dependencies: {} as D,
    } as unknown as ConstructorParameters<typeof HandlerBuilder<TState & { hasDependencies: true }, TInput, TOutput, TErrors, D>>[0])
  }

  // Resolver can only be called after input, output, and dependencies are set
  resolver(
    this: HandlerBuilder<
      BuilderState & { hasInput: true; hasOutput: true; hasDependencies: true },
      TInput,
      TOutput,
      TErrors,
      TDeps
    >,
    resolverFn: (
      deps: TDeps
    ) => HandlerMethod<
      z.infer<TInput>,
      z.infer<TOutput>,
      ErrorUnionFromClasses<TErrors>
    >
  ): HandlerBuilder<
    TState & { hasResolver: true },
    TInput,
    TOutput,
    TErrors,
    TDeps
  > {
    return new HandlerBuilder<
      TState & { hasResolver: true },
      TInput,
      TOutput,
      TErrors,
      TDeps
    >({
      ...this.config,
      resolver: resolverFn,
    })
  }

  // Build can only be called when all required fields are set
  build(
    this: HandlerBuilder<
      BuilderState & {
        hasInput: true
        hasOutput: true
        hasDependencies: true
        hasResolver: true
      },
      TInput,
      TOutput,
      TErrors,
      TDeps
    >
  ): HandlerFactory<z.infer<TInput>, z.infer<TOutput>, ErrorUnionFromClasses<TErrors>, TDeps> {
    // At this point, TypeScript knows all required fields are set
    const { input, output, resolver, errors } = this.config

    if (!input || !output || !resolver) {
      throw new Error(
        "Handler builder is in an invalid state - missing required fields"
      )
    }

    // Convert error classes to handler error objects
    const handlerErrors = (errors || []).map((ErrorClass) => {
      // Create a temporary instance to get the _tag
      const instance = new ErrorClass("")
      return {
        code: instance._tag,
        status: ErrorClass.httpStatus || 500,
        schema: ErrorClass.getSchema?.() || z.object({
          code: z.literal(instance._tag),
          message: z.string(),
        }),
      }
    })

    const errorMap = handlerErrors.reduce((acc, e) => {
      acc[e.code] = e
      return acc
    }, {} as Record<string, HandlerError<string, z.ZodTypeAny>>)

    const errorSchemas = handlerErrors.map((e) => e.schema)
    const ErrorOutput =
      errorSchemas.length === 0
        ? z.never()
        : errorSchemas.length === 1
        ? errorSchemas[0]!
        : z.union(
            errorSchemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]
          )

    // Return factory function
    return (deps: TDeps) => {
      const resolverWithDeps = resolver(deps)
      const inputSchema = input
      const outputSchema = output

      const method: HandlerMethod<
        z.infer<TInput>,
        z.infer<TOutput>,
        ErrorUnionFromClasses<TErrors>
      > = async (input, options, ctx) => {
        const parsed = inputSchema.safeParse(input)
        if (!parsed.success) {
          throw new Error(`Invalid input: ${parsed.error.message}`)
        }
        return resolverWithDeps(parsed.data, options, ctx)
      }

      const result = {
        Input: inputSchema,
        Output: outputSchema,
        ErrorOutput,
        errors: errorMap,
        metadata: {
          operationId: this.config.operationId,
          description: this.config.description,
          tags: this.config.tags,
          auth: this.config.auth,
          private: this.config.private,
          errors: handlerErrors.map((e) => ({
            code: e.code,
            status: e.status,
            schema: e.schema,
          })),
        },
        method,
      } as const

      // Add the marker as a non-enumerable property to avoid type leakage
      Object.defineProperty(result, HandlerMarker, {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false,
      })

      return result
    }
  }
}

// Entry point for creating handlers
export function defineHandler(operationId: string, description: string) {
  return new HandlerBuilder<
    {
      hasInput: false
      hasOutput: false
      hasDependencies: false
      hasResolver: false
    },
    z.ZodTypeAny,
    z.ZodTypeAny,
    readonly [],
    unknown
  >({
    operationId,
    description,
  })
}

// Handler result interface to hide internal marker from type signatures
export interface HandlerFactory<TInput, TOutput, TErrors, TDeps> {
  (deps: TDeps): {
    readonly Input: z.ZodTypeAny
    readonly Output: z.ZodTypeAny
    readonly ErrorOutput: z.ZodTypeAny
    readonly errors: Record<string, HandlerError<string, z.ZodTypeAny>>
    readonly metadata: {
      operationId: string
      description: string
      tags?: string[]
      auth?: HandlerAuth
      private?: boolean
      errors: Array<{
        code: string
        status: number
        schema: z.ZodTypeAny
      }>
    }
    readonly method: HandlerMethod<TInput, TOutput, TErrors>
  }
}

// Type helpers
export type AnyHandler = HandlerFactory<any, any, any, any>
export type HandlerInput<H extends AnyHandler> = H extends (deps: unknown) => {
  Input: infer I
}
  ? I extends z.ZodTypeAny
    ? z.infer<I>
    : never
  : never
export type HandlerOutput<H extends AnyHandler> = H extends (deps: unknown) => {
  Output: infer O
}
  ? O extends z.ZodTypeAny
    ? z.infer<O>
    : never
  : never
export type HandlerErrorUnion<H extends AnyHandler> = H extends (
  deps: unknown
) => { ErrorOutput: infer E }
  ? E extends z.ZodTypeAny
    ? z.infer<E>
    : never
  : never
