/**
 * Tests for handler error integration with the new FramewerkError system
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineHandler } from '../handler'
import { 
  UserNotFoundError, 
  ValidationError, 
  DatabaseError,
  FramewerkError
} from '../errors'

describe('Handler Error Integration', () => {
  describe('FramewerkError.tagged() with Handler Errors', () => {
    it('should accept FramewerkError classes in .errors() method', () => {
      const handler = defineHandler("testHandler", "Test handler with errors")
        .input(z.object({ id: z.string() }))
        .output(z.object({ name: z.string() }))
        .errors([
          UserNotFoundError,
          ValidationError,
          DatabaseError
        ] as const)
        
      // If this compiles without TypeScript errors, the integration works
      expect(handler).toBeDefined()
    })

    it('should generate proper handler error definitions', () => {
      // Test that our new error classes have the correct static methods
      const userNotFoundDef = UserNotFoundError.handlerError()
      const validationDef = ValidationError.handlerError(422)
      const dbDef = DatabaseError.handlerError()

      expect(userNotFoundDef).toEqual({
        code: 'UserNotFoundError',
        status: 404,
        schema: expect.any(Object)
      })

      expect(validationDef).toEqual({
        code: 'ValidationError', 
        status: 422,
        schema: expect.any(Object)
      })

      expect(dbDef).toEqual({
        code: 'DatabaseError',
        status: 500,
        schema: expect.any(Object)
      })
    })

    it('should validate error schemas correctly', () => {
      const userErrorDef = UserNotFoundError.handlerError()
      const schema = userErrorDef.schema

      // Valid error should parse
      const validError = { code: 'UserNotFoundError', message: 'User not found' }
      expect(schema.parse(validError)).toEqual(validError)

      // Invalid code should fail
      expect(() => {
        schema.parse({ code: 'WrongError', message: 'test' })
      }).toThrow()
    })

    it('should work with custom error classes using tagged pattern', () => {
      // Create a custom error for this test
      class CustomTestError extends FramewerkError.tagged("CustomTestError") {
        static readonly httpStatus = 418 // I'm a teapot
        
        constructor(reason: string) {
          super(`Custom test error: ${reason}`)
        }
      }

      const handler = defineHandler("customTest", "Handler with custom error")
        .input(z.object({ test: z.string() }))
        .output(z.object({ result: z.string() }))
        .errors([CustomTestError] as const)
        
      expect(handler).toBeDefined()
      
      const errorDef = CustomTestError.handlerError()
      expect(errorDef.code).toBe('CustomTestError')
      expect(errorDef.status).toBe(418)
    })

    it('should maintain type safety for error unions', () => {
      type HandlerErrors = UserNotFoundError | ValidationError | DatabaseError
      
      const handleError = (error: HandlerErrors) => {
        switch (error._tag) {
          case "UserNotFoundError":
            return { code: error._tag, message: "User not found" }
          case "ValidationError":
            return { code: error._tag, message: "Invalid input" }
          case "DatabaseError":
            return { code: error._tag, message: "Server error" }
          default:
            // TypeScript should catch if any cases are missing
            const _exhaustive: never = error
            throw new Error(`Unhandled error: ${_exhaustive}`)
        }
      }

      const userError = new UserNotFoundError('user-123')
      const validationError = new ValidationError('email', 'invalid format')
      const dbError = new DatabaseError('query failed')

      expect(handleError(userError)).toEqual({
        code: 'UserNotFoundError',
        message: 'User not found'
      })

      expect(handleError(validationError)).toEqual({
        code: 'ValidationError', 
        message: 'Invalid input'
      })

      expect(handleError(dbError)).toEqual({
        code: 'DatabaseError',
        message: 'Server error'
      })
    })

    it('should work in resolver with .toHandlerError()', () => {
      // Just test the structure, not the actual resolver execution
      const handler = defineHandler("resolverTest", "Test resolver error handling")
        .input(z.object({ userId: z.string() }))
        .output(z.object({ user: z.object({ id: z.string(), name: z.string() }) }))
        .errors([UserNotFoundError, DatabaseError] as const)

      expect(handler).toBeDefined()
      
      // Test that error conversion works
      const userError = new UserNotFoundError('user-123')
      const handlerError = userError.toHandlerError()
      
      expect(handlerError).toEqual({
        code: 'UserNotFoundError',
        message: 'User user-123 not found'
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('should still support legacy error patterns during transition', () => {
      // Test that the ErrorClassConstructor type still works
      type TestErrorConstructor = {
        new (message: string): { _tag: string; message: string }
        httpStatus?: number
        handlerError?: () => { code: string; status: number; schema: unknown }
      }

      const testConstructor: TestErrorConstructor = UserNotFoundError
      expect(testConstructor).toBeDefined()
      expect(testConstructor.httpStatus).toBe(404)
    })
  })
})
