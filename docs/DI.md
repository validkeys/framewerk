# Compose DI

Dead simple dependency injection for TypeScript using generators. No frameworks, no magic, just functions.

## Install

```bash
npm install @validkeys/compose-di
```

## Quick Start

```typescript
import { Service, run } from '@validkeys/compose-di';

// 1. Define services (any type - objects, functions, primitives)
const Database = Service('Database', {} as {
  query: (sql: string) => Promise<any[]>
});

const Logger = Service('Logger', console.log);

const ApiKey = Service<string>('ApiKey'); // No default

// 2. Use services with yield*
async function* getUserById(id: string) {
  const db = yield* Database;
  const logger = yield* Logger;
  const apiKey = yield* ApiKey;
  
  logger(`Fetching user ${id} with key ${apiKey}`);
  const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return result[0];
}

// 3. Run with implementations
const user = await run(getUserById('123'), {
  Database: { query: async (sql) => [{ id: '123', name: 'Alice' }] },
  Logger: console.log,
  ApiKey: 'sk-prod-key'
});
```

## Runtime Pattern (Recommended)

For better type safety and organization, use the runtime pattern:

```typescript
import { createRuntime } from '@validkeys/compose-di';
import { Database, Logger, Cache } from './contracts';

// Create a runtime with your services
const runtime = createRuntime({
  Database,
  Logger,
  Cache
});

// Type-safe execution - TypeScript will catch typos and missing services
await runtime.run(getUserById('123'), {
  Database: myDatabase,
  Logger: console.log,
  Cache: myCache
});

// This gives a type error - "Databse" is misspelled
await runtime.run(getUserById('123'), {
  Databse: myDatabase, // ❌ Type error!
  Logger: console.log,
  Cache: myCache
});
```

## Service Contracts

Define service interfaces in a central contracts file:

```typescript
// contracts.ts
import { Service } from '@validkeys/compose-di';

// Define interfaces
export interface LoggerContract {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: Error): void;
  debug(message: string, data?: any): void;
}

export interface DatabaseContract {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(fn: (tx: TransactionContract) => Promise<T>): Promise<T>;
}

export interface CacheContract {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Create service instances
export const Logger = Service('Logger', {} as LoggerContract);
export const Database = Service('Database', {} as DatabaseContract);
export const Cache = Service('Cache', {} as CacheContract);

// Value services
export const Port = Service('Port', 3000);
export const ApiKey = Service<string>('ApiKey');

// Export all services for runtime creation
export const services = {
  Logger,
  Database,
  Cache,
  Port,
  ApiKey
} as const;
```

## Implementing Services

Use the `.make()` method for type-safe implementations:

```typescript
// implementations.ts
import { Logger, Database } from './contracts';

// Type-safe implementation
export const ConsoleLogger = Logger.make({
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  debug: (msg, data) => console.debug(`[DEBUG] ${msg}`, data)
});

// Class-based implementation
export class PostgresDatabase implements DatabaseContract {
  constructor(private pool: any) {}
  
  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }
  
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    // Transaction implementation
  }
}
```

## Runtime Patterns

### Environment-based Runtimes

```typescript
import { createRuntime } from '@validkeys/compose-di';
import { services } from './contracts';

// Create base runtime
const appRuntime = createRuntime(services);

// Production runtime with real implementations
const productionImpl = {
  Logger: new CloudLogger(),
  Database: new PostgresDatabase(pool),
  Cache: new RedisCache(client),
  Port: parseInt(process.env.PORT || '3000'),
  ApiKey: process.env.API_KEY!
};

// Development runtime with defaults
export const devRuntime = appRuntime.withDefaults({
  Logger: ConsoleLogger,
  Database: new PostgresDatabase(devPool),
  Cache: new MemoryCache(),
  Port: 3000,
  ApiKey: 'dev-key'
});

// Test runtime with all mocks
export const testRuntime = appRuntime.withDefaults({
  Logger: Logger.mock({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
  Database: Database.mock({ query: jest.fn(), transaction: jest.fn() }),
  Cache: Cache.mock({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }),
  Port: 3000,
  ApiKey: 'test-key'
});

// Usage
async function startApp() {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    return appRuntime.run(mainProgram(), productionImpl);
  } else if (env === 'test') {
    return testRuntime.run(mainProgram(), {});
  } else {
    return devRuntime.run(mainProgram(), {});
  }
}
```

### Feature-specific Runtimes

