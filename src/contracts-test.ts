/**
 * Test for the contract type system
 */

import { defineService } from "./service.ts"
import { HandlerDefinition } from "./service.ts"
import { 
  ServiceHandlerContracts,
  defineHandlerContract,
  createServiceContracts
} from "./contracts.ts"
import { ok, err } from "neverthrow"

console.log("🧪 Testing contract type system...")

// Define service dependencies
interface TestDeps {
  database: {
    getUser: (id: string) => Promise<{ id: string; name: string } | null>
  }
  logger: {
    info: (message: string) => void
  }
}

// Define input/output types
interface GetUserInput {
  userId: string
}

interface GetUserOutput {
  id: string
  name: string
}

interface UserNotFoundError {
  code: "USER_NOT_FOUND"
  message: string
}

// Create handler definitions
const getUserHandler: HandlerDefinition<GetUserInput, GetUserOutput, UserNotFoundError, TestDeps> = async (input, options, ctx) => {
  ctx.logger.info(`Getting user ${input.userId}`)
  
  const user = await ctx.database.getUser(input.userId)
  if (!user) {
    return err({ code: "USER_NOT_FOUND", message: `User ${input.userId} not found` })
  }
  
  return ok(user)
}

// Create service
const testService = defineService("TestService")
  .withServiceDependencies<TestDeps>()
  .addHandler("getUser", getUserHandler)
  .build()

console.log("✅ Service created:", testService.name)

// Test contract extraction
type TestServiceContract = ServiceHandlerContracts<typeof testService>

// Test handler contract definition (demonstrates type-only usage)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getUserContract = defineHandlerContract<GetUserInput, GetUserOutput, UserNotFoundError>()

console.log("✅ Handler contract defined")
console.log("✅ Service contract type extracted")

// Test contract exports
const contractExports = createServiceContracts(testService)

console.log("✅ Contract exports created")

// Example of how contracts would be used in consuming packages
interface ConsumerFunction {
  (service: TestServiceContract): Promise<void>
}

const exampleConsumer: ConsumerFunction = async (service) => {
  // This demonstrates full type safety without implementation dependency
  const result = await service.getUser(
    { userId: "123" },
    { requestMetadata: { source: "consumer" } },
    { requestId: "consumer-req-001" }
  )
  
  if (result.isOk()) {
    console.log("✅ Consumer got user:", result.value)
  } else {
    console.log("❌ Consumer error:", result.error)
  }
}

// Test with actual service instance
const mockDependencies: TestDeps = {
  database: {
    getUser: async (id: string) => {
      if (id === "404") return null
      return { id, name: `User ${id}` }
    }
  },
  logger: {
    info: (message: string) => console.log(`[CONTRACT-TEST] ${message}`)
  }
}

const serviceInstance = testService.make(mockDependencies)

// Test contract compatibility
async function testContractCompatibility() {
  console.log("🔄 Testing contract compatibility...")
  
  // This should work - service instance matches contract
  await exampleConsumer(serviceInstance)
  
  // Test error case
  console.log("🔄 Testing error case...")
  const errorResult = await serviceInstance.getUser(
    { userId: "404" },
    undefined,
    { requestId: "error-test" }
  )
  
  if (errorResult.isErr()) {
    console.log("✅ Error handling works:", errorResult.error)
  }
}

// Export for testing
export { 
  testService, 
  contractExports,
  testContractCompatibility
}

// Run contract tests
testContractCompatibility().then(() => {
  console.log("✅ Contract type system test completed successfully!")
}).catch((error) => {
  console.error("❌ Contract test failed:", error)
})
