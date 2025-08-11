/**
 * Tests for the FramewerkError system
 */

import { describe, it, expect } from 'vitest'
import { 
  UserNotFoundError, 
  ValidationError, 
  DatabaseError,
  AuthenticationError,
  RedisConnectionError,
  NetworkTimeoutError,
  RateLimitError,
  FramewerkError,
  TaggedError,
  AbstractError,
  type CommonHandlerErrors,
  createHandlerError,
  mapHandlerError
} from '../errors'

describe('FramewerkError System', () => {
  describe('FramewerkError.tagged() pattern', () => {
    it('should create error class with correct _tag', () => {
      const error = new UserNotFoundError('user-123')
      
      expect(error._tag).toBe('UserNotFoundError')
      expect(error.message).toBe('User user-123 not found')
      expect(error.name).toBe('UserNotFoundError')
    })

    it('should have correct static properties', () => {
      expect(UserNotFoundError.errorCode).toBe('UserNotFoundError')
      expect(UserNotFoundError.httpStatus).toBe(404)
    })

    it('should generate correct handler error', () => {
      const handlerError = UserNotFoundError.handlerError()
      
      expect(handlerError).toEqual({
        code: 'UserNotFoundError',
        status: 404,
        schema: expect.any(Object)
      })

      // Test schema validation
      const validInput = { code: 'UserNotFoundError', message: 'test' }
      expect(handlerError.schema.parse(validInput)).toEqual(validInput)
    })

    it('should allow status override in handlerError', () => {
      const customError = ValidationError.handlerError(422)
      expect(customError.status).toBe(422)
    })

    it('should convert instance to handler error format', () => {
      const error = new ValidationError('email', 'invalid format')
      const handlerError = error.toHandlerError()
      
      expect(handlerError).toEqual({
        code: 'ValidationError',
        message: 'Validation failed for email: invalid format'
      })
    })

    it('should preserve cause in error chain', () => {
      const originalError = new Error('Connection timeout')
      const dbError = new DatabaseError('query failed', originalError)
      
      expect(dbError.cause).toBe(originalError)
      expect(dbError.message).toBe('Database operation failed: query failed')
    })
  })

  describe('TaggedError factory pattern', () => {
    it('should create error class with correct _tag', () => {
      const error = new RedisConnectionError('Connection failed')
      
      expect(error._tag).toBe('RedisConnectionError')
      expect(error.message).toBe('Connection failed')
      expect(error.name).toBe('RedisConnectionError')
    })

    it('should generate correct handler error', () => {
      const handlerError = RedisConnectionError.handlerError(503)
      
      expect(handlerError).toEqual({
        code: 'RedisConnectionError',
        status: 503,
        schema: expect.any(Object)
      })
    })
  })

  describe('Type Safety & Exhaustive Checking', () => {
    it('should enable exhaustive error checking', () => {
      const testExhaustiveHandling = (error: CommonHandlerErrors) => {
        return mapHandlerError(error)
      }

      const userError = new UserNotFoundError()
      const validationError = new ValidationError('field')
      const dbError = new DatabaseError('operation')
      const authError = new AuthenticationError()

      expect(testExhaustiveHandling(userError)).toEqual({
        code: 'UserNotFoundError',
        message: 'User not found',
        status: 404
      })

      expect(testExhaustiveHandling(validationError)).toEqual({
        code: 'ValidationError',
        message: 'Invalid input',
        status: 400
      })

      expect(testExhaustiveHandling(dbError)).toEqual({
        code: 'DatabaseError',
        message: 'Server error',
        status: 500
      })

      expect(testExhaustiveHandling(authError)).toEqual({
        code: 'AuthenticationError',
        message: 'Unauthorized',
        status: 401
      })
    })

    it('should maintain literal types for _tag', () => {
      const error = new UserNotFoundError()
      
      // This is a compile-time test - if _tag is not a literal type,
      // this would fail with "Type string is not assignable to type 'UserNotFoundError'"
      const tag: 'UserNotFoundError' = error._tag
      expect(tag).toBe('UserNotFoundError')
    })
  })

  describe('Error Construction Patterns', () => {
    it('should handle optional constructor parameters', () => {
      const genericUserError = new UserNotFoundError()
      expect(genericUserError.message).toBe('User not found')

      const specificUserError = new UserNotFoundError('user-123')
      expect(specificUserError.message).toBe('User user-123 not found')
    })

    it('should handle validation error patterns', () => {
      const simpleValidation = new ValidationError('email')
      expect(simpleValidation.message).toBe('Validation failed for email')

      const detailedValidation = new ValidationError('email', 'invalid format')
      expect(detailedValidation.message).toBe('Validation failed for email: invalid format')
    })

    it('should handle authentication error patterns', () => {
      const genericAuth = new AuthenticationError()
      expect(genericAuth.message).toBe('Authentication failed')

      const specificAuth = new AuthenticationError('invalid token')
      expect(specificAuth.message).toBe('Authentication failed: invalid token')
    })
  })

  describe('Handler Integration', () => {
    it('should work with neverthrow Result pattern', () => {
      // Simulate handler usage
      const simulateHandlerResult = (shouldFail: boolean) => {
        if (shouldFail) {
          const error = new UserNotFoundError('user-123')
          return { isErr: () => true, error: error.toHandlerError() }
        }
        return { isOk: () => true, value: { id: 'user-123', name: 'John' } }
      }

      const errorResult = simulateHandlerResult(true)
      expect(errorResult.isErr?.()).toBe(true)
      expect(errorResult.error).toEqual({
        code: 'UserNotFoundError',
        message: 'User user-123 not found'
      })

      const successResult = simulateHandlerResult(false)
      expect(successResult.isOk?.()).toBe(true)
    })

    it('should generate valid Zod schemas', () => {
      const errorDef = ValidationError.handlerError()
      const schema = errorDef.schema

      // Valid input should parse successfully
      const validError = { code: 'ValidationError', message: 'Test error' }
      expect(schema.parse(validError)).toEqual(validError)

      // Invalid code should fail
      expect(() => {
        schema.parse({ code: 'WrongError', message: 'Test' })
      }).toThrow()

      // Missing message should fail
      expect(() => {
        schema.parse({ code: 'ValidationError' })
      }).toThrow()
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain toHandlerError() interface', () => {
      const error = new DatabaseError('connection failed')
      const handlerError = error.toHandlerError()

      expect(handlerError).toHaveProperty('code')
      expect(handlerError).toHaveProperty('message')
      expect(typeof handlerError.code).toBe('string')
      expect(typeof handlerError.message).toBe('string')
    })
  })
})
