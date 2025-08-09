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
const Database = Service('Database', {
  query: async (sql: string) => []
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

## Service Types

Services can be any type - not just objects with methods:

```typescript
import { Service, createService } from '@validkeys/compose-di';

// Object with methods (classic service)
const Database = createService.object('Database', {
  query: async (sql: string, params?: any[]) => [],
  transaction: async (fn: Function) => {}
});

// Single function
const Logger = createService.function('Logger', console.log);

// Configuration object
const Config = createService.object('Config', {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false
});

// Primitive values
const ApiKey = createService.value<string>('ApiKey'); // Required
const Port = createService.value('Port', 3000); // With default
const DebugMode = createService.value('DebugMode', false);

// Arrays
const AllowedOrigins = Service<string[]>('AllowedOrigins', ['http://localhost:3000']);

// Complex types
interface User {
  id: string;
  email: string;
  roles: string[];
}
const CurrentUser = Service<User | null>('CurrentUser', null);

// Even classes
class EventBus {
  emit(event: string, data: any) { /* ... */ }
  on(event: string, handler: Function) { /* ... */ }
}
const Events = Service<EventBus>('Events');
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

### Mixing Sync and Async

You can compose sync and async generators:

```typescript
function* validateUser(email: string) {
  const logger = yield* Logger;
  
  if (!email.includes('@')) {
    logger('Invalid email');
    throw new Error('Invalid email');
  }
  
  return email.toLowerCase();
}

async function* createUser(email: string) {
  const db = yield* Database;
  
  // Call sync generator from async
  const validEmail = yield* validateUser(email);
  
  const user = await db.query('INSERT INTO users (email) VALUES (?)', [validEmail]);
  return user;
}
```

## Default Values

Services can have default values, making them optional:

```typescript
// With defaults
const Port = Service('Port', 3000);
const Debug = Service('Debug', false);
const Logger = Service('Logger', console.log);

// Without defaults (required)
const Database = Service<DatabaseConnection>('Database');
const ApiKey = Service<string>('ApiKey');

function* example() {
  const port = yield* Port; // Will be 3000 if not provided
  const db = yield* Database; // Will throw if not provided
}

// This works (Port uses default)
runSync(example(), {
  Database: myDb,
  ApiKey: 'key'
});

// This throws: "Service 'Database' not provided and has no default value"
runSync(example(), {
  Port: 8080
  // Database missing!
});
```

## Real World Example

```typescript
// services/definitions.ts
export const Services = {
  // Data access
  Database: createService.object<{
    query: (sql: string, params?: any[]) => Promise<any[]>;
    transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  }>('Database'),
  
  Redis: createService.object<{
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttl?: number) => Promise<void>;
  }>('Redis'),
  
  // External APIs
  EmailService: createService.object<{
    send: (to: string, subject: string, body: string) => Promise<void>;
  }>('EmailService'),
  
  StripeClient: createService.object<{
    createCustomer: (email: string) => Promise<{ id: string }>;
    createSubscription: (customerId: string, priceId: string) => Promise<any>;
  }>('StripeClient'),
  
  // Configuration
  Config: createService.object('Config', {
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    stripeKey: process.env.STRIPE_KEY || '',
    emailFrom: 'noreply@example.com'
  }),
  
  // Simple values
  Logger: createService.function('Logger', console.log),
  Environment: createService.value('Environment', process.env.NODE_ENV || 'development'),
  Port: createService.value('Port', parseInt(process.env.PORT || '3000')),
  
  // Feature flags
  Features: createService.object('Features', {
    newUI: false,
    betaAPI: false,
    maintenanceMode: false
  })
} as const;

// repositories/user.ts
import { Services } from '../services/definitions';

export async function* createUser(email: string, name: string) {
  const db = yield* Services.Database;
  const redis = yield* Services.Redis;
  const stripe = yield* Services.StripeClient;
  const emailService = yield* Services.EmailService;
  const config = yield* Services.Config;
  const logger = yield* Services.Logger;
  
  return await db.transaction(async (tx) => {
    // Create user
    const [user] = await tx.query(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [email, name]
    );
    
    // Create Stripe customer
    const customer = await stripe.createCustomer(email);
    await tx.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, user.id]
    );
    
    // Cache user
    await redis.set(`user:${user.id}`, JSON.stringify(user), 3600);
    
    // Send welcome email
    await emailService.send(
      email,
      'Welcome!',
      `Hi ${name}, welcome to our app!`
    );
    
    logger(`Created user ${user.id}`);
    return user;
  });
}

