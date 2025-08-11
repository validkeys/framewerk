/**
 * Example: Handler with Tagged Error Integration
 * 
 * This example demonstrates how the new FramewerkError.tagged() system
 * integrates seamlessly with the handler error definitions.
 */

import { z } from 'zod'
import { defineHandler } from '../handler'
import { defineService, type HandlerDefinition } from '../service'
import { FramewerkError } from '../errors'
import { ok, err } from 'neverthrow'

// ============================================================================
// 1. Define Custom Errors using FramewerkError.tagged()
// ============================================================================

class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
  static readonly httpStatus = 404
  
  constructor(userId: string) {
    super(`User ${userId} not found`)
  }
}

class ValidationError extends FramewerkError.tagged("ValidationError") {
  static readonly httpStatus = 400
  
  constructor(field: string, reason?: string) {
    super(reason ? `Validation failed for ${field}: ${reason}` : `Validation failed for ${field}`)
  }
}

class DatabaseError extends FramewerkError.tagged("DatabaseError") {
  static readonly httpStatus = 500
  
  constructor(operation: string, cause?: unknown) {
    super(`Database operation failed: ${operation}`, cause)
  }
}

class AuthorizationError extends FramewerkError.tagged("AuthorizationError") {
  static readonly httpStatus = 403
  
  constructor(resource: string) {
    super(`Access denied to resource: ${resource}`)
  }
}

// ============================================================================
// 2. Define Handler Functions for Service Integration
// ============================================================================

interface UserServiceDeps {
  database: {
    findUser: (id: string) => Promise<{ id: string; name: string; email: string } | null>
    updateUser: (id: string, data: Partial<{ name: string; email: string }>) => Promise<void>
  }
  auth: {
    canAccessUser: (currentUserId: string, targetUserId: string) => Promise<boolean>
  }
  logger: {
    info: (message: string) => void
    error: (message: string, error?: unknown) => void
  }
}

// Handler functions that use error instances (for service integration)
const getUserHandler: HandlerDefinition<
  { userId: string },
  { id: string; name: string; email: string },
  UserNotFoundError | ValidationError | AuthorizationError | DatabaseError,
  UserServiceDeps
> = async (input, _options, ctx) => {
  ctx.logger.info(`Getting user ${input.userId}`)
  
  try {
    // Validate input format
    if (!input.userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return err(new ValidationError('userId', 'must be a valid UUID'))
    }

    // Database lookup
    const user = await ctx.database.findUser(input.userId)
    if (!user) {
      return err(new UserNotFoundError(input.userId))
    }

    return ok(user)
    
  } catch (error) {
    ctx.logger.error(`Database error in getUser`, error)
    return err(new DatabaseError('findUser', error))
  }
}

const updateUserHandler: HandlerDefinition<
  { userId: string; data: { name?: string; email?: string } },
  { success: boolean; message: string },
  UserNotFoundError | ValidationError | DatabaseError,
  UserServiceDeps
> = async (input, _options, ctx) => {
  ctx.logger.info(`Updating user ${input.userId}`)
  
  try {
    // Validate that we have at least one field to update
    if (!input.data.name && !input.data.email) {
      return err(new ValidationError('data', 'at least one field must be provided'))
    }

    // Check if user exists
    const existingUser = await ctx.database.findUser(input.userId)
    if (!existingUser) {
      return err(new UserNotFoundError(input.userId))
    }

    // Update user
    await ctx.database.updateUser(input.userId, input.data)
    
    return ok({
      success: true,
      message: 'User updated successfully'
    })
    
  } catch (error) {
    ctx.logger.error(`Database error in updateUser`, error)
    return err(new DatabaseError('updateUser', error))
  }
}

// ============================================================================
// 3. Standalone Handler Builders (Alternative Pattern)
// ============================================================================

// These show how to use the handler builder pattern for standalone handlers
export const getUserHandlerBuilder = defineHandler("getUser", "Retrieve user by ID")
  .input(z.object({
    userId: z.string().uuid()
  }))
  .output(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
  }))
  .errors([
    UserNotFoundError,        // 404 - User doesn't exist
    ValidationError,          // 400 - Invalid input format
    AuthorizationError,       // 403 - Access denied
    DatabaseError            // 500 - Database connection issues
  ] as const)
  .withDependencies<UserServiceDeps>()
  .resolver((deps) => async (input, options, ctx) => {
    deps.logger.info(`Getting user ${input.userId}`)
    
    try {
      // Validate input format (example)
      if (!input.userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        return err(new ValidationError('userId', 'must be a valid UUID'))
      }

      // Check authorization (example with session context) 
      // Note: ctx.session is framework-specific, this is just an example
      const currentUserId = (ctx as any)?.session?.userId
      if (currentUserId && !await deps.auth.canAccessUser(currentUserId, input.userId)) {
        return err(new AuthorizationError(`user:${input.userId}`))
      }

      // Database lookup
      const user = await deps.database.findUser(input.userId)
      if (!user) {
        return err(new UserNotFoundError(input.userId))
      }

      return ok(user)
      
    } catch (error) {
      deps.logger.error(`Database error in getUser`, error)
      return err(new DatabaseError('findUser', error))
    }
  })
  .build()

