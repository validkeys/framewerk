/**
 * @fileoverview Enhanced Introspection & Metadata System
 *
 * This module provides comprehensive metadata collection and introspection capabilities
 * for services and handlers, enabling sophisticated codegen scenarios.
 *
 * @example
 * ```typescript
 * // Enhanced metadata collection
 * const service = defineService("UserService")
 *   .withServiceDependencies<UserDeps>()
 *   .withTags("users", "core")
 *   .withVersion("1.2.0")
 *   .addHandler("getUser", getUserHandler)
 *   .build()
 *
 * // Comprehensive introspection
 * const metadata = service.getMetadata()
 * const inspector = createServiceInspector(service)
 * 
 * // Discover all handlers
 * const handlers = inspector.discoverHandlers()
 * 
 * // Generate schemas for codegen
 * const schemas = inspector.extractSchemas()
 * ```
 */

import type { ServiceDefinition, ServiceMetadata } from "./service.ts"

/**
 * Enhanced service metadata with comprehensive information
 */
export interface EnhancedServiceMetadata extends ServiceMetadata {
  /** Service version for compatibility tracking */
  version: string
  /** Tags for categorization and discovery */
  tags: string[]
  /** Handler metadata with detailed information */
  handlers: Record<string, HandlerMetadata>
  /** Service dependencies type information */
  dependencyTypes: string[]
  /** Creation timestamp */
  createdAt: Date
  /** Additional custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Comprehensive handler metadata
 */
export interface HandlerMetadata {
  /** Handler name/identifier */
  name: string
  /** Input schema information */
  inputSchema?: SchemaMetadata
  /** Output schema information */
  outputSchema?: SchemaMetadata
  /** Error schemas */
  errorSchemas?: SchemaMetadata[]
  /** Handler tags */
  tags?: string[]
  /** Description/documentation */
  description?: string
  /** Deprecation information */
  deprecated?: {
    since: string
    reason?: string
    replacement?: string
  }
  /** Performance hints */
  performance?: {
    estimated_ms?: number
    cacheable?: boolean
    idempotent?: boolean
  }
  /** Security information */
  security?: {
    requiresAuth?: boolean
    scopes?: string[]
    rateLimit?: {
      requests: number
      windowMs: number
    }
  }
}

/**
 * Schema metadata for codegen
 */
export interface SchemaMetadata {
  /** Schema type (zod, joi, etc.) */
  type: "zod" | "joi" | "yup" | "ajv" | "custom"
  /** Schema definition (serializable) */
  definition?: unknown
  /** TypeScript type string */
  typescript?: string
  /** JSON Schema representation */
  jsonSchema?: unknown
  /** Examples for documentation */
  examples?: unknown[]
}

/**
 * Service discovery result
 */
export interface ServiceDiscovery {
  /** All discovered services */
  services: Array<{
    name: string
    metadata: EnhancedServiceMetadata
    instance: ServiceDefinition<string, object>
  }>
  /** Handler discovery results */
  handlers: Array<{
    serviceName: string
    handlerName: string
    metadata: HandlerMetadata
  }>
  /** Dependency graph */
  dependencies: Array<{
    service: string
    dependencies: string[]
  }>
}

/**
 * Service inspector for advanced introspection
 */
export class ServiceInspector<T extends ServiceDefinition<string, object>> {
  constructor(private readonly service: T) {}

  /**
   * Get enhanced metadata
   */
  getEnhancedMetadata(): EnhancedServiceMetadata {
    const baseMetadata = this.service.getMetadata()
    
    return {
      ...baseMetadata,
      version: baseMetadata.version || "1.0.0",
      tags: baseMetadata.tags || [],
      handlers: this.extractHandlerMetadata(),
      dependencyTypes: this.extractDependencyTypes(),
      createdAt: new Date(),
      custom: {}
    }
  }

  /**
   * Discover all handlers with metadata
   */
  discoverHandlers(): Array<{ name: string; metadata: HandlerMetadata }> {
    const metadata = this.getEnhancedMetadata()
    
    return Object.entries(metadata.handlers).map(([name, handlerMetadata]) => ({
      name,
      metadata: handlerMetadata
    }))
  }

  /**
   * Extract schemas for codegen
   */
  extractSchemas(): Record<string, SchemaMetadata> {
    const handlers = this.discoverHandlers()
    const schemas: Record<string, SchemaMetadata> = {}
    
    handlers.forEach(({ name, metadata }) => {
      if (metadata.inputSchema) {
        schemas[`${name}Input`] = metadata.inputSchema
      }
      if (metadata.outputSchema) {
        schemas[`${name}Output`] = metadata.outputSchema
      }
      if (metadata.errorSchemas) {
        metadata.errorSchemas.forEach((errorSchema, index) => {
          schemas[`${name}Error${index}`] = errorSchema
        })
      }
    })
    
    return schemas
  }

  /**
   * Generate OpenAPI specification
   */
  generateOpenAPI(): OpenAPISpec {
    const metadata = this.getEnhancedMetadata()
    
    return {
      openapi: "3.0.0",
      info: {
        title: metadata.name,
        version: metadata.version,
        description: `Auto-generated API for ${metadata.name}`
      },
      paths: this.generateOpenAPIPaths(),
      components: {
        schemas: this.generateOpenAPISchemas()
      }
    }
  }

  /**
   * Extract runtime performance metrics
   */
  extractPerformanceMetrics(): Record<string, PerformanceMetric> {
    // This would be populated by runtime instrumentation
    return {}
  }

