/**
 * Test to verify that HandlerMarker doesn't leak into public type signatures
 * This simulates what a consuming application would see
 */

import { z } from 'zod'
import { defineHandler, HandlerMarker } from '../handler'
import { FramewerkError } from '../errors'
import { ok } from 'neverthrow'

// Create a simple error for testing
class TestError extends FramewerkError.tagged("TestError") {
  static readonly httpStatus = 400
  constructor(message: string) {
    super(message)
  }
}

// Define a handler
export const testHandler = defineHandler("test", "Test handler")
  .input(z.object({ value: z.string() }))
  .output(z.object({ result: z.string() }))
  .errors([TestError] as const)
  .withDependencies<{ logger: { info: (msg: string) => void } }>()
  .resolver((deps) => async (input) => {
    deps.logger.info(`Processing: ${input.value}`)
    return ok({ result: input.value.toUpperCase() })
  })
  .build()

// Test that the handler factory can be exported without TypeScript errors
export type TestHandlerType = typeof testHandler

// Test that we can create instances without issues
export const createTestHandler = (deps: { logger: { info: (msg: string) => void } }) => {
  const handler = testHandler(deps)
  
  // Verify the marker is present but hidden from the type system
  const hasMarker = HandlerMarker in handler
  console.log('Handler has marker:', hasMarker) // Should be true
  
  // Verify the marker is not enumerable (won't show up in JSON.stringify, etc.)
  const keys = Object.keys(handler)
  const hasMarkerInKeys = keys.includes(HandlerMarker.toString())
  console.log('Marker in enumerable keys:', hasMarkerInKeys) // Should be false
  
  return handler
}

// Test that we can use the handler in different contexts
export const useHandler = async () => {
  const handler = createTestHandler({
    logger: { info: (msg) => console.log(msg) }
  })
  
  // This should work without any type issues
  const result = await handler.method({ value: "hello" }, undefined, {})
  console.log('Handler result:', result)
  
  // Access metadata without issues
  console.log('Handler metadata:', handler.metadata.operationId)
  
  return result
}

// Export for verification that no TypeScript visibility errors occur
export default {
  testHandler,
  createTestHandler,
  useHandler,
}