// Update User Handler
export const updateUserHandlerBuilder = defineHandler("updateUser", "Update user information")
  .input(z.object({
    userId: z.string().uuid(),
    data: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional()
    })
  }))
  .output(z.object({
    success: z.boolean(),
    message: z.string()
  }))
  .errors([
    UserNotFoundError,
    ValidationError,
    AuthorizationError,
    DatabaseError
  ] as const)
  .withDependencies<UserServiceDeps>()
  .resolver((deps) => async (input, options, ctx) => {
    deps.logger.info(`Updating user ${input.userId}`)
    
    try {
      // Validate that we have at least one field to update
      if (!input.data.name && !input.data.email) {
        return err(new ValidationError('data', 'at least one field must be provided'))
      }

      // Check authorization (example with session context)
      // Note: ctx.session is framework-specific, this is just an example
      const currentUserId = (ctx as any)?.session?.userId
      if (currentUserId && !await deps.auth.canAccessUser(currentUserId, input.userId)) {
        return err(new AuthorizationError(`user:${input.userId}`))
      }

      // Check if user exists
      const existingUser = await deps.database.findUser(input.userId)
      if (!existingUser) {
        return err(new UserNotFoundError(input.userId))
      }

      // Update user
      await deps.database.updateUser(input.userId, input.data)
      
      return ok({
        success: true,
        message: 'User updated successfully'
      })
      
    } catch (error) {
      deps.logger.error(`Database error in updateUser`, error)
      return err(new DatabaseError('updateUser', error))
    }
  })
  .build()

// ============================================================================
// 4. Create Service with Handlers
// ============================================================================

export const userService = defineService("UserService")
  .withServiceDependencies<UserServiceDeps>()
  .addHandler("getUser", getUserHandler)
  .addHandler("updateUser", updateUserHandler)
  .build()

// ============================================================================
// 5. Error Handling Examples
// ============================================================================

// Type-safe error union for this service
type UserServiceErrors = UserNotFoundError | ValidationError | AuthorizationError | DatabaseError

// Exhaustive error handler with compile-time safety
export const handleUserServiceError = (error: UserServiceErrors) => {
  switch (error._tag) {
    case "UserNotFoundError":
      return {
        httpStatus: 404,
        code: error._tag,
        message: "The requested user could not be found",
        userFriendly: true
      }
    case "ValidationError":
      return {
        httpStatus: 400,
        code: error._tag,
        message: error.message,
        userFriendly: true
      }
    case "AuthorizationError":
      return {
        httpStatus: 403,
        code: error._tag,
        message: "You don't have permission to access this resource",
        userFriendly: true
      }
    case "DatabaseError":
      return {
        httpStatus: 500,
        code: error._tag,
        message: "An internal server error occurred",
        userFriendly: false // Don't expose DB details to users
      }
    default:
      // TypeScript will catch if any error types are missing
      const _exhaustive: never = error
      throw new Error(`Unhandled error: ${_exhaustive}`)
  }
}

// ============================================================================
// 6. Usage Example with Mock Dependencies
// ============================================================================

export const createUserServiceExample = () => {
  const mockDeps: UserServiceDeps = {
    database: {
      findUser: async (id: string) => {
        if (id === 'user-123') {
          return { id: 'user-123', name: 'John Doe', email: 'john@example.com' }
        }
        return null
      },
      updateUser: async (id: string, data: any) => {
        // Mock implementation
        console.log(`Updated user ${id}:`, data)
      }
    },
    auth: {
      canAccessUser: async (currentUserId: string, targetUserId: string) => {
        return currentUserId === targetUserId || currentUserId === 'admin'
      }
    },
    logger: {
      info: (message: string) => console.log(`[INFO] ${message}`),
      error: (message: string, error?: unknown) => console.error(`[ERROR] ${message}`, error)
    }
  }

  return userService.make(mockDeps)
}

// ============================================================================
// 7. Testing the Integration
// ============================================================================

export const testErrorIntegration = async () => {
  const service = createUserServiceExample()
  
  console.log('=== Testing Error Integration ===')
  
  // Test 1: Successful user retrieval
  console.log('\n1. Getting existing user...')
  const result1 = await service.getUser({ userId: 'user-123' })
  if (result1.isOk()) {
    console.log('✅ Success:', result1.value)
  } else {
    console.log('❌ Error:', result1.error)
  }
  
  // Test 2: User not found
  console.log('\n2. Getting non-existent user...')
  const result2 = await service.getUser({ userId: 'user-999' })
  if (result2.isErr()) {
    console.log('✅ Expected error:', result2.error)
    // The error should have the format: { code: "UserNotFoundError", message: "User user-999 not found" }
  }
  
  // Test 3: Validation error
  console.log('\n3. Invalid UUID format...')
  const result3 = await service.getUser({ userId: 'invalid-uuid' })
  if (result3.isErr()) {
    console.log('✅ Expected validation error:', result3.error)
    // The error should have the format: { code: "ValidationError", message: "Validation failed for userId: must be a valid UUID" }
  }
}

/**
 * Key Benefits Demonstrated:
 * 
 * 1. **Type Safety**: Error types are checked at compile time
 * 2. **Reduced Boilerplate**: Each error class is just 3-4 lines 
 * 3. **Automatic Integration**: Works seamlessly with both service and standalone handlers
 * 4. **Exhaustive Checking**: Switch statements catch missing error cases
 * 5. **Consistent Format**: All errors use the same { code, message } structure via toHandlerError()
 * 6. **Handler Compatibility**: Works perfectly with the existing handler system
 * 7. **Two Patterns**: Service handler functions and standalone handler builders
 */