  private extractHandlerMetadata(): Record<string, HandlerMetadata> {
    const baseMetadata = this.service.getMetadata()
    const handlerMetadata: Record<string, HandlerMetadata> = {}
    
    // Extract metadata from handler definitions
    Object.entries(baseMetadata.handlers).forEach(([name]) => {
      handlerMetadata[name] = {
        name,
        // These would be extracted from actual handler metadata if available
        description: `Handler for ${name}`,
        tags: [],
        performance: {
          estimated_ms: 100,
          cacheable: false,
          idempotent: name.startsWith("get")
        }
      }
    })
    
    return handlerMetadata
  }

  private extractDependencyTypes(): string[] {
    // This would extract actual dependency type information
    // For now, return empty array
    return []
  }

  private generateOpenAPIPaths(): Record<string, unknown> {
    const handlers = this.discoverHandlers()
    const paths: Record<string, unknown> = {}
    
    handlers.forEach(({ name, metadata }) => {
      paths[`/${name}`] = {
        post: {
          summary: metadata.description || `Execute ${name}`,
          tags: metadata.tags || [this.service.name],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${name}Input` }
              }
            }
          },
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: { $ref: `#/components/schemas/${name}Output` }
                }
              }
            }
          }
        }
      }
    })
    
    return paths
  }

  private generateOpenAPISchemas(): Record<string, unknown> {
    const schemas = this.extractSchemas()
    const openAPISchemas: Record<string, unknown> = {}
    
    Object.entries(schemas).forEach(([name, schema]) => {
      if (schema.jsonSchema) {
        openAPISchemas[name] = schema.jsonSchema
      } else {
        // Fallback generic schema
        openAPISchemas[name] = {
          type: "object",
          description: `Schema for ${name}`
        }
      }
    })
    
    return openAPISchemas
  }
}

/**
 * Performance metric information
 */
export interface PerformanceMetric {
  /** Handler name */
  handler: string
  /** Average execution time in milliseconds */
  avgExecutionMs: number
  /** Total invocations */
  totalInvocations: number
  /** Error rate (0-1) */
  errorRate: number
  /** Last invocation timestamp */
  lastInvocation: Date
}

/**
 * OpenAPI specification structure
 */
export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, unknown>
  components?: {
    schemas?: Record<string, unknown>
  }
}

/**
 * Service registry for multiple services
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceDefinition<string, object>>()
  private inspectors = new Map<string, ServiceInspector<ServiceDefinition<string, object>>>()

  /**
   * Register a service
   */
  register<T extends ServiceDefinition<string, object>>(service: T): void {
    this.services.set(service.name, service)
    this.inspectors.set(service.name, new ServiceInspector(service))
  }

  /**
   * Get service by name
   */
  getService(name: string): ServiceDefinition<string, object> | undefined {
    return this.services.get(name)
  }

  /**
   * Get inspector for service
   */
  getInspector(name: string): ServiceInspector<ServiceDefinition<string, object>> | undefined {
    return this.inspectors.get(name)
  }

  /**
   * Discover all registered services
   */
  discover(): ServiceDiscovery {
    const services = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      metadata: this.inspectors.get(name)!.getEnhancedMetadata(),
      instance: service
    }))

    const handlers = services.flatMap(({ name: serviceName, metadata }) =>
      Object.entries(metadata.handlers).map(([handlerName, handlerMetadata]) => ({
        serviceName,
        handlerName,
        metadata: handlerMetadata
      }))
    )

    const dependencies = services.map(({ name, metadata }) => ({
      service: name,
      dependencies: metadata.dependencyTypes
    }))

    return { services, handlers, dependencies }
  }

  /**
   * Generate combined OpenAPI spec for all services
   */
  generateCombinedOpenAPI(): OpenAPISpec {
    const discovery = this.discover()
    
    return {
      openapi: "3.0.0",
      info: {
        title: "Combined Services API",
        version: "1.0.0",
        description: "Auto-generated API for all registered services"
      },
      paths: discovery.services.reduce((paths, { name }) => {
        const inspector = this.inspectors.get(name)!
        const serviceSpec = inspector.generateOpenAPI()
        return { ...paths, ...serviceSpec.paths }
      }, {}),
      components: {
        schemas: discovery.services.reduce((schemas, { name }) => {
          const inspector = this.inspectors.get(name)!
          const serviceSpec = inspector.generateOpenAPI()
          return { ...schemas, ...serviceSpec.components?.schemas }
        }, {})
      }
    }
  }
}

/**
 * Create a service inspector
 */
export function createServiceInspector<T extends ServiceDefinition<string, object>>(
  service: T
): ServiceInspector<T> {
  return new ServiceInspector(service)
}

/**
 * Create a global service registry
 */
export function createServiceRegistry(): ServiceRegistry {
  return new ServiceRegistry()
}

/**
 * Utility functions for metadata manipulation
 */
export const MetadataUtils = {
  /**
   * Merge metadata objects
   */
  mergeMetadata(base: EnhancedServiceMetadata, override: Partial<EnhancedServiceMetadata>): EnhancedServiceMetadata {
    return {
      ...base,
      ...override,
      handlers: { ...base.handlers, ...override.handlers },
      tags: [...base.tags, ...(override.tags || [])],
      custom: { ...base.custom, ...override.custom }
    }
  },

  /**
   * Filter handlers by tag
   */
  filterHandlersByTag(metadata: EnhancedServiceMetadata, tag: string): HandlerMetadata[] {
    return Object.values(metadata.handlers).filter(handler => 
      handler.tags?.includes(tag)
    )
  },

  /**
   * Find deprecated handlers
   */
  findDeprecatedHandlers(metadata: EnhancedServiceMetadata): HandlerMetadata[] {
    return Object.values(metadata.handlers).filter(handler => 
      handler.deprecated
    )
  }
}
