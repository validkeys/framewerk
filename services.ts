// Example implementations file

import { Logger, Database, Cache, Config, Email, HttpClient } from './contracts';
import type { LoggerContract, DatabaseContract, CacheContract, ConfigContract } from './contracts';

// Logger implementations
export const ConsoleLogger = Logger.make({
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data)
});

export const SilentLogger = Logger.make({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
});

// Database implementations
export class PostgresDatabase implements DatabaseContract {
  constructor(private pool: any) {}
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }
  
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn({
        query: (sql: string, params?: any[]) => client.query(sql, params).then((r: any) => r.rows),
        rollback: () => client.query('ROLLBACK')
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Cache implementations
export const MemoryCache = Cache.make({
  _store: new Map<string, { value: any; expires?: number }>(),
  
  async get<T = string>(key: string): Promise<T | null> {
    const item = this._store.get(key);
    if (!item) return null;
    if (item.expires && item.expires < Date.now()) {
      this._store.delete(key);
      return null;
    }
    return item.value;
  },
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    this._store.set(key, {
      value,
      expires: ttl ? Date.now() + ttl * 1000 : undefined
    });
  },
  
  async delete(key: string): Promise<void> {
    this._store.delete(key);
  },
  
  async clear(): Promise<void> {
    this._store.clear();
  }
} as CacheContract);

// Config implementations
export class EnvConfig implements ConfigContract {
  constructor(private env: Record<string, any> = process.env) {}
  
  get<T = string>(key: string): T | undefined {
    return this.env[key] as T;
  }
  
  getOrThrow<T = string>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
  
  has(key: string): boolean {
    return key in this.env;
  }
  
  all(): Record<string, any> {
    return { ...this.env };
  }
}

// // Test doubles
// export const createMockLogger = (overrides?: Partial<LoggerContract>) => 
//   Logger.mock({
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn(),
//     debug: jest.fn(),
//     ...overrides
//   });

// export const createMockDatabase = (overrides?: Partial<DatabaseContract>) =>
//   Database.mock({
//     query: jest.fn().mockResolvedValue([]),
//     transaction: jest.fn(async (fn) => fn({ 
//       query: jest.fn().mockResolvedValue([]),
//       rollback: jest.fn()
//     })),
//     ...overrides
//   });