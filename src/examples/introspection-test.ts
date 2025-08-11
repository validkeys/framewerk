import { z } from 'zod'
import { defineService, HandlerDefinition } from '../service'
import { ServiceInspector, ServiceRegistry } from '../introspection'
import { ok } from 'neverthrow'

// Example schemas for testing
const GetUserRequest = z.object({
  id: z.string()
})

const User = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
})

const ListUsersRequest = z.object({
  page: z.number().optional(),
  limit: z.number().optional()
})

const UserList = z.object({
  users: z.array(User),
  total: z.number(),
  page: z.number()
})

// Test context type
interface AppContext {
  userId: string
  traceId: string
  database: {
    findUser: (id: string) => Promise<{ id: string; name: string; email: string }>
    listUsers: (page: number, limit: number) => Promise<{ users: any[]; total: number }>
  }
}

// Type the handler functions properly
const getUserHandler: HandlerDefinition<
  z.infer<typeof GetUserRequest>,
  z.infer<typeof User>,
  Error,
  AppContext
> = async (input, _options, _ctx) => {
  return ok({
    id: input.id,
    name: 'John Doe',
    email: 'john@example.com'
  })
}

const listUsersHandler: HandlerDefinition<
  z.infer<typeof ListUsersRequest>,
  z.infer<typeof UserList>,
  Error,
  AppContext
> = async (input, _options, _ctx) => {
  const page = input.page || 1
  
  return ok({
    users: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
    ],
    total: 2,
    page
  })
}

const updateUserHandler: HandlerDefinition<
  { id: string; name?: string; email?: string },
  z.infer<typeof User>,
  Error,
  AppContext
> = async (input, _options, _ctx) => {
  return ok({
    id: input.id,
    name: input.name || 'Updated Name',
    email: input.email || 'updated@example.com'
  })
}

// Create test service
const userService = defineService("UserService")
  .withServiceDependencies<AppContext>()
  .addHandler('getUser', getUserHandler)
  .addHandler('listUsers', listUsersHandler)
  .addHandler('updateUser', updateUserHandler)
  .build()

// Create order handler
const createOrderHandler: HandlerDefinition<
  {
    userId: string
    items: Array<{ productId: string; quantity: number }>
  },
  { id: string; userId: string; total: number },
  Error,
  AppContext
> = async (input, _options, _ctx) => {
  return ok({
    id: 'order-123',
    userId: input.userId,
    total: 99.99
  })
}

// Create another service for testing
const orderService = defineService("OrderService")
  .withServiceDependencies<AppContext>()
  .addHandler('createOrder', createOrderHandler)
  .build()

// Test introspection functionality
console.log('🔍 Testing Framewerk Introspection System\n')

// Test 1: Service inspection
console.log('=== Service Inspection ===')
const userInspector = new ServiceInspector(userService)
const userMetadata = userInspector.getEnhancedMetadata()

console.log('Service metadata:')
console.log(`- Name: ${userMetadata.name}`)
console.log(`- Version: ${userMetadata.version}`)
console.log(`- Tags: ${userMetadata.tags.join(', ')}`)
console.log(`- Handlers: ${Object.keys(userMetadata.handlers).join(', ')}`)
console.log(`- Dependency Types: ${userMetadata.dependencyTypes.join(', ')}`)

// Test 2: Handler discovery
console.log('\n=== Handler Discovery ===')
const handlerDiscovery = userInspector.discoverHandlers()

handlerDiscovery.forEach(({ name, metadata }) => {
  console.log(`\nHandler: ${name}`)
  console.log(`- Description: ${metadata.description || 'No description'}`)
  if (metadata.performance) {
    console.log(`- Estimated Time: ${metadata.performance.estimated_ms || 'unknown'}ms`)
    console.log(`- Cacheable: ${metadata.performance.cacheable || false}`)
    console.log(`- Idempotent: ${metadata.performance.idempotent || false}`)
  }
  console.log(`- Tags: ${metadata.tags?.join(', ') || 'none'}`)
})

// Test 3: Schema extraction
console.log('\n=== Schema Extraction ===')
const schemas = userInspector.extractSchemas()
const schemaCount = Object.keys(schemas).length
console.log(`Found ${schemaCount} unique schemas:`)
Object.entries(schemas).forEach(([name, schema]) => {
  console.log(`- ${name}: ${schema.type}`)
})

// Test 4: OpenAPI generation
console.log('\n=== OpenAPI Generation ===')
const openApiSpec = userInspector.generateOpenAPI()

console.log('Generated OpenAPI spec:')
console.log(`- OpenAPI Version: ${openApiSpec.openapi}`)
console.log(`- Title: ${openApiSpec.info.title}`)
console.log(`- Version: ${openApiSpec.info.version}`)
console.log(`- Paths: ${Object.keys(openApiSpec.paths).length}`)
console.log(`- Components: ${Object.keys(openApiSpec.components?.schemas || {}).length} schemas`)

// Display sample path
const firstPath = Object.keys(openApiSpec.paths)[0]
if (firstPath) {
  console.log(`\nSample path (${firstPath}):`)
  const pathData = openApiSpec.paths[firstPath]
  if (pathData && typeof pathData === 'object') {
    console.log(`- Methods available: ${Object.keys(pathData).join(', ')}`)
  }
}

// Test 5: Service Registry
console.log('\n=== Service Registry ===')
const registry = new ServiceRegistry()

// Register services
registry.register(userService)
registry.register(orderService)

// Test discovery
const discovery = registry.discover()
console.log(`Services in registry: ${discovery.services.map(s => s.name).join(', ')}`)

console.log(`\nRegistry Summary:`)
console.log(`- Total services: ${discovery.services.length}`)
console.log(`- Total handlers: ${discovery.handlers.length}`)

// Test 6: Combined OpenAPI
console.log('\n=== Combined OpenAPI Generation ===')
const combinedSpec = registry.generateCombinedOpenAPI()

console.log('Combined OpenAPI spec:')
console.log(`- Title: ${combinedSpec.info.title}`)
console.log(`- Total paths: ${Object.keys(combinedSpec.paths).length}`)
console.log(`- Total schemas: ${Object.keys(combinedSpec.components?.schemas || {}).length}`)

// Test 7: Service lookup
console.log('\n=== Service Lookup ===')
const userServiceFromRegistry = registry.getService('UserService')
if (userServiceFromRegistry) {
  const inspector = registry.getInspector('UserService')
  if (inspector) {
    const metadata = inspector.getEnhancedMetadata()
    console.log(`Retrieved service '${metadata.name}' with ${Object.keys(metadata.handlers).length} handlers`)
  }
}

// Test 8: Performance insights
console.log('\n=== Performance Metrics ===')
const performanceMetrics = userInspector.extractPerformanceMetrics()
console.log('Performance metrics:')
Object.entries(performanceMetrics).forEach(([name, metric]) => {
  console.log(`- ${name}: avg ${metric.avgExecutionMs}ms, ${metric.totalInvocations} invocations, ${(metric.errorRate * 100).toFixed(1)}% error rate`)
})

console.log('\n✅ Introspection system test completed successfully!')