// server.ts
import { createPool } from 'pg';
import Redis from 'ioredis';
import Stripe from 'stripe';
import { Services } from './services/definitions';
import { run } from '@validkeys/compose-di';

const pool = createPool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const implementations = {
  Database: {
    query: (sql: string, params?: any[]) => pool.query(sql, params).then(r => r.rows),
    transaction: async (fn: Function) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  },
  
  Redis: {
    get: (key: string) => redis.get(key),
    set: (key: string, value: string, ttl?: number) => 
      ttl ? redis.setex(key, ttl, value) : redis.set(key, value)
  },
  
  EmailService: {
    send: async (to: string, subject: string, body: string) => {
      if (process.env.NODE_ENV === 'test') return;
      await sendgrid.send({ to, subject, text: body });
    }
  },
  
  StripeClient: {
    createCustomer: (email: string) => stripe.customers.create({ email }),
    createSubscription: (customerId: string, priceId: string) => 
      stripe.subscriptions.create({ customer: customerId, items: [{ price: priceId }] })
  },
  
  // Config and values use defaults or can be overridden
  Logger: (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`),
  Features: {
    newUI: process.env.NEW_UI === 'true',
    betaAPI: process.env.BETA_API === 'true',
    maintenanceMode: false
  }
};

// Express routes
app.post('/users', async (req, res) => {
  try {
    const user = await run(createUser(req.body.email, req.body.name), implementations);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Testing

```typescript
import { describe, test, expect, vi } from 'vitest';
import { run, runSync } from '@validkeys/compose-di';
import { createUser } from './user';

test('creates user with all integrations', async () => {
  const mocks = {
    Database: {
      transaction: vi.fn(async (fn) => {
        const mockTx = {
          query: vi.fn()
            .mockResolvedValueOnce([{ id: '123', email: 'test@example.com', name: 'Test' }])
            .mockResolvedValueOnce([])
        };
        return fn(mockTx);
      })
    },
    Redis: {
      get: vi.fn(),
      set: vi.fn()
    },
    StripeClient: {
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_123' })
    },
    EmailService: {
      send: vi.fn()
    },
    Config: {
      apiUrl: 'http://test',
      stripeKey: 'test',
      emailFrom: 'test@test.com'
    },
    Logger: vi.fn()
  };
  
  const user = await run(createUser('test@example.com', 'Test User'), mocks);
  
  expect(user.id).toBe('123');
  expect(mocks.StripeClient.createCustomer).toHaveBeenCalledWith('test@example.com');
  expect(mocks.EmailService.send).toHaveBeenCalled();
  expect(mocks.Redis.set).toHaveBeenCalledWith(
    'user:123',
    expect.any(String),
    3600
  );
});
```

## API Reference

### `Service<T>(name, defaultValue?)`
Define a service of any type with optional default value.

### `createService.object(name, shape?)`
Helper for object services with type inference.

### `createService.function(name, fn?)`
Helper for function services.

### `createService.value(name, defaultValue?)`
Helper for primitive value services.

### `yield* ServiceName`
Get a service instance inside a generator.

### `run(generator, implementations)`
Execute any generator (sync or async) with service implementations. Always returns a Promise.

### `runSync(generator, implementations)`
Execute a sync generator with service implementations. Returns the value directly (not a Promise).
Only works with synchronous generators and will throw if you try to use async operations.

## FAQ

**Q: When should I use sync vs async generators?**  
A: Use async generators when you need to `await` promises. Use sync generators for pure synchronous operations - they're simpler and `runSync` is more efficient.

**Q: Can I mix different service types?**  
A: Yes! A service can be an object, function, primitive, array, or any type. Mix and match as needed.

**Q: What about circular dependencies?**  
A: Generators are evaluated lazily, so circular dependencies between services work fine. Circular dependencies between generators will cause infinite loops.

**Q: How do I handle optional services?**  
A: Use default values: `Service('OptionalAPI', null)`. Check for null before using.

**Q: Is this production ready?**  
A: The core is ~100 lines of well-tested code. It's simple enough to understand completely, which makes it production ready.

## License

MIT