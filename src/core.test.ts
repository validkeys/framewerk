/**
 * @fileoverview Focused Tests for Core Framewerk Functionality
 *
 * Tests the main components with proper API usage patterns
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, err } from 'neverthrow'

// Import modules to test
import { defineService, type HandlerDefinition, type ServiceDefinition } from './service.ts'
import { ServiceInspector, ServiceRegistry } from './introspection.ts'

// Test dependencies interface
interface TestDeps {
  database: {
    findUser: (id: string) => Promise<{ id: string; name: string; email: string } | null>
    createUser: (data: { name: string; email: string }) => Promise<{ id: string; name: string; email: string }>
  }
  logger: {
    info: (message: string) => void
    error: (message: string, error?: Error) => void
  }
}

// Type alias for the built service
type TestUserService = ServiceDefinition<"UserService", TestDeps>
type TestOrderService = ServiceDefinition<"OrderService", TestDeps>

describe('Framewerk Core Functionality', () => {
  describe('Service Builder and Definition', () => {
    it('should create a service definition with correct metadata', () => {
      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        ctx.logger.info(`Getting user ${input.id}`)
        const user = await ctx.database.findUser(input.id)
        
        if (!user) {
          return err(new Error('User not found'))
        }
        
        return ok(user)
      }

      const service = defineService("UserService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .build()

      expect(service.name).toBe('UserService')
      
      const metadata = service.getMetadata()
      expect(metadata.name).toBe('UserService')
      expect(metadata.handlers).toHaveProperty('getUser')
    })

    it('should create service instances with working handlers', async () => {
      const mockDatabase = {
        findUser: vi.fn().mockResolvedValue({ id: '123', name: 'John', email: 'john@test.com' }),
        createUser: vi.fn()
      }

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      }

      const dependencies: TestDeps = {
        database: mockDatabase,
        logger: mockLogger
      }

      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        ctx.logger.info(`Getting user ${input.id}`)
        const user = await ctx.database.findUser(input.id)
        
        if (!user) {
          return err(new Error('User not found'))
        }
        
        return ok(user)
      }

      const service = defineService("UserService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .build()

      const serviceInstance = service.make(dependencies)

      // Test the handler execution
      const result = await serviceInstance.getUser(
        { id: '123' },
        { requestMetadata: { source: 'test' } },
        { requestId: 'test-req-001' }
      )

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: '123',
          name: 'John',
          email: 'john@test.com'
        })
      }

      expect(mockDatabase.findUser).toHaveBeenCalledWith('123')
      expect(mockLogger.info).toHaveBeenCalledWith('Getting user 123')
    })

    it('should handle multiple handlers in a service', () => {
      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        const user = await ctx.database.findUser(input.id)
        return user ? ok(user) : err(new Error('User not found'))
      }

      const createUserHandler: HandlerDefinition<
        { name: string; email: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        const user = await ctx.database.createUser(input)
        return ok(user)
      }

      const service = defineService("UserService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .addHandler('createUser', createUserHandler)
        .build()

      const metadata = service.getMetadata()
      expect(Object.keys(metadata.handlers)).toEqual(['getUser', 'createUser'])
    })
  })

  describe('Introspection System', () => {
    let userService: TestUserService

    beforeEach(() => {
      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        const user = await ctx.database.findUser(input.id)
        return user ? ok(user) : err(new Error('User not found'))
      }

      userService = defineService("UserService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .build()
    })

    it('should provide enhanced metadata', () => {
      const inspector = new ServiceInspector(userService)
      const metadata = inspector.getEnhancedMetadata()

      expect(metadata.name).toBe('UserService')
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.tags).toEqual([])
      expect(Object.keys(metadata.handlers)).toContain('getUser')
      expect(metadata.createdAt).toBeInstanceOf(Date)
    })

    it('should discover handlers with metadata', () => {
      const inspector = new ServiceInspector(userService)
      const handlers = inspector.discoverHandlers()

      expect(handlers).toHaveLength(1)
      expect(handlers[0].name).toBe('getUser')
      expect(handlers[0].metadata.description).toBe('Handler for getUser')
      expect(handlers[0].metadata.performance?.idempotent).toBe(true)
    })

    it('should generate OpenAPI specification', () => {
      const inspector = new ServiceInspector(userService)
      const openApi = inspector.generateOpenAPI()

      expect(openApi.openapi).toBe('3.0.0')
      expect(openApi.info.title).toBe('UserService')
      expect(openApi.info.version).toBe('1.0.0')
      expect(Object.keys(openApi.paths)).toContain('/getUser')
      
      // Check the structure of a path
      const getUserPath = openApi.paths['/getUser'] as Record<string, unknown>
      expect(getUserPath).toHaveProperty('post')
      const postMethod = getUserPath.post as Record<string, unknown>
      expect(postMethod).toHaveProperty('summary')
      expect(postMethod).toHaveProperty('tags')
    })

    it('should extract schemas (currently empty but structured)', () => {
      const inspector = new ServiceInspector(userService)
      const schemas = inspector.extractSchemas()

      // Since we don't have actual schema metadata extraction implemented,
      // this will be empty, but the structure should be correct
      expect(schemas).toEqual({})
    })
  })

  describe('Service Registry', () => {
    let userService: TestUserService
    let orderService: TestOrderService

    beforeEach(() => {
      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        const user = await ctx.database.findUser(input.id)
        return user ? ok(user) : err(new Error('User not found'))
      }

      const createOrderHandler: HandlerDefinition<
        { userId: string; total: number },
        { id: string; userId: string; total: number },
        Error,
        TestDeps
      > = async (input) => {
        return ok({
          id: 'order-123',
          userId: input.userId,
          total: input.total
        })
      }

      userService = defineService("UserService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .build()

      orderService = defineService("OrderService")
        .withServiceDependencies<TestDeps>()
        .addHandler('createOrder', createOrderHandler)
        .build()
    })

    it('should register and retrieve services', () => {
      const registry = new ServiceRegistry()
      
      registry.register(userService)
      registry.register(orderService)

      expect(registry.getService('UserService')).toBe(userService)
      expect(registry.getService('OrderService')).toBe(orderService)
      expect(registry.getService('NonexistentService')).toBeUndefined()
    })

    it('should provide service inspectors', () => {
      const registry = new ServiceRegistry()
      registry.register(userService)

      const inspector = registry.getInspector('UserService')
      expect(inspector).toBeInstanceOf(ServiceInspector)

      const metadata = inspector?.getEnhancedMetadata()
      expect(metadata?.name).toBe('UserService')
    })

    it('should discover all registered services', () => {
      const registry = new ServiceRegistry()
      registry.register(userService)
      registry.register(orderService)

      const discovery = registry.discover()

      expect(discovery.services).toHaveLength(2)
      expect(discovery.services.map(s => s.name)).toEqual(['UserService', 'OrderService'])
      expect(discovery.handlers).toHaveLength(2)
      expect(discovery.dependencies).toHaveLength(2)
    })

    it('should generate combined OpenAPI specification', () => {
      const registry = new ServiceRegistry()
      registry.register(userService)
      registry.register(orderService)

      const combinedSpec = registry.generateCombinedOpenAPI()

      expect(combinedSpec.info.title).toBe('Combined Services API')
      expect(Object.keys(combinedSpec.paths)).toEqual(['/getUser', '/createOrder'])
      expect(combinedSpec.components?.schemas).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const mockDependencies: TestDeps = {
        database: {
          findUser: vi.fn().mockResolvedValue(null), // Simulate user not found
          createUser: vi.fn()
        },
        logger: {
          info: vi.fn(),
          error: vi.fn()
        }
      }

      const getUserHandler: HandlerDefinition<
        { id: string },
        { id: string; name: string; email: string },
        Error,
        TestDeps
      > = async (input, _options, ctx) => {
        const user = await ctx.database.findUser(input.id)
        if (!user) {
          return err(new Error('User not found'))
        }
        return ok(user)
      }

      const service = defineService("ErrorService")
        .withServiceDependencies<TestDeps>()
        .addHandler('getUser', getUserHandler)
        .build()

      const serviceInstance = service.make(mockDependencies)

      const result = await serviceInstance.getUser(
        { id: '999' },
        undefined,
        { requestId: 'test-error' }
      )

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect((result.error as Error).message).toBe('User not found')
      }
    })
  })
})

describe('Testing Integration', () => {
  it('should work with vi.fn mocks', () => {
    const mockFn = vi.fn().mockReturnValue('test-value')
    
    expect(mockFn()).toBe('test-value')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should handle async operations', async () => {
    const asyncMock = vi.fn().mockResolvedValue({ success: true })
    
    const result = await asyncMock()
    expect(result).toEqual({ success: true })
  })

  it('should track mock calls with arguments', () => {
    const mockDb = {
      findUser: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
    }

    mockDb.findUser('123')
    mockDb.findUser('456')

    expect(mockDb.findUser).toHaveBeenCalledTimes(2)
    expect(mockDb.findUser).toHaveBeenCalledWith('123')
    expect(mockDb.findUser).toHaveBeenCalledWith('456')
  })
})
