/**
 * Configuration for autogen code generation
 * Supports both global (monorepo) and package-scoped configurations
 */

export interface PackageScopedConfig {
  /** Package-specific settings */
  package: {
    /** Package name (e.g., 'accountManager') */
    name: string
    /** Service factory function name */
    serviceFactory: string
    /** Dependencies type name */
    dependenciesType: string
    /** Relative path to service module */
    servicePath: string
  }
  
  /** Route generation settings */
  routes: {
    /** Route prefix for this package */
    prefix: string
    /** Default HTTP method */
    defaultMethod: 'GET' | 'POST' | 'PUT' | 'DELETE'
    /** Whether routes require authentication */
    requireAuth: boolean
    /** HTTP method overrides for specific operations */
    methodOverrides: Record<string, 'GET' | 'POST' | 'PUT' | 'DELETE'>
  }
  
  /** Fastify-specific settings */
  fastify: {
    /** Use fastify-zod-openapi plugin */
    useZodOpenApi: boolean
    /** Output filename */
    outputFile: string
  }
}

export interface AutogenConfig {
  /** Global settings (for monorepo-wide generation) */
  global?: {
    /** Base route prefix for all endpoints */
    routePrefix?: string
    /** Default HTTP method for handlers */
    defaultMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    /** Whether to include authentication by default */
    requireAuth?: boolean
  }
  
  /** Domain-specific configurations (for global generation) */
  domains?: Record<string, DomainConfig>
  
  /** Fastify-specific settings */
  fastify?: {
    /** Use fastify-zod-openapi plugin */
    useZodOpenApi?: boolean
    /** OpenAPI configuration */
    openapi?: {
      version?: string
      title?: string
      description?: string
    }
  }
}

export interface DomainConfig {
  /** Service factory function name pattern */
  serviceFactory?: string
  /** Dependencies type name pattern */
  dependenciesType?: string
  /** Custom import path for the service */
  servicePath?: string
  /** Route prefix for this domain */
  routePrefix?: string
  /** Whether this domain requires authentication */
  requireAuth?: boolean
  /** HTTP method overrides for specific operations */
  methodOverrides?: Record<string, 'GET' | 'POST' | 'PUT' | 'DELETE'>
}

/**
 * Default configuration for package-scoped generation
 */
export const DEFAULT_PACKAGE_CONFIG: Partial<PackageScopedConfig> = {
  routes: {
    prefix: '',
    defaultMethod: 'POST',
    requireAuth: false,
    methodOverrides: {}
  },
  fastify: {
    useZodOpenApi: true,
    outputFile: 'fastify-routes.ts'
  }
}

/**
 * Default configuration for global generation
 */
export const DEFAULT_CONFIG: AutogenConfig = {
  global: {
    routePrefix: '',
    defaultMethod: 'POST',
    requireAuth: false
  },
  fastify: {
    useZodOpenApi: true,
    openapi: {
      version: '1.0.0',
      title: 'Generated API',
      description: 'Auto-generated API from handler definitions'
    }
  }
}

/**
 * Load package-scoped configuration from directory
 */
export async function loadPackageConfig(packageDir: string): Promise<PackageScopedConfig> {
  const configPath = `${packageDir}/autogen/config.json`
  
  try {
    const { readFile } = await import('node:fs/promises')
    const configContent = await readFile(configPath, 'utf-8')
    const userConfig = JSON.parse(configContent) as Partial<PackageScopedConfig>
    
    // Merge with defaults
    return mergePackageConfig(DEFAULT_PACKAGE_CONFIG, userConfig)
  } catch (error) {
    throw new Error(`Failed to load package config from ${configPath}: ${error}`)
  }
}

/**
 * Load global configuration from file or use defaults
 */
export async function loadConfig(configPath?: string): Promise<AutogenConfig> {
  if (!configPath) {
    return DEFAULT_CONFIG
  }
  
  try {
    const { readFile } = await import('node:fs/promises')
    const configContent = await readFile(configPath, 'utf-8')
    const userConfig = JSON.parse(configContent) as Partial<AutogenConfig>
    
    // Deep merge with defaults
    return mergeConfig(DEFAULT_CONFIG, userConfig)
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}, using defaults:`, error)
    return DEFAULT_CONFIG
  }
}

/**
 * Deep merge package configuration objects
 */
function mergePackageConfig(
  base: Partial<PackageScopedConfig>, 
  override: Partial<PackageScopedConfig>
): PackageScopedConfig {
  return {
    package: { ...base.package, ...override.package } as PackageScopedConfig['package'],
    routes: { ...base.routes, ...override.routes } as PackageScopedConfig['routes'],
    fastify: { ...base.fastify, ...override.fastify } as PackageScopedConfig['fastify']
  }
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(base: AutogenConfig, override: Partial<AutogenConfig>): AutogenConfig {
  return {
    ...base,
    ...override,
    global: { ...base.global, ...override.global },
    domains: { ...base.domains, ...override.domains },
    fastify: { 
      ...base.fastify, 
      ...override.fastify,
      openapi: { ...base.fastify?.openapi, ...override.fastify?.openapi }
    }
  }
}

/**
 * Get domain-specific configuration with fallbacks (for global generation)
 */
export function getDomainConfig(config: AutogenConfig, domainName: string): Required<DomainConfig> {
  const domainConfig = config.domains?.[domainName] || {}
  
  return {
    serviceFactory: domainConfig.serviceFactory || `make${capitalize(domainName)}Service`,
    dependenciesType: domainConfig.dependenciesType || `${capitalize(domainName)}Dependencies`,
    servicePath: domainConfig.servicePath || `../packages/domain-${domainName}/index.js`,
    routePrefix: domainConfig.routePrefix || config.global?.routePrefix || '',
    requireAuth: domainConfig.requireAuth ?? config.global?.requireAuth ?? false,
    methodOverrides: domainConfig.methodOverrides || {}
  }
}

/**
 * Detect if running in package-scoped mode
 */
export async function detectPackageContext(): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    
    // Check if current directory has autogen/config.json
    const currentDir = process.cwd()
    const packageConfigPath = resolve(currentDir, 'autogen/config.json')
    
    try {
      await readFile(packageConfigPath, 'utf-8')
      return currentDir // Found package config
    } catch {
      // Check if we're in a subdirectory of a package
      const parts = currentDir.split('/')
      for (let i = parts.length - 1; i >= 0; i--) {
        const testDir = parts.slice(0, i + 1).join('/')
        const testConfigPath = resolve(testDir, 'autogen/config.json')
        try {
          await readFile(testConfigPath, 'utf-8')
          return testDir // Found package config in parent
        } catch {
          continue
        }
      }
    }
    
    return null // No package context found
  } catch {
    return null
  }
}

/**
 * Utility to capitalize strings
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