```typescript
// Separate runtimes for different features
export const authRuntime = createRuntime({
  Database,
  Cache,
  Logger,
  TokenService,
  EmailService
});

export const billingRuntime = createRuntime({
  Database,
  Logger,
  StripeClient,
  EmailService,
  PricingConfig
});

// Shared implementations
const coreServices = {
  Database: postgresDb,
  Logger: logger,
  EmailService: emailService
};

// Use with feature-specific additions
await authRuntime.run(loginUser(email, password), {
  ...coreServices,
  Cache: sessionCache,
  TokenService: jwtService
});

await billingRuntime.run(createSubscription(userId, planId), {
  ...coreServices,
  StripeClient: stripeClient,
  PricingConfig: pricingConfig
});
```

### Scoped Runtimes with Defaults

The `withDefaults` method creates **scoped runtimes** with pre-configured service implementations, enabling composition and reducing boilerplate. Here are the key use cases:

#### 1. Testing with Common Mocks
When you have services that are commonly mocked together in tests:

```typescript
const testRuntime = runtime.withDefaults({
  database: mockDatabase,
  logger: mockLogger,
  cache: mockCache
});

// Each test only needs to provide specific overrides
await testRuntime.run(myGenerator, {
  userService: specificMockForThisTest
});
```

#### 2. Environment-Specific Configurations
Different environments often need different service implementations:

```typescript
const devRuntime = runtime.withDefaults({
  database: devDatabase,
  logger: consoleLogger,
  emailService: mockEmailService // Don't send real emails in dev
});

const prodRuntime = runtime.withDefaults({
  database: prodDatabase,
  logger: cloudLogger,
  emailService: realEmailService
});
```

#### 3. Feature Flags or Multi-Tenancy
When you need different service implementations based on context:

```typescript
const tenantARuntime = runtime.withDefaults({
  paymentProcessor: stripeProcessor,
  storageService: s3Storage
});

const tenantBRuntime = runtime.withDefaults({
  paymentProcessor: paypalProcessor,
  storageService: azureStorage
});
```

#### 4. Reducing Boilerplate
Instead of passing the same implementations repeatedly:

```typescript
// Without withDefaults - repetitive
await runtime.run(generator1, { db, logger, cache, auth, ... });
await runtime.run(generator2, { db, logger, cache, auth, ... });

// With withDefaults - cleaner
const appRuntime = runtime.withDefaults({ db, logger, cache, auth });
await appRuntime.run(generator1);
await appRuntime.run(generator2);
```

#### 5. Request-Scoped Services
Create specialized runtimes for common scenarios:

```typescript
// Create specialized runtimes for common scenarios
const runtime = createRuntime(services);

// API route runtime with request-scoped services
export function createRequestRuntime(req: Request) {
  return runtime.withDefaults({
    Logger: Logger.make({
      info: (msg) => console.log(`[${req.id}] ${msg}`),
      warn: (msg) => console.warn(`[${req.id}] ${msg}`),
      error: (msg, err) => console.error(`[${req.id}] ${msg}`, err),
      debug: (msg, data) => console.debug(`[${req.id}] ${msg}`, data)
    }),
    CurrentUser: req.user,
    RequestId: req.id
  });
}

// Usage in route handler
app.post('/users', async (req, res) => {
  const requestRuntime = createRequestRuntime(req);
  
  try {
    const user = await requestRuntime.run(createUser(req.body.email, req.body.name), {
      Database: db,
      Cache: cache,
      EmailService: email
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Service Types

Services can be any type - not just objects with methods:

```typescript
import { Service, createService } from '@validkeys/compose-di';

// Object with methods (classic service)
const Database = Service('Database', {} as {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  transaction: (fn: Function) => Promise<void>;
});

// Single function
const Logger = Service('Logger', console.log);

// Configuration object
const Config = Service('Config', {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false
});

// Primitive values
const ApiKey = Service<string>('ApiKey'); // Required
const Port = Service('Port', 3000); // With default
const DebugMode = Service('DebugMode', false);

// Arrays
const AllowedOrigins = Service<string[]>('AllowedOrigins', ['http://localhost:3000']);

// Complex types
interface User {
  id: string;
  email: string;
  roles: string[];
}
const CurrentUser = Service<User | null>('CurrentUser', null);
```

## Sync vs Async Generators

The library supports both synchronous and asynchronous generators:

### Async Generators (`async function*`)

Use when you need to `await` operations:

```typescript
async function* createUser(email: string) {
  const db = yield* Database;
  const logger = yield* Logger;
  
  // Can use await directly
  const existing = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new Error('User exists');
  }
  
  const result = await db.query('INSERT INTO users (email) VALUES (?)', [email]);
  logger(`Created user ${result.id}`);
  
  return result;
}

// Run with async run()
const user = await run(createUser('alice@example.com'), services);
```

### Sync Generators (`function*`)

Use for synchronous operations or when you don't need top-level await:

```typescript
function* getConfig() {
  const config = yield* Config;
  const port = yield* Port;
  const debug = yield* DebugMode;
  
  // Synchronous operations only
  return {
    ...config,
    port,
    debug,
    baseUrl: `http://localhost:${port}`
  };
}

