#!/usr/bin/env tsx

// Test just the core namespace structure without any imports
console.log('🧪 Testing core Framewerk namespace structure...\n')

// Test just the core error system
import { FramewerkError } from './errors.ts'

try {
  class TestError extends FramewerkError.tagged('TestError') {
    constructor(message: string) {
      super(message)
    }
  }
  const error = new TestError('Test error')
  console.log('✅ Tagged error works:', error._tag === 'TestError')
} catch (e) {
  console.log('❌ Tagged error failed:', e)
}

// Test the service builder
import { defineService } from './service.ts'

try {
  const service = defineService('TestService')
  console.log('✅ Service definition works:', typeof service === 'object')
} catch (e) {
  console.log('❌ Service definition failed:', e)
}

// Test the handler builder
import { defineHandler } from './handler.ts'

try {
  const handler = defineHandler('test-op', 'Test operation')
  console.log('✅ Handler definition works:', typeof handler === 'object')
} catch (e) {
  console.log('❌ Handler definition failed:', e)
}

console.log('\n🎉 Core components test completed!')
