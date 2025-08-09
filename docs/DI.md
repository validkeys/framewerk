# Compose DI

Dead simple dependency injection for TypeScript using generators. No frameworks, no magic, just functions.

## Install

```bash
npm install @validkeys/compose-di
```

## Quick Start

```typescript
import { Service, run } from '@validkeys/compose-di';

// 1. Define services
class Database extends Service<Database>('Database', {
  query: (sql: string) => Promise<any>
}) {}

class Logger extends Service<Logger>('Logger', {
  log: (message: string) => void
}) {}

// 2. Use services
function* getUserById(id: string) {
  const db = yield* Database;
  const logger = yield* Logger;
  
  logger.log(`Fetching user ${id}`);
  const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return result[0];
}

// 3. Run with implementations
const user = await run(getUserById('123'), {
  Database: {
    query: async (sql) => {
      // Your real database logic
      return [{ id: '123', name: 'Alice' }];
    }
  },
  Logger: {
    log: console.log
  }
});
```

## That's It

No layers. No lifecycle hooks. No retry logic. Just:
- Define what you need
- Ask for it with `yield*`
- Run with real implementations

## Testing

```typescript
test('creates user', async () => {
  const mockDb = {
    query: jest.fn().mockResolvedValue([{ id: '456' }])
  };
  
  const result = await run(createUser({ name: 'Bob' }), {
    Database: mockDb,
    Logger: { log: jest.fn() }
  });
  
  expect(result.id).toBe('456');
  expect(mockDb.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT'),
    expect.any(Array)
  );
});
```

## Why Generators?

Generators let us track dependencies without any magic:

```typescript
function* createOrder(data: OrderData) {
  const db = yield* Database;
  const events = yield* EventBus;
  const logger = yield* Logger;
  
  // This function needs Database, EventBus, and Logger
  // The types enforce this at compile time
  // No decorators, no reflection, no BS
}
```

## API

### `Service<T>(name, shape)`
Define a service with its interface.

### `yield* ServiceName`
Get a service instance inside a generator function.

### `run(generator, implementations)`
Execute a generator with service implementations.

### `mock(generator, mocks)`
Test helper that provides partial implementations.

## Real Example

```typescript
// services.ts
export class Config extends Service<Config>('Config', {
  get: (key: string) => string | undefined
}) {}

export class Database extends Service<Database>('Database', {
  query: (sql: string, params?: any[]) => Promise<any>
}) {}

export class Cache extends Service<Cache>('Cache', {
  get: (key: string) => Promise<string | null>,
  set: (key: string, value: string) => Promise<void>
}) {}

// user-repository.ts
export function* findUser(id: string) {
  const db = yield* Database;
  const cache = yield* Cache;
  
  const cached = await cache.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (user) {
    await cache.set(`user:${id}`, JSON.stringify(user));
  }
  
  return user;
}

// server.ts
import { createPool } from 'pg';
import Redis from 'ioredis';

const pool = createPool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

const services = {
  Config: {
    get: (key) => process.env[key]
  },
  Database: {
    query: (sql, params) => pool.query(sql, params).then(r => r.rows)
  },
  Cache: {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value, 'EX', 3600)
  }
};

// Use anywhere
app.get('/users/:id', async (req, res) => {
  const user = await run(findUser(req.params.id), services);
  res.json(user);
});
```

## FAQ

**Q: What about async initialization?**  
A: Do it before calling `run()`. Keep the DI simple.

**Q: What about cleanup?**  
A: Handle it in your app lifecycle, not in the DI layer.

**Q: What about dependency graphs?**  
A: If you need to visualize dependencies, you have too many.

**Q: This seems too simple?**  
A: That's the point. Your business logic is complex enough.

## License

MIT