# @validkeys/framewerk

A complete TypeScript toolkit for building type-safe service/action architectures with comprehensive testing utilities, introspection capabilities, and code generation support.

## Table of Contents

- [What is Framewerk?](#what-is-framewerk)
- [Design Goals](#design-goals)
- [Quick Start](#quick-start)
- [Services & Handlers](#services--handlers)
- [Testing](#testing)
- [Utilities & Type Helpers](#utilities--type-helpers)
- [Introspection & Metadata](#introspection--metadata)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)
- [Examples & Recipes](#examples--recipes)

## What is Framewerk?

Framewerk is a TypeScript-first toolkit for building scalable service architectures with:

- **Type-Safe Service Definitions**: Services are collections of handlers with shared dependencies
- **Dependency Injection**: Clean separation between business logic and dependencies
- **Contract System**: Share service interfaces across monorepo packages without implementation
- **Built-in Testing**: Comprehensive testing utilities with mocking and assertion helpers
- **Introspection**: Runtime metadata and OpenAPI generation for tooling and documentation
- **Code Generation**: Data structures designed for automatic FastifyJS routes, Postman collections, and more

Perfect for microservices, serverless functions, domain services, and modular monoliths.

## Design Goals

### 🎯 **Type Safety First**
- Complete TypeScript integration with full type inference
- Compile-time validation of service definitions and handler signatures
- Zero runtime type checking overhead

### 🔧 **Developer Experience**
- Intuitive builder patterns for services and handlers
- Rich IDE support with autocomplete and error detection
- Comprehensive testing utilities included

### 🏗️ **Architecture Patterns**
- Clean dependency injection with transparent context merging
- Service-oriented architecture with clear boundaries
- Monorepo-friendly contract system

### ⚡ **Performance & Reliability**
- Lightweight runtime with minimal overhead
- Built-in error handling with `neverthrow` Result types
- Comprehensive testing infrastructure

### 🔍 **Introspection & Tooling**
- Runtime metadata extraction for tooling
- OpenAPI 3.0 generation out of the box
- Support for automatic code generation

## Quick Start

### Installation

```bash
npm install @validkeys/framewerk neverthrow
```

### Define Handlers

Create your handlers with type-safe inputs and outputs:

```typescript
// src/handlers/index.ts
import { defineHandler } from '@validkeys/framewerk'
import { ok, err } from 'neverthrow'

interface GetUserInput {
  id: string
}

interface CreateUserInput {
  name: string
  email: string
}

interface UserOutput {
  id: string
  name: string
  email: string
  createdAt: Date
}

// Handler with database dependency
export const getUserHandler = defineHandler("getUser", "Retrieve user by ID")
  .withInput<GetUserInput>()
  .withOutput<UserOutput>()
  .handler(async (input, options, ctx) => {
    const user = await ctx.database.findUser(input.id)
    if (!user) {
      return err(new Error("User not found"))
    }
    return ok(user)
  })

export const createUserHandler = defineHandler("createUser", "Create new user")
  .withInput<CreateUserInput>()
  .withOutput<UserOutput>()
  .handler(async (input, options, ctx) => {
    const user = await ctx.database.createUser({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date()
    })
    return ok(user)
  })
```

### Define Service

Create a service that combines handlers with shared dependencies:

```typescript
// src/index.ts
import { defineService } from '@validkeys/framewerk'
import { getUserHandler, createUserHandler } from './handlers/index.ts'

interface UserServiceDependencies {
  database: {
    findUser: (id: string) => Promise<UserOutput | null>
    createUser: (user: Omit<UserOutput, 'id'>) => Promise<UserOutput>
  }
  logger: {
    info: (message: string) => void
    error: (message: string, error?: Error) => void
  }
}

export const userService = defineService("UserService")
  .withServiceDependencies<UserServiceDependencies>()
  .addHandler("getUser", getUserHandler)
  .addHandler("createUser", createUserHandler)
  .build()
```

### Use the Service

Instantiate and use your service with dependency injection:

```typescript
// In your application
import { userService } from './user-service'

// Create service instance with dependencies
const service = userService.make({
  database: new DatabaseService(),
  logger: new LoggerService()
})

// Use handlers - fully type-safe!
const result = await service.getUser({ id: "user-123" })

if (result.isOk()) {
  console.log("User:", result.value)
} else {
  console.error("Error:", result.error)
}
```

## Services & Handlers

### Services

Services are collections of handlers that share common dependencies. They provide:

- **Dependency Management**: Shared dependencies injected into all handlers
- **Type Safety**: Full TypeScript inference throughout the service definition
- **Metadata**: Rich metadata for introspection and tooling
- **Factory Pattern**: Clean instantiation with dependency injection

#### Service Definition API

```typescript
defineService(name: string)
  .withServiceDependencies<T>()    // Optional: Define shared dependencies
  .addHandler(name, handler)       // Add handlers to the service
  .build()                         // Create the service definition
```

#### Example: Complex Service

```typescript
interface OrderServiceDeps {
  database: Database
  paymentGateway: PaymentGateway
  emailService: EmailService
  logger: Logger
}

export const orderService = defineService("OrderService")
  .withServiceDependencies<OrderServiceDeps>()
  .addHandler("createOrder", createOrderHandler)
  .addHandler("processPayment", processPaymentHandler)
  .addHandler("sendConfirmation", sendConfirmationHandler)
  .addHandler("getOrder", getOrderHandler)
  .addHandler("cancelOrder", cancelOrderHandler)
  .build()

// Type-safe service instance
const service = orderService.make(dependencies)
```

### Handlers

Handlers are individual operations within a service. They define:

- **Input/Output Types**: Strongly typed request and response schemas
- **Business Logic**: Pure functions with dependency injection
- **Error Handling**: Built-in Result types for error management
- **Metadata**: Operation metadata for documentation and tooling

#### Handler Definition API

```typescript
defineHandler(operationId: string, description: string)
  .withInput<TInput>()             // Optional: Input type
  .withOutput<TOutput>()           // Optional: Output type
  .withError<TError>()             // Optional: Custom error type
  .handler(handlerFunction)        // Implementation
```

#### Handler Signature

All handlers follow a consistent 3-parameter signature:

```typescript
(input: TInput, options?: HandlerOptions, context: HandlerContext & ServiceDeps) => Promise<Result<TOutput, TError>>
```

- **`input`**: Request data (typed)
- **`options`**: Optional parameters (transactions, request context, etc.)
- **`context`**: Merged handler context + service dependencies

#### Example: Advanced Handler

```typescript
interface ProcessPaymentInput {
  orderId: string
  paymentMethod: 'card' | 'paypal'
  amount: number
}

interface ProcessPaymentOutput {
  transactionId: string
  status: 'completed' | 'pending' | 'failed'
  processedAt: Date
}

const processPaymentHandler = defineHandler("processPayment", "Process order payment")
  .withInput<ProcessPaymentInput>()
  .withOutput<ProcessPaymentOutput>()
  .handler(async (input, options, ctx) => {
    const { orderId, paymentMethod, amount } = input
    
    // Access service dependencies through context
    ctx.logger.info(`Processing payment for order ${orderId}`)
    
    try {
      const transaction = await ctx.paymentGateway.processPayment({
        orderId,
        method: paymentMethod,
        amount
      })
      
      await ctx.database.updateOrder(orderId, {
        paymentStatus: transaction.status,
        transactionId: transaction.id
      })
      
      return ok({
        transactionId: transaction.id,
        status: transaction.status,
        processedAt: new Date()
      })
    } catch (error) {
      ctx.logger.error("Payment processing failed", error)
      return err(new PaymentError("Payment processing failed", error))
    }
  })
```

## Testing

Framewerk includes comprehensive testing utilities that make testing services and handlers straightforward and reliable.

### Service Test Harness

The Service Test Harness provides a complete testing environment for your services:

```typescript
import { createServiceTestHarness, MockFactories } from '@validkeys/framewerk'
import { userService } from '../src/index'

describe('UserService', () => {
  let testHarness: ServiceTestHarness<typeof userService, UserServiceDependencies>
  
  beforeEach(() => {
    const mockDeps = {
      database: MockFactories.database(),
      logger: MockFactories.logger()
    }
    
    testHarness = createServiceTestHarness(userService, mockDeps)
  })
  
  it('should get user successfully', async () => {
    // Setup mock
    testHarness.mockDependencies.database.findUser.mockResolvedValue({
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date()
    })
    
    // Execute handler
    const result = await testHarness.callHandler('getUser', { id: 'user-123' })
    
    // Assert result
    const user = ResultTestUtils.expectOk(result)
    expect(user.name).toBe('John Doe')
    
    // Assert mock calls
    testHarness.assertMockCalled('database.findUser', 1)
    expect(testHarness.mockDependencies.database.findUser).toHaveBeenCalledWith('user-123')
  })
})
```

### Mock Factories

Pre-built mock factories for common dependencies:

```typescript
import { MockFactories } from '@validkeys/framewerk'

const mocks = {
  database: MockFactories.database(),        // CRUD operations
  logger: MockFactories.logger(),            // Logging methods
  httpClient: MockFactories.httpClient(),    // HTTP requests
  cache: MockFactories.cache(),              // Cache operations
  eventEmitter: MockFactories.eventEmitter() // Event handling
}
```

### Result Testing Utilities

Specialized utilities for testing neverthrow Result types:

```typescript
import { ResultTestUtils } from '@validkeys/framewerk'

// Test successful results
const user = ResultTestUtils.expectOk(result)
expect(user.id).toBe('user-123')

// Test error results
const error = ResultTestUtils.expectErr(result)
expect(error.message).toContain('not found')

// Test specific values
ResultTestUtils.expectOkValue(result, expectedUser)
ResultTestUtils.expectErrValue(result, expectedError)
```

### Test Data Builders

Flexible builders for creating test data:

```typescript
import { createTestDataBuilder } from '@validkeys/framewerk'

const userBuilder = createTestDataBuilder({
  id: 'default-id',
  name: 'Default User',
  email: 'default@example.com',
  createdAt: new Date()
})

// Create variations
const testUser = userBuilder
  .with('name', 'John Doe')
  .with('email', 'john@example.com')
  .build()

const users = userBuilder.buildMany(3, [
  { name: 'User 1' },
  { name: 'User 2' },
  { name: 'User 3' }
])
```

### Performance Testing

Built-in performance testing utilities:

```typescript
import { PerformanceTestUtils } from '@validkeys/framewerk'

// Measure handler performance
const { avgTime, maxTime } = await PerformanceTestUtils.measureHandlerTime(
  harness, 'getUser', { id: 'user-123' }, 10
)

// Assert performance requirements
await PerformanceTestUtils.expectHandlerPerformance(
  harness, 'getUser', { id: 'user-123' }, 100 // max 100ms
)
```

### Integration Testing

Utilities for testing service interactions:

```typescript
import { IntegrationTestUtils } from '@validkeys/framewerk'

// Test service workflows
await IntegrationTestUtils.testServiceWorkflow(
  userService,
  [
    { handler: 'createUser', input: { name: 'John', email: 'john@example.com' } },
    { handler: 'getUser', input: { id: 'extracted-from-previous' } }
  ],
  dependencies
)
```

## Utilities & Type Helpers

### Contract System

Share service interfaces across monorepo packages without implementation dependencies:

```typescript
// packages/user-service-contracts/index.ts
import { createServiceContracts } from '@validkeys/framewerk'
import type { userService } from '@my-org/user-service'

export const {
  ServiceContract,
  HandlerContracts,
  DependencyContract
} = createServiceContracts(userService)

// Export individual handler contracts
export type GetUserContract = typeof userService.handlers.getUser
export type CreateUserContract = typeof userService.handlers.createUser
```

```typescript
// packages/order-service/src/index.ts
import type { ServiceContract } from '@my-org/user-service-contracts'

interface OrderServiceDeps {
  userService: ServiceContract  // Type-safe without implementation
  database: Database
}
```

### Type Utilities

Helper types for working with services and handlers:

```typescript
import type { 
  ServiceDefinition,
  HandlerDefinition,
  ServiceMetadata,
  HandlerMetadata
} from '@validkeys/framewerk'

// Extract types from service
type UserServiceType = typeof userService
type UserHandlers = UserServiceType['handlers']
type UserDependencies = UserServiceType['dependencies']

// Extract handler input/output types
type GetUserInput = Parameters<UserHandlers['getUser']>[0]
type GetUserOutput = Awaited<ReturnType<UserHandlers['getUser']>>
```

### Error Types

Comprehensive error handling utilities:

```typescript
import { AbstractError, ErrorCode } from '@validkeys/framewerk'

// Create custom error classes
class UserNotFoundError extends AbstractError {
  constructor(userId: string) {
    super({
      code: ErrorCode.NOT_FOUND,
      message: `User not found: ${userId}`,
      details: { userId }
    })
  }
}

// Use in handlers
return err(new UserNotFoundError(input.id))
```

## Introspection & Metadata

Framewerk provides powerful introspection capabilities for tooling, documentation, and code generation.

### Service Inspector

Extract comprehensive metadata from services:

```typescript
import { createServiceInspector } from '@validkeys/framewerk'

const inspector = createServiceInspector(userService)

// Get enhanced metadata
const metadata = inspector.getEnhancedMetadata()
console.log(metadata.name)        // "UserService"
console.log(metadata.handlers)    // Handler definitions
console.log(metadata.version)     // Service version

// Discover handlers
const handlers = inspector.discoverHandlers()
handlers.forEach(({ name, metadata }) => {
  console.log(`Handler: ${name}`)
  console.log(`Description: ${metadata.description}`)
})

// Extract schemas for codegen
const schemas = inspector.extractSchemas()
console.log(schemas.getUserInput)   // Input schema metadata
console.log(schemas.getUserOutput)  // Output schema metadata
```

### OpenAPI Generation

Generate OpenAPI 3.0 specifications automatically:

```typescript
// Single service OpenAPI
const openApi = inspector.generateOpenAPI()

// Combined services with registry
import { createServiceRegistry } from '@validkeys/framewerk'

const registry = createServiceRegistry()
registry.register(userService)
registry.register(orderService)

const combinedApi = registry.generateCombinedOpenAPI()
```

### Service Registry

Manage multiple services for discovery and tooling:

```typescript
const registry = createServiceRegistry()
registry.register(userService)
registry.register(orderService)
registry.register(paymentService)

// Discover all services
const discovery = registry.discover()
console.log(`Found ${discovery.services.length} services`)
console.log(`Total handlers: ${discovery.handlers.length}`)

// Service dependency graph
discovery.dependencies.forEach(({ service, dependencies }) => {
  console.log(`${service} depends on:`, dependencies)
})
```

### Metadata Utilities

Helper functions for working with metadata:

```typescript
import { MetadataUtils } from '@validkeys/framewerk'

// Merge metadata
const enhanced = MetadataUtils.mergeMetadata(baseMetadata, {
  tags: ['v2', 'experimental'],
  custom: { feature: 'new-feature' }
})

// Filter handlers by tags
const adminHandlers = MetadataUtils.filterHandlersByTag(metadata, 'admin')

// Find deprecated handlers
const deprecated = MetadataUtils.findDeprecatedHandlers(metadata)
```

## Error Handling

Framewerk uses `neverthrow` Result types for comprehensive error handling:

### Result Types

All handlers return `Result<Success, Error>` types:

```typescript
import { ok, err, Result } from 'neverthrow'

// Success case
return ok(userData)

// Error case
return err(new UserNotFoundError(userId))

// Chain operations
const result = await getUserResult
  .andThen(user => updateUserResult(user))
  .andThen(user => sendNotificationResult(user))
```

### Custom Error Classes

Create domain-specific error types:

```typescript
import { AbstractError, ErrorCode } from '@validkeys/framewerk'

class ValidationError extends AbstractError {
  constructor(field: string, value: unknown) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message: `Validation failed for field: ${field}`,
      details: { field, value }
    })
  }
}

class DatabaseError extends AbstractError {
  constructor(operation: string, cause: Error) {
    super({
      code: ErrorCode.INTERNAL_ERROR,
      message: `Database operation failed: ${operation}`,
      cause
    })
  }
}
```

### Error Handling Patterns

```typescript
const processOrderHandler = defineHandler("processOrder", "Process order")
  .handler(async (input, options, ctx) => {
    // Validate input
    const validation = validateOrderInput(input)
    if (validation.isErr()) {
      return err(validation.error)
    }
    
    // Chain database operations
    return await ctx.database.createOrder(input)
      .andThen(order => ctx.paymentService.processPayment(order))
      .andThen(payment => ctx.fulfillmentService.scheduleShipment(payment))
      .mapErr(error => new OrderProcessingError("Failed to process order", error))
  })
```

## Advanced Patterns

### Monorepo Architecture

Organize services across packages with contract sharing:

```
packages/
├── core-contracts/           # Shared types and contracts
├── user-service/             # User service implementation
├── user-service-contracts/   # User service contracts only
├── order-service/            # Order service (depends on user contracts)
└── api-gateway/              # Gateway (depends on all contracts)
```

### Dependency Injection Patterns

#### Simple Dependencies
```typescript
interface UserServiceDeps {
  database: UserRepository
  logger: Logger
}
```

#### Advanced Dependencies with Configuration
```typescript
interface UserServiceDeps {
  database: UserRepository
  logger: Logger
  config: {
    encryption: { enabled: boolean; algorithm: string }
    validation: { strict: boolean }
  }
  external: {
    authService: AuthServiceContract
    emailService: EmailServiceContract
  }
}
```

#### Conditional Dependencies
```typescript
interface UserServiceDeps {
  database: UserRepository
  logger: Logger
  cache?: CacheService  // Optional dependency
  metrics?: MetricsCollector  // Optional dependency
}
```

### Service Composition

Compose services together for complex workflows:

```typescript
interface OrderWorkflowDeps {
  userService: UserServiceContract
  inventoryService: InventoryServiceContract
  paymentService: PaymentServiceContract
  notificationService: NotificationServiceContract
}

const orderWorkflowService = defineService("OrderWorkflow")
  .withServiceDependencies<OrderWorkflowDeps>()
  .addHandler("completeOrder", completeOrderHandler)
  .build()

const completeOrderHandler = defineHandler("completeOrder", "Complete order workflow")
  .handler(async (input, options, ctx) => {
    return await ctx.userService.getUser({ id: input.userId })
      .andThen(user => ctx.inventoryService.reserveItems(input.items))
      .andThen(reservation => ctx.paymentService.processPayment({
        userId: user.id,
        amount: reservation.totalAmount
      }))
      .andThen(payment => ctx.notificationService.sendConfirmation({
        userId: user.id,
        orderId: payment.orderId
      }))
  })
```

### Code Generation Integration

Use metadata for automatic code generation:

```typescript
// Generate FastifyJS routes
import { generateFastifyRoutes } from './codegen/fastify'

const routes = generateFastifyRoutes(userService)
fastify.register(routes)

// Generate client SDKs
import { generateTypeScriptClient } from './codegen/client'

const client = generateTypeScriptClient([userService, orderService])

// Generate Postman collections
import { generatePostmanCollection } from './codegen/postman'

const collection = generatePostmanCollection(registry.discover())
```

## Migration Guide

### From Plain Functions to Framewerk

#### Before: Plain Functions
```typescript
// Old approach
export async function getUser(id: string, deps: Dependencies): Promise<User | null> {
  return await deps.database.findUser(id)
}

export async function createUser(data: CreateUserData, deps: Dependencies): Promise<User> {
  return await deps.database.createUser(data)
}
```

#### After: Framewerk Handlers
```typescript
// New approach
const getUserHandler = defineHandler("getUser", "Get user by ID")
  .withInput<{ id: string }>()
  .withOutput<User>()
  .handler(async (input, options, ctx) => {
    const user = await ctx.database.findUser(input.id)
    return user ? ok(user) : err(new UserNotFoundError(input.id))
  })

const userService = defineService("UserService")
  .withServiceDependencies<Dependencies>()
  .addHandler("getUser", getUserHandler)
  .addHandler("createUser", createUserHandler)
  .build()
```

### From Express Routes to Framewerk

#### Before: Express Routes
```typescript
app.get('/users/:id', async (req, res) => {
  try {
    const user = await database.findUser(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Internal error' })
  }
})
```

#### After: Generated from Framewerk
```typescript
// Service definition (same as above)
const userService = defineService("UserService")...

// Auto-generate routes
const routes = generateFastifyRoutes(userService)
fastify.register(routes, { dependencies })
```

## API Reference

### Core Functions

#### `defineHandler(operationId, description)`
Creates a new handler builder.

**Parameters:**
- `operationId: string` - Unique identifier for the handler
- `description: string` - Human-readable description

**Returns:** `HandlerBuilder`

#### `defineService(name)`
Creates a new service builder.

**Parameters:**
- `name: string` - Service name

**Returns:** `ServiceBuilder`

### Builder Methods

#### Handler Builder
- `.withInput<T>()` - Define input type
- `.withOutput<T>()` - Define output type  
- `.withError<T>()` - Define error type
- `.handler(fn)` - Set handler implementation

#### Service Builder
- `.withServiceDependencies<T>()` - Define shared dependencies
- `.addHandler(name, handler)` - Add handler to service
- `.build()` - Create service definition

### Testing Functions

#### `createServiceTestHarness(service, dependencies)`
Creates a test harness for a service.

#### `MockFactories`
Pre-built mock factories for common dependencies.

#### `ResultTestUtils`
Utilities for testing neverthrow Result types.

### Introspection Functions

#### `createServiceInspector(service)`
Creates an inspector for service metadata.

#### `createServiceRegistry()`
Creates a registry for managing multiple services.

### Contract Functions

#### `createServiceContracts(service)`
Extracts type-only contracts from a service.

## Examples & Recipes

### E-commerce Order Processing

Complete example of an order processing service with multiple dependencies:

```typescript
// types.ts
interface OrderInput {
  userId: string
  items: Array<{ productId: string; quantity: number }>
  shippingAddress: Address
  paymentMethod: PaymentMethod
}

interface OrderOutput {
  orderId: string
  status: 'pending' | 'confirmed' | 'processing'
  total: number
  estimatedDelivery: Date
}

// dependencies.ts
interface OrderServiceDeps {
  database: {
    createOrder: (order: OrderData) => Promise<Order>
    getUser: (id: string) => Promise<User>
    getProduct: (id: string) => Promise<Product>
  }
  paymentGateway: {
    processPayment: (payment: PaymentRequest) => Promise<PaymentResult>
  }
  inventoryService: {
    checkAvailability: (items: CartItem[]) => Promise<AvailabilityResult>
    reserveItems: (items: CartItem[]) => Promise<ReservationResult>
  }
  shippingService: {
    calculateShipping: (address: Address, items: CartItem[]) => Promise<ShippingQuote>
    schedulePickup: (order: Order) => Promise<ShipmentSchedule>
  }
  notificationService: {
    sendOrderConfirmation: (order: Order, user: User) => Promise<void>
  }
  logger: Logger
}

// handlers/processOrder.ts
export const processOrderHandler = defineHandler("processOrder", "Process customer order")
  .withInput<OrderInput>()
  .withOutput<OrderOutput>()
  .handler(async (input, options, ctx) => {
    const { userId, items, shippingAddress, paymentMethod } = input
    
    ctx.logger.info(`Processing order for user ${userId}`)
    
    // Validate user
    const userResult = await ctx.database.getUser(userId)
    if (!userResult) {
      return err(new UserNotFoundError(userId))
    }
    
    // Check inventory
    const availability = await ctx.inventoryService.checkAvailability(items)
    if (!availability.allAvailable) {
      return err(new InventoryError("Some items are not available"))
    }
    
    // Calculate totals
    const products = await Promise.all(
      items.map(item => ctx.database.getProduct(item.productId))
    )
    const subtotal = calculateSubtotal(items, products)
    const shipping = await ctx.shippingService.calculateShipping(shippingAddress, items)
    const total = subtotal + shipping.cost
    
    // Process payment
    const paymentResult = await ctx.paymentGateway.processPayment({
      amount: total,
      method: paymentMethod,
      userId
    })
    
    if (paymentResult.status !== 'approved') {
      return err(new PaymentError("Payment was declined"))
    }
    
    // Reserve inventory
    const reservation = await ctx.inventoryService.reserveItems(items)
    
    // Create order
    const order = await ctx.database.createOrder({
      userId,
      items,
      shippingAddress,
      total,
      paymentId: paymentResult.transactionId,
      reservationId: reservation.id,
      status: 'confirmed'
    })
    
    // Schedule shipping
    await ctx.shippingService.schedulePickup(order)
    
    // Send confirmation
    await ctx.notificationService.sendOrderConfirmation(order, userResult)
    
    ctx.logger.info(`Order ${order.id} processed successfully`)
    
    return ok({
      orderId: order.id,
      status: order.status,
      total: order.total,
      estimatedDelivery: shipping.estimatedDelivery
    })
  })

// service.ts
export const orderService = defineService("OrderService")
  .withServiceDependencies<OrderServiceDeps>()
  .addHandler("processOrder", processOrderHandler)
  .addHandler("getOrder", getOrderHandler)
  .addHandler("cancelOrder", cancelOrderHandler)
  .build()
```

### Testing the Order Service

```typescript
// __tests__/orderService.test.ts
import { createServiceTestHarness, MockFactories, ResultTestUtils } from '@validkeys/framewerk'
import { orderService } from '../src/service'

describe('OrderService', () => {
  let harness: ServiceTestHarness<typeof orderService, OrderServiceDeps>
  
  beforeEach(() => {
    harness = createServiceTestHarness(orderService, {
      database: MockFactories.database(),
      paymentGateway: {
        processPayment: vi.fn()
      },
      inventoryService: {
        checkAvailability: vi.fn(),
        reserveItems: vi.fn()
      },
      shippingService: {
        calculateShipping: vi.fn(),
        schedulePickup: vi.fn()
      },
      notificationService: {
        sendOrderConfirmation: vi.fn()
      },
      logger: MockFactories.logger()
    })
  })
  
  it('should process order successfully', async () => {
    // Setup mocks
    harness.mockDependencies.database.getUser.mockResolvedValue(mockUser)
    harness.mockDependencies.inventoryService.checkAvailability.mockResolvedValue({
      allAvailable: true
    })
    harness.mockDependencies.paymentGateway.processPayment.mockResolvedValue({
      status: 'approved',
      transactionId: 'txn-123'
    })
    // ... setup other mocks
    
    // Execute
    const result = await harness.callHandler('processOrder', mockOrderInput)
    
    // Assert
    const order = ResultTestUtils.expectOk(result)
    expect(order.orderId).toBeDefined()
    expect(order.status).toBe('confirmed')
    
    // Verify workflow
    harness.assertMockCalled('database.getUser', 1)
    harness.assertMockCalled('inventoryService.checkAvailability', 1)
    harness.assertMockCalled('paymentGateway.processPayment', 1)
  })
})
```

This comprehensive documentation covers all aspects of Framewerk, from basic concepts to advanced patterns. The examples demonstrate real-world usage and the testing section shows how to effectively test Framewerk-based services.

---

**Package:** `@validkeys/framewerk`  
**License:** MIT  
**Repository:** [GitHub Repository URL]  
**Documentation:** [Documentation Site URL]