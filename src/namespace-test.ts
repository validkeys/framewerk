/**
 * Test the new Framewerk namespace API (without Testing utilities to avoid vitest)
 */

import { Framewerk, defineService, defineHandler, TaggedError } from './index.ts'
import { z } from 'zod'
import { ok, err } from 'neverthrow'

// Test namespace usage
console.log('🧪 Testing Framewerk namespace API...')

// Test 1: Error creation with namespace
class UserNotFoundError extends Framewerk.Error.tagged("UserNotFoundError") {
  static readonly httpStatus = 404
  constructor(userId: string) {
    super(`User ${userId} not found`)
  }
}

// Test 2: Factory function with namespace
const NetworkError = Framewerk.TaggedError("NetworkError")

// Test 3: Service definition with namespace
interface TestDeps extends Record<string, unknown> {
  logger: { info: (msg: string) => void }
}

const testService = Framewerk.defineService("TestService")
  .withServiceDependencies<TestDeps>()
  .addHandler("test", async (input: { value: string }) => {
    return ok({ result: input.value.toUpperCase() })
  })
  .build()

// Test 4: Handler definition with namespace
const testHandler = Framewerk.defineHandler("test", "Test handler")
  .input(z.object({ value: z.string() }))
  .output(z.object({ result: z.string() }))
  .errors([UserNotFoundError] as const)
  .withDependencies<TestDeps>()
  .resolver((deps) => async (input) => {
    deps.logger.info(`Processing: ${input.value}`)
    if (input.value === 'error') {
      return err(new UserNotFoundError('test'))
    }
    return ok({ result: input.value.toUpperCase() })
  })
  .build()

// Test 5: Verify backward compatibility - named exports still work
const legacyService = defineService("LegacyService")
  .withServiceDependencies<TestDeps>()
  .addHandler("legacy", async () => ok({ success: true }))
  .build()

const LegacyError = TaggedError("LegacyError")
const legacyHandler = defineHandler("legacy", "Legacy handler")
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .errors([LegacyError] as const)
  .withDependencies<TestDeps>()
  .resolver(() => async () => ok({ success: true }))
  .build()

// Test 6: Introspection with namespace
const inspector = new Framewerk.Inspector(testService)
const metadata = inspector.getEnhancedMetadata()
console.log('📋 Service inspector created:', metadata.name)

// Test 7: Registry usage
Framewerk.registry.register(testService)
console.log('📋 Service registered in global registry')

// Test 8: Verify core namespace properties exist
console.log('✅ Framewerk.defineService:', typeof Framewerk.defineService)
console.log('✅ Framewerk.defineHandler:', typeof Framewerk.defineHandler)
console.log('✅ Framewerk.Error.tagged:', typeof Framewerk.Error.tagged)
console.log('✅ Framewerk.TaggedError:', typeof Framewerk.TaggedError)
console.log('✅ Framewerk.Registry:', typeof Framewerk.Registry)
console.log('✅ Framewerk.Inspector:', typeof Framewerk.Inspector)
console.log('✅ Framewerk.registry (instance):', typeof Framewerk.registry)

// Test 9: Demonstrate both patterns work
console.log('\n🔄 Testing both import patterns:')

// Namespace pattern
const nsError = new UserNotFoundError('123')
console.log('✅ Namespace error:', nsError._tag, '=', nsError.message)

// Named export pattern  
const legacyError = new LegacyError('Connection failed')
console.log('✅ Legacy error:', legacyError._tag, '=', legacyError.message)

// Test 10: Test handler execution
const mockDeps: TestDeps = {
  logger: { info: (msg) => console.log('📝', msg) }
}

const handlerInstance = testHandler(mockDeps)
console.log('✅ Handler created with namespace pattern')

console.log('\n🎉 All namespace tests passed!')

export {
  testService,
  testHandler,
  legacyService,
  legacyHandler,
  UserNotFoundError,
  NetworkError,
  LegacyError
}
