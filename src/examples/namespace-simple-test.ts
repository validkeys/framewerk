#!/usr/bin/env tsx

// Simple test of the Framewerk namespace without testing utilities
import { Framewerk, FramewerkError, defineService, defineHandler } from '../index.ts'

console.log('🧪 Testing Framewerk namespace...\n')

// Test namespace structure
console.log('✅ Framewerk namespace exists:', typeof Framewerk === 'object')
console.log('✅ Error namespace exists:', typeof Framewerk.Error === 'object')
console.log('✅ Registry class exists:', typeof Framewerk.Registry === 'function')
console.log('✅ Inspector class exists:', typeof Framewerk.Inspector === 'function')
console.log('✅ Testing namespace exists:', typeof Framewerk.Testing === 'object')

// Test error creation with namespace
try {
  class MyError extends Framewerk.Error.tagged('MyError') {
    constructor(message: string) {
      super(message)
    }
  }
  const error = new MyError('Custom error with tag')
  console.log('✅ Namespace error creation:', error._tag === 'MyError')
} catch (e) {
  console.log('❌ Namespace error creation failed:', e)
}

// Test error creation with named export
try {
  class MyError2 extends FramewerkError.tagged('MyError2') {
    constructor(message: string) {
      super(message)
    }
  }
  const error2 = new MyError2('Custom error with tag')
  console.log('✅ Named export error creation:', error2._tag === 'MyError2')
} catch (e) {
  console.log('❌ Named export error creation failed:', e)
}

// Test service definition with namespace
try {
  const MyService = Framewerk.defineService('MyService')
  console.log('✅ Namespace service definition works')
} catch (e) {
  console.log('❌ Namespace service definition failed:', e)
}

// Test service definition with named export
try {
  const MyService2 = defineService('MyService2')
  console.log('✅ Named export service definition works')
} catch (e) {
  console.log('❌ Named export service definition failed:', e)
}

// Test handler definition with namespace
try {
  const MyHandler = Framewerk.defineHandler('test-handler', 'Test handler')
  console.log('✅ Namespace handler definition works')
} catch (e) {
  console.log('❌ Namespace handler definition failed:', e)
}

// Test handler definition with named export
try {
  const MyHandler2 = defineHandler('test-handler-2', 'Test handler 2')
  console.log('✅ Named export handler definition works')
} catch (e) {
  console.log('❌ Named export handler definition failed:', e)
}

console.log('\n🎉 All basic namespace tests completed!')
