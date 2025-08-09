// Global service contracts file - updated for runtime usage

import { Service } from './di.ts';

// Core service interfaces
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

export interface TransactionContract {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  rollback(): Promise<void>;
}

export interface CacheContract {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface EventBusContract {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): () => void;
  once(event: string, handler: (data: any) => void): () => void;
}

export interface ConfigContract {
  get<T = string>(key: string): T | undefined;
  getOrThrow<T = string>(key: string): T;
  has(key: string): boolean;
  all(): Record<string, any>;
}

export interface EmailContract {
  send(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<void>;
}

export interface HttpClientContract {
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
  delete<T = any>(url: string, options?: RequestOptions): Promise<T>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
}

// Service definitions using contracts
// Use 'as const' to ensure literal string types for names
export const Logger = Service('Logger', {} as LoggerContract);
export const Database = Service('Database', {} as DatabaseContract);
export const Cache = Service('Cache', {} as CacheContract);
export const EventBus = Service('EventBus', {} as EventBusContract);
export const Config = Service('Config', {} as ConfigContract);
export const Email = Service('Email', {} as EmailContract);
export const HttpClient = Service('HttpClient', {} as HttpClientContract);

// Value services
export const Port = Service('Port', 3000);
export const Environment = Service('Environment', 'development' as 'development' | 'staging' | 'production');
export const ApiKey = Service('ApiKey', '' as string);
export const Features = Service('Features', {} as Record<string, boolean>);

// Export all services as a single object for easy runtime creation
export const services = {
  Logger,
  Database,
  Cache,
  EventBus,
  Config,
  Email,
  HttpClient,
  Port,
  Environment,
  ApiKey,
  Features
} as const;

// Type helpers for implementations
export type Services = typeof services;
export type ServiceImplementations = {
  [K in keyof Services]: Services[K] extends ServiceInstance<any, infer T> ? T : never;
};

// Optional: Domain-specific service groups
export const coreServices = {
  Logger,
  Database,
  Cache,
  Config
} as const;

export const externalServices = {
  Email,
  HttpClient,
  EventBus
} as const;

export const configServices = {
  Port,
  Environment,
  ApiKey,
  Features
} as const;