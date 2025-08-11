/**
 * Basic test for the service builder system
 */

console.log("Starting service test import...")

import { defineService } from "./service.ts"
import { HandlerDefinition } from "./service.ts"
import { ok } from "neverthrow"

console.log("Imports completed")

// Test types
interface TestDeps {
  database: {
    getUser: (id: string) => Promise<{ id: string; name: string }>
  }
  logger: {
    info: (message: string) => void
  }
}

interface GetUserInput {
  userId: string
}

interface GetUserOutput {
  id: string
  name: string
}

console.log("Creating handler...")

// Mock handler definition
const getUserHandler: HandlerDefinition<GetUserInput, GetUserOutput, Error, TestDeps> = async (input, options, ctx) => {
  // ctx should have both HandlerContext and TestDeps merged
  ctx.logger.info(`Getting user ${input.userId}`)
  
  const user = await ctx.database.getUser(input.userId)
  return ok(user)
}

console.log("Creating service definition...")

// Test the service builder
const testService = defineService("TestService")
  .withServiceDependencies<TestDeps>()
  .addHandler("getUser", getUserHandler)
  .build()

console.log("Service created:", testService.name)

// Test service instantiation
const mockDependencies: TestDeps = {
  database: {
    getUser: async (id: string) => ({ id, name: `User ${id}` })
  },
  logger: {
    info: (message: string) => console.log(`[TEST] ${message}`)
  }
}

console.log("Creating service instance...")

// Create service instance
const serviceInstance = testService.make(mockDependencies)

console.log("Service instance created. Running test...")

// Test handler execution
async function testServiceUsage() {
  console.log("Calling service handler...")
  const result = await serviceInstance.getUser(
    { userId: "123" },
    { requestMetadata: { source: "test" } },
    { requestId: "test-req-001" }
  )
  
  console.log("Service test result:", result)
  return result
}

// Export for testing
export { testService, testServiceUsage }

// Run the test
console.log("🚀 Testing service builder system...")
  
console.log("✅ Service definition created:", testService.name)
console.log("✅ Service metadata:", testService.getMetadata())

console.log("✅ Service instance created")
console.log("✅ Available handlers:", Object.keys(serviceInstance))

testServiceUsage().then(() => {
  console.log("✅ Service test completed successfully!")
}).catch((error) => {
  console.error("❌ Service test failed:", error)
})
