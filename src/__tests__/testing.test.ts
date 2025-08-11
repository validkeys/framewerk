/**
 * @fileoverview Testing Utilities Demo and Tests
 *
 * Demonstrates the testing utilities in action with realistic examples
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { ok, err } from 'neverthrow'

// Import modules to test
import { defineService, type HandlerDefinition, type ServiceDefinition } from '../service'
import { ServiceInspector } from '../introspection'
import { createServiceTestHarness, ResultTestUtils, PerformanceTestUtils } from '../testing'

// Mock factories for testing (moved from testing.ts)
const MockFactories = {
  database: () => ({
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listUsers: vi.fn(),
    findByEmail: vi.fn(),
    exists: vi.fn(),
    count: vi.fn(),
    transaction: vi.fn()
  }),

  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn()
    })
  }),

  cache: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn()
  })
}

// Test data builder (moved from testing.ts)
class TestDataBuilder<T> {
  private data: Partial<T> = {}

  constructor(private readonly defaults: T) {}

  with<K extends keyof T>(field: K, value: T[K]): TestDataBuilder<T> {
    const newBuilder = new TestDataBuilder(this.defaults)
    newBuilder.data = { ...this.data, [field]: value }
    return newBuilder
  }

  withMany(values: Partial<T>): TestDataBuilder<T> {
    const newBuilder = new TestDataBuilder(this.defaults)
    newBuilder.data = { ...this.data, ...values }
    return newBuilder
  }

  build(): T {
    return { ...this.defaults, ...this.data }
  }

  buildMany(count: number, variations: Partial<T>[] = []): T[] {
    const results: T[] = []
    for (let i = 0; i < count; i++) {
      const variation = variations[i] || {}
      results.push({ ...this.defaults, ...this.data, ...variation })
    }
    return results
  }
}

function createTestDataBuilder<T>(defaults: T): TestDataBuilder<T> {
  return new TestDataBuilder(defaults)
}

// Test fixtures (moved from testing.ts)
const TestFixtures = {
  user: createTestDataBuilder({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  }),

  order: createTestDataBuilder({
    id: 'order-123',
    userId: 'user-123',
    total: 100.00,
    status: 'pending' as const,
    items: [],
    createdAt: new Date('2024-01-01T00:00:00Z')
  }),

  errors: {
    notFound: (entityType: string) => new Error(`${entityType} not found`),
    validation: (field: string) => new Error(`Validation failed for ${field}`),
    unauthorized: () => new Error('Unauthorized access'),
    serverError: (message?: string) => new Error(message || 'Internal server error')
  },

  responses: {
    success: <T>(data: T) => ok(data),
    error: (error: Error) => err(error),
    paginated: <T>(items: T[], page: number = 1, pageSize: number = 10) => ok({
      data: items,
      pagination: {
        page,
        pageSize,
        total: items.length,
        totalPages: Math.ceil(items.length / pageSize)
      }
    })
  }
}

// Test dependencies interface
interface UserServiceDeps extends Record<string, unknown> {
  database: {
    findUser: (id: string) => Promise<{ id: string; name: string; email: string } | null>
    createUser: (data: { name: string; email: string }) => Promise<{ id: string; name: string; email: string }>
    updateUser: (id: string, data: Partial<{ name: string; email: string }>) => Promise<{ id: string; name: string; email: string }>
  }
  logger: {
    info: (message: string) => void
    error: (message: string, error?: Error) => void
    warn: (message: string) => void
  }
  cache: {
    get: (key: string) => Promise<unknown | null>
    set: (key: string, value: unknown, ttl?: number) => Promise<void>
  }
}

// Type for mocked dependencies
type MockedUserServiceDeps = {
  database: {
    findUser: MockedFunction<(id: string) => Promise<{ id: string; name: string; email: string } | null>>
    createUser: MockedFunction<(data: { name: string; email: string }) => Promise<{ id: string; name: string; email: string }>>
    updateUser: MockedFunction<(id: string, data: Partial<{ name: string; email: string }>) => Promise<{ id: string; name: string; email: string }>>
  }
  logger: {
    info: MockedFunction<(message: string) => void>
    error: MockedFunction<(message: string, error?: Error) => void>
    warn: MockedFunction<(message: string) => void>
  }
  cache: {
    get: MockedFunction<(key: string) => Promise<unknown | null>>
    set: MockedFunction<(key: string, value: unknown, ttl?: number) => Promise<void>>
  }
} & Record<string, unknown>

describe('Testing Utilities Demo', () => {
  let userService: ServiceDefinition<string, UserServiceDeps>
  let mockDeps: MockedUserServiceDeps

  beforeEach(() => {
    // Create comprehensive mock dependencies using the testing utilities
    mockDeps = {
      database: {
        findUser: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn()
      },
      logger: MockFactories.logger(),
      cache: MockFactories.cache()
    }

    // Define handlers for the service
    const getUserHandler: HandlerDefinition<
      { id: string },
      { id: string; name: string; email: string },
      Error,
      UserServiceDeps
    > = async (input, _options, ctx) => {
      ctx.logger.info(`Getting user ${input.id}`)
      
      // Check cache first
      const cached = await ctx.cache.get(`user:${input.id}`)
      if (cached) {
        return ok(cached as { id: string; name: string; email: string })
      }

      const user = await ctx.database.findUser(input.id)
      if (!user) {
        ctx.logger.error(`User ${input.id} not found`)
        return err(new Error('User not found'))
      }

      // Cache the result
      await ctx.cache.set(`user:${input.id}`, user, 300)
      
      return ok(user)
    }

    const createUserHandler: HandlerDefinition<
      { name: string; email: string },
      { id: string; name: string; email: string },
      Error,
      UserServiceDeps
    > = async (input, _options, ctx) => {
      ctx.logger.info(`Creating user ${input.email}`)
      
      try {
        const user = await ctx.database.createUser(input)
        ctx.logger.info(`User created with ID ${user.id}`)
        
        // Cache the new user
        await ctx.cache.set(`user:${user.id}`, user, 300)
        
        return ok(user)
      } catch (error) {
        ctx.logger.error('Failed to create user', error as Error)
        return err(new Error('Failed to create user'))
      }
    }

    const updateUserHandler: HandlerDefinition<
      { id: string; name?: string; email?: string },
      { id: string; name: string; email: string },
      Error,
      UserServiceDeps
    > = async (input, _options, ctx) => {
      ctx.logger.info(`Updating user ${input.id}`)
      
      try {
        const user = await ctx.database.updateUser(input.id, {
          name: input.name,
          email: input.email
        })
        
        // Invalidate cache
        await ctx.cache.set(`user:${input.id}`, user, 300)
        
        return ok(user)
      } catch (error) {
        ctx.logger.error(`Failed to update user ${input.id}`, error as Error)
        return err(new Error('Failed to update user'))
      }
    }

    // Build the service
    userService = defineService("UserService")
      .withServiceDependencies<UserServiceDeps>()
      .addHandler('getUser', getUserHandler)
      .addHandler('createUser', createUserHandler)
      .addHandler('updateUser', updateUserHandler)
      .build()
  })

  describe('Service Test Harness', () => {
    it('should create a working test harness', async () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      // The service instance is the handler object, not the service definition
      expect(testHarness.service).toBeDefined()
      expect(Object.keys(testHarness.service)).toContain('getUser')
      expect(testHarness.mockDependencies).toBe(mockDeps)
    })

    it('should execute handlers through the test harness', async () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      // Mock the database to return a user
      mockDeps.database.findUser.mockResolvedValue({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      })

      // Mock cache to return null (cache miss)
      mockDeps.cache.get.mockResolvedValue(null)

      const result = await testHarness.callHandler('getUser', { id: '123' })

      // Use our Result testing utilities
      const user = ResultTestUtils.expectOk(result)
      expect(user).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      })

      // Assert mock calls
      expect(mockDeps.database.findUser).toHaveBeenCalledTimes(1)
      expect(mockDeps.cache.get).toHaveBeenCalledTimes(1)
      expect(mockDeps.cache.set).toHaveBeenCalledTimes(1)
      expect(mockDeps.logger.info).toHaveBeenCalledTimes(1)
    })

    it('should handle error scenarios', async () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      // Mock database to return null (user not found)
      mockDeps.database.findUser.mockResolvedValue(null)
      mockDeps.cache.get.mockResolvedValue(null)

      const result = await testHarness.callHandler('getUser', { id: '999' })

      const error = ResultTestUtils.expectErr(result)
      expect((error as Error).message).toBe('User not found')

      // Assert error was logged
      expect(mockDeps.logger.error).toHaveBeenCalledTimes(1)
    })

    it('should test cache hit scenario', async () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      const cachedUser = {
        id: '123',
        name: 'Cached User',
        email: 'cached@example.com'
      }

      // Mock cache to return cached user
      mockDeps.cache.get.mockResolvedValue(cachedUser)

      const result = await testHarness.callHandler('getUser', { id: '123' })

      const user = ResultTestUtils.expectOk(result)
      expect(user).toEqual(cachedUser)

      // Database should not be called
      expect(mockDeps.database.findUser).not.toHaveBeenCalled()
      
      // But cache should be checked
      expect(mockDeps.cache.get).toHaveBeenCalledTimes(1)
    })

    it('should test createUser handler', async () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      const newUser = {
        id: 'new-123',
        name: 'New User',
        email: 'new@example.com'
      }

      mockDeps.database.createUser.mockResolvedValue(newUser)

      const result = await testHarness.callHandler('createUser', {
        name: 'New User',
        email: 'new@example.com'
      })

      expect(ResultTestUtils.isOkValue(result, newUser)).toBe(true)

      // Verify all expected calls
      expect(mockDeps.database.createUser).toHaveBeenCalledTimes(1)
      expect(mockDeps.cache.set).toHaveBeenCalledTimes(1)
      expect(mockDeps.logger.info).toHaveBeenCalledTimes(2) // One for start, one for success
    })

    it('should reset mocks between tests', () => {
      const testHarness = createServiceTestHarness(userService, mockDeps)
      
      // Make some calls
      mockDeps.logger.info('test message')
      mockDeps.database.findUser('123')

      // Verify calls were made
      expect(mockDeps.logger.info).toHaveBeenCalledTimes(1)
      expect(mockDeps.database.findUser).toHaveBeenCalledTimes(1)

      // Reset mocks
      vi.clearAllMocks()

      // Verify calls were reset
      expect(mockDeps.logger.info).toHaveBeenCalledTimes(0)
      expect(mockDeps.database.findUser).toHaveBeenCalledTimes(0)
    })
  })

  describe('Test Fixtures and Builders', () => {
    it('should use test data builders', () => {
      const user = TestFixtures.user
        .with('name', 'Custom User')
        .with('email', 'custom@example.com')
        .build()

      expect(user.name).toBe('Custom User')
      expect(user.email).toBe('custom@example.com')
      expect(user.id).toBe('test-user-1') // From default
    })

    it('should build multiple variations', () => {
      const users = TestFixtures.user.buildMany(3, [
        { name: 'User 1' },
        { name: 'User 2' },
        { name: 'User 3' }
      ])

      expect(users).toHaveLength(3)
      expect(users.map(u => u.name)).toEqual(['User 1', 'User 2', 'User 3'])
    })

    it('should use error fixtures', () => {
      const notFoundError = TestFixtures.errors.notFound('User')
      const validationError = TestFixtures.errors.validation('email')

      expect(notFoundError.message).toBe('User not found')
      expect(validationError.message).toBe('Validation failed for email')
    })

    it('should use response fixtures', () => {
      const successResult = TestFixtures.responses.success({ id: '123' })
      const errorResult = TestFixtures.responses.error(new Error('Test error'))

      expect(successResult.isOk()).toBe(true)
      expect(errorResult.isErr()).toBe(true)
    })
  })

  describe('Service Introspection Testing', () => {
    it('should test service metadata', () => {
      const inspector = new ServiceInspector(userService)
      const metadata = inspector.getEnhancedMetadata()

      expect(metadata.name).toBe('UserService')
      expect(Object.keys(metadata.handlers)).toEqual(['getUser', 'createUser', 'updateUser'])
    })

    it('should test handler discovery', () => {
      const inspector = new ServiceInspector(userService)
      const handlers = inspector.discoverHandlers()

      expect(handlers).toHaveLength(3)
      
      const getHandler = handlers.find(h => h.name === 'getUser')
      expect(getHandler?.metadata.performance?.idempotent).toBe(true)
      
      const createHandler = handlers.find(h => h.name === 'createUser')
      expect(createHandler?.metadata.performance?.idempotent).toBe(false)
    })

    it('should generate OpenAPI specification', () => {
      const inspector = new ServiceInspector(userService)
      const spec = inspector.generateOpenAPI()

      expect(spec.info.title).toBe('UserService')
      expect(Object.keys(spec.paths)).toEqual(['/getUser', '/createUser', '/updateUser'])
    })
  })

  describe('Performance Testing', () => {
    it('should measure handler performance', async () => {
      // Create the test harness (skipping strict types for this performance test)
      const testHarness = createServiceTestHarness(userService as unknown as ServiceDefinition<string, Record<string, unknown>>, mockDeps as Record<string, unknown>)
      
      // Verify the harness was created correctly
      expect(testHarness).toBeDefined()
      expect(testHarness.service).toBeDefined()
      
      // Mock fast response
      const dbMock = mockDeps.database.findUser as MockedFunction<typeof mockDeps.database.findUser>
      const cacheMock = mockDeps.cache.get as MockedFunction<typeof mockDeps.cache.get>
      
      dbMock.mockResolvedValue({
        id: '123',
        name: 'Fast User',
        email: 'fast@example.com'
      })
      cacheMock.mockResolvedValue(null)

      const metrics = await PerformanceTestUtils.measureHandlerTime(
        testHarness,
        'getUser',
        { id: '123' },
        3
      )

      // Performance should be reasonable
      expect(typeof metrics.avgTime).toBe('number')
      expect(metrics.avgTime).toBeGreaterThan(0)
      expect(metrics.minTime).toBeGreaterThanOrEqual(0)
      expect(metrics.maxTime).toBeGreaterThanOrEqual(metrics.avgTime)
    })
  })
})

describe('Mock Factories', () => {
  it('should create comprehensive database mocks', () => {
    const db = MockFactories.database()
    
    expect(db.findById).toBeDefined()
    expect(db.create).toBeDefined()
    expect(db.update).toBeDefined()
    expect(db.delete).toBeDefined()
    expect(db.transaction).toBeDefined()
  })

  it('should create logger mocks', () => {
    const logger = MockFactories.logger()
    
    expect(logger.info).toBeDefined()
    expect(logger.error).toBeDefined()
    expect(logger.debug).toBeDefined()
    expect(logger.warn).toBeDefined()
    expect(logger.child).toBeDefined()
  })

  it('should create nested logger instances', () => {
    const logger = MockFactories.logger()
    const childLogger = logger.child()
    
    expect(childLogger.info).toBeDefined()
    expect(typeof childLogger.info).toBe('function')
  })
})
