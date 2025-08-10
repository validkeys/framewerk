/**
 * Example: How to use contracts in a monorepo architecture
 * 
 * This demonstrates the typical pattern for sharing service contracts
 * between packages without implementation dependencies.
 */

// ============================================================================
// EXAMPLE 1: Service Package (exports both implementation and contracts)
// ============================================================================

import { defineService } from "./service.ts"
import { HandlerDefinition } from "./service.ts"
import { ServiceHandlerContracts, createServiceContracts } from "./contracts.ts"
import { ok, err } from "neverthrow"

// Service dependencies (internal to this package)
interface UserServiceDeps {
  database: {
    findUser: (id: string) => Promise<{ id: string; name: string; email: string } | null>
    createUser: (data: { name: string; email: string }) => Promise<{ id: string; name: string; email: string }>
  }
  logger: {
    info: (message: string) => void
    error: (message: string, error?: unknown) => void
  }
}

// Public input/output types (exported for consumers)
export interface GetUserInput {
  userId: string
}

export interface CreateUserInput {
  name: string
  email: string
}

export interface UserOutput {
  id: string
  name: string
  email: string
}

export interface UserError {
  code: "USER_NOT_FOUND" | "USER_ALREADY_EXISTS" | "VALIDATION_ERROR"
  message: string
}

// Handler implementations (internal)
const getUserHandler: HandlerDefinition<GetUserInput, UserOutput, UserError, UserServiceDeps> = async (input, options, ctx) => {
  ctx.logger.info(`Fetching user ${input.userId}`)
  
  const user = await ctx.database.findUser(input.userId)
  if (!user) {
    return err({ code: "USER_NOT_FOUND", message: `User ${input.userId} not found` })
  }
  
  return ok(user)
}

const createUserHandler: HandlerDefinition<CreateUserInput, UserOutput, UserError, UserServiceDeps> = async (input, options, ctx) => {
  ctx.logger.info(`Creating user ${input.email}`)
  
  // Basic validation
  if (!input.email.includes("@")) {
    return err({ code: "VALIDATION_ERROR", message: "Invalid email format" })
  }
  
  try {
    const user = await ctx.database.createUser(input)
    return ok(user)
  } catch (error) {
    ctx.logger.error("Failed to create user", error)
    return err({ code: "USER_ALREADY_EXISTS", message: "User with this email already exists" })
  }
}

// Service definition (internal)
const userService = defineService("UserService")
  .withServiceDependencies<UserServiceDeps>()
  .addHandler("getUser", getUserHandler)
  .addHandler("createUser", createUserHandler)
  .build()

// ============================================================================
// CONTRACT EXPORTS (what other packages import)
// ============================================================================

// Extract type-only contracts
export type UserServiceContract = ServiceHandlerContracts<typeof userService>

// Alternative: explicit contract exports for better documentation
const userServiceContracts = createServiceContracts(userService)

// ============================================================================
// IMPLEMENTATION EXPORTS (for service instantiation)
// ============================================================================

// Export service factory for dependency injection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userServiceFactory = userService

// Export dependencies interface for implementers
export type { UserServiceDeps }

// ============================================================================
// EXAMPLE 2: Consumer Package (imports contracts only)
// ============================================================================

// In a separate package, you would import only the contracts:
// import type { UserServiceContract, GetUserInput, UserOutput } from '@my-org/user-service'

// Example consumer function using contracts
function createUserConsumer() {
  // This function demonstrates how consumers use service contracts
  return async function consumeUserService(service: UserServiceContract) {
    // Full type safety without implementation dependency
    
    // Get user example
    const getUserResult = await service.getUser(
      { userId: "123" },
      { requestMetadata: { source: "consumer-package" } },
      { requestId: "req-001" }
    )
    
    if (getUserResult.isOk()) {
      console.log("✅ User found:", getUserResult.value)
      return getUserResult.value
    } else {
      console.log("❌ User error:", getUserResult.error)
      throw new Error(`User service error: ${JSON.stringify(getUserResult.error)}`)
    }
  }
}

// ============================================================================
// EXAMPLE 3: Full Integration Test
// ============================================================================

async function demonstrateMonorepoUsage() {
  console.log("🏗️  Demonstrating monorepo contract usage...")
  
  // Service package: create implementation
  const mockDeps: UserServiceDeps = {
    database: {
      findUser: async (id) => {
        if (id === "123") return { id, name: "John Doe", email: "john@example.com" }
        return null
      },
      createUser: async (data) => ({ id: "456", ...data })
    },
    logger: {
      info: (msg) => console.log(`[USER-SERVICE] ${msg}`),
      error: (msg, err) => console.error(`[USER-SERVICE] ${msg}`, err)
    }
  }
  
  const serviceInstance = userService.make(mockDeps)
  
  // Consumer package: use service via contract
  const consumer = createUserConsumer()
  
  try {
    const user = await consumer(serviceInstance)
    console.log("✅ Consumer successfully used service:", user)
    
    // Test create user
    const createResult = await serviceInstance.createUser(
      { name: "Jane Doe", email: "jane@example.com" },
      undefined,
      { requestId: "create-001" }
    )
    
    if (createResult.isOk()) {
      console.log("✅ User created:", createResult.value)
    }
    
    return true
  } catch (error) {
    console.error("❌ Integration test failed:", error)
    return false
  }
}

// Export for testing
export { 
  userServiceContracts, 
  createUserConsumer, 
  demonstrateMonorepoUsage 
}

// Run demo
demonstrateMonorepoUsage().then((success) => {
  if (success) {
    console.log("✅ Monorepo contract example completed successfully!")
  }
}).catch((error) => {
  console.error("❌ Monorepo example failed:", error)
})