// Use runSync() for better performance
const config = runSync(getConfig(), services);

// Or use regular run() (it handles both)
const config2 = await run(getConfig(), services);
```

## Testing

The `.mock()` method makes testing easy:

```typescript
import { testRuntime } from './runtime-setup';
import { Database, Cache } from './contracts';

test('creates user with caching', async () => {
  // Override specific services for this test
  const result = await testRuntime.run(createUser('test@example.com', 'Test'), {
    Database: Database.mock({
      query: jest.fn()
        .mockResolvedValueOnce([]) // user doesn't exist
        .mockResolvedValueOnce([{ id: '123', email: 'test@example.com' }])
    }),
    Cache: Cache.mock({
      set: jest.fn().mockResolvedValue(undefined)
    })
  });
  
  expect(result.id).toBe('123');
});

// Or use the test runtime defaults
test('uses default mocks', async () => {
  const result = await testRuntime.run(getConfig(), {});
  
  // testRuntime already has mocked services
  expect(result.port).toBe(3000);
});
```

## Real World Example

```typescript
// contracts.ts
export const services = {
  Database: Service('Database', {} as DatabaseContract),
  Cache: Service('Cache', {} as CacheContract),
  Logger: Service('Logger', {} as LoggerContract),
  Email: Service('Email', {} as EmailContract),
  Stripe: Service('Stripe', {} as StripeContract),
  Config: Service('Config', {} as ConfigContract),
  Features: Service('Features', {} as Record<string, boolean>)
} as const;

// runtime.ts
import { createRuntime } from '@validkeys/compose-di';
import { services } from './contracts';

export const runtime = createRuntime(services);

// Production setup
export const prodRuntime = runtime.withDefaults({
  Logger: new CloudLogger(),
  Config: new EnvConfig(),
  Features: {
    newCheckout: process.env.FEATURE_NEW_CHECKOUT === 'true',
    betaAPI: false
  }
});

// business-logic.ts
export async function* processOrder(orderId: string) {
  const db = yield* Database;
  const stripe = yield* Stripe;
  const email = yield* Email;
  const logger = yield* Logger;
  const features = yield* Features;
  
  logger.info(`Processing order ${orderId}`);
  
  const order = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  
  if (features.newCheckout) {
    // New checkout flow
    const session = await stripe.checkout.sessions.create({
      line_items: order.items,
      mode: 'payment'
    });
    
    await email.send({
      to: order.customerEmail,
      subject: 'Complete your order',
      html: `<a href="${session.url}">Complete payment</a>`
    });
  } else {
    // Legacy flow
    const charge = await stripe.charges.create({
      amount: order.total,
      currency: 'usd',
      source: order.paymentToken
    });
  }
  
  return { orderId, status: 'processing' };
}

// server.ts
import { prodRuntime } from './runtime';
import { processOrder } from './business-logic';

app.post('/orders/:id/process', async (req, res) => {
  try {
    const result = await prodRuntime.run(processOrder(req.params.id), {
      Database: postgresDb,
      Cache: redisCache,
      Email: sendgridEmail,
      Stripe: stripeClient
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## API Reference

### `Service<T>(name, defaultValue?)`
Define a service of any type with optional default value.

### `createRuntime(services)`
Create a type-safe runtime from a collection of services.

### `runtime.run(generator, implementations)`
Execute any generator (sync or async) with service implementations. Always returns a Promise.

### `runtime.runSync(generator, implementations)`
Execute a sync generator with service implementations. Returns the value directly (not a Promise).

### `runtime.withDefaults(defaults)`
Create a new runtime with default implementations. Useful for different environments.

### `service.make(implementation)`
Create a type-safe implementation of a service contract.

### `service.mock(partial)`
Create a partial mock implementation for testing.

### `yield* ServiceName`
Get a service instance inside a generator.

### `run(generator, implementations)`
Standalone function to execute generators without a runtime (less type safety).

### `runSync(generator, implementations)`
Standalone sync execution without a runtime.

## FAQ

**Q: When should I use runtime vs standalone run?**  
A: Use runtime for better type safety and when you have a known set of services. Use standalone `run` for more dynamic scenarios.

**Q: Can I have multiple runtimes?**  
A: Yes! Create different runtimes for different parts of your app or for different environments.

**Q: How do I handle optional services?**  
A: Use default values: `Service('OptionalAPI', null)`. Check for null before using.

**Q: What about circular dependencies?**  
A: Generators are evaluated lazily, so circular dependencies between services work fine. Circular dependencies between generators will cause infinite loops.

**Q: Is this production ready?**  
A: The core is ~100 lines of well-tested code. It's simple enough to understand completely, which makes it production ready.

## License

MIT