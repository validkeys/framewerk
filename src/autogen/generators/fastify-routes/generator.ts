/**
 * Generator for Fastify routes from handler definitions
 * Supports both package-scoped and global generation modes
 */
import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import type { Generator, GeneratorConfig, HandlerInfo } from "../../types.js"
import type { PackageScopedConfig } from "../../config.js"

export class FastifyRoutesGenerator implements Generator {
  name = "fastify-routes"

  async generate(handlers: HandlerInfo[], config: GeneratorConfig): Promise<void> {
    await mkdir(config.outputDir, { recursive: true })
    
    // Check if we're in package-scoped mode
    const packageConfig = config.options?.packageConfig
    
    if (packageConfig) {
      // Package-scoped generation
      await this.generatePackageRoutes(handlers, config, packageConfig)
    } else {
      // Global generation (legacy mode)
      await this.generateGlobalRoutes(handlers, config)
    }
  }

  /**
   * Generate routes for a single package
   */
  private async generatePackageRoutes(
    handlers: HandlerInfo[], 
    config: GeneratorConfig, 
    packageConfig: PackageScopedConfig
  ): Promise<void> {
    const routesContent = this.generatePackageRoutesFile(handlers, packageConfig)
    const typesContent = this.generatePackageTypesFile(handlers, packageConfig)
    
    const outputFile = packageConfig.fastify.outputFile || 'fastify-routes.ts'
    
    await writeFile(join(config.outputDir, outputFile), routesContent)
    await writeFile(join(config.outputDir, 'types.ts'), typesContent)
    
    console.log(`✅ Generated package routes in ${config.outputDir}`)
    console.log(`   - ${outputFile} (${handlers.length} handlers)`)
    console.log(`   - types.ts`)
  }

  /**
   * Generate single package routes file
   */
  private generatePackageRoutesFile(handlers: HandlerInfo[], config: PackageScopedConfig): string {
    const { package: pkg, fastify } = config
    
    const imports = this.generatePackageImports(config)
    const routeRegistrations = handlers.map(handler => 
      this.generatePackageRouteRegistration(handler, config)
    ).join('\n\n  ')

    return `/**
 * Auto-generated Fastify routes for ${pkg.name}
 * Generated at: ${new Date().toISOString()}
 */
import type { FastifyInstance } from 'fastify'
${fastify.useZodOpenApi ? `import type { ZodTypeProvider } from 'fastify-type-provider-zod'` : ''}
${imports}

export const register${this.capitalize(pkg.name)}Routes = async (
  fastify: FastifyInstance${fastify.useZodOpenApi ? '.withTypeProvider<ZodTypeProvider>()' : ''},
  dependencies: ${pkg.dependenciesType}
) => {
  const service = ${pkg.serviceFactory}(dependencies)
  
  ${routeRegistrations}
}

${this.generateErrorHandler()}`
  }

  /**
   * Generate imports for package mode
   */
  private generatePackageImports(config: PackageScopedConfig): string {
    const imports = [
      `import { ${config.package.serviceFactory} } from '${config.package.servicePath}'`,
      `import type { ${config.package.dependenciesType} } from '${config.package.servicePath}'`
    ]
    
    // TODO: Add schema imports when schema extraction is implemented
    // imports.push(`import { ListAccountsMethod } from '@framewerk/contracts/accountManager'`)
    
    return imports.join('\n')
  }

  /**
   * Generate route registration for package mode
   */
  private generatePackageRouteRegistration(handler: HandlerInfo, config: PackageScopedConfig): string {
    const { metadata } = handler
    const { routes, fastify } = config
    
    const httpMethod = routes.methodOverrides[metadata.operationId] || routes.defaultMethod
    const routePath = `${routes.prefix}/${metadata.operationId}`
    const serviceMethod = this.getServiceMethodName(handler.exportName, metadata.operationId)
    
    if (fastify.useZodOpenApi) {
      return `  // ${metadata.description}
  await fastify.${httpMethod.toLowerCase()}('${routePath}', {
    schema: {
      description: '${metadata.description}',
      tags: [${metadata.tags?.map(tag => `'${tag}'`).join(', ') || ''}],
      body: {}, // TODO: Extract actual schema from handler
      response: {
        200: {}, // TODO: Extract actual schema from handler
        ${metadata.errors.map(err => `${err.status}: {}`).join(',\n        ')}
      }
    }${routes.requireAuth ? ',\n    preHandler: [fastify.authenticate]' : ''}
  }, async (request, reply) => {
    const result = await service.${serviceMethod}(request.body)
    
    if (result.isErr()) {
      return handleError(reply, result.error)
    }
    
    return reply.send(result.value)
  })`
    } else {
      return `  // ${metadata.description}
  await fastify.${httpMethod.toLowerCase()}<{
    Body: any // TODO: Extract type from schema
    Reply: any // TODO: Extract type from schema  
  }>('${routePath}', {
    schema: {
      description: '${metadata.description}',
      tags: [${metadata.tags?.map(tag => `'${tag}'`).join(', ') || ''}],
      body: {}, // TODO: Convert Zod to JSON Schema
      response: {
        200: {}, // TODO: Convert Zod to JSON Schema
        ${metadata.errors.map(err => `${err.status}: {}`).join(',\n        ')}
      }
    }${routes.requireAuth ? ',\n    preHandler: [fastify.authenticate]' : ''}
  }, async (request, reply) => {
    const result = await service.${serviceMethod}(request.body)
    
    if (result.isErr()) {
      return handleError(reply, result.error)
    }
    
    return reply.send(result.value)
  })`
    }
  }

  /**
   * Generate types file for package mode
   */
  private generatePackageTypesFile(handlers: HandlerInfo[], config: PackageScopedConfig): string {
    return `/**
 * Auto-generated types for ${config.package.name} routes
 * Generated at: ${new Date().toISOString()}
 */

// Handler operation IDs for this package
export type HandlerOperationId = ${handlers.map(h => `'${h.metadata.operationId}'`).join(' | ') || 'never'}

// Handler export names for this package
export type HandlerExportName = ${handlers.map(h => `'${h.exportName}'`).join(' | ') || 'never'}

export interface PackageHandlerRegistry {
${handlers.map(h => `  '${h.metadata.operationId}': {
    operationId: '${h.metadata.operationId}'
    description: '${h.metadata.description}'
    exportName: '${h.exportName}'
    filePath: '${h.filePath}'
  }`).join(',\n')}
}`
  }

  /**
   * Legacy: Generate routes for global mode (cross-domain)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async generateGlobalRoutes(_handlers: HandlerInfo[], _config: GeneratorConfig): Promise<void> {
    // This would be the old implementation for monorepo-wide generation
    // For now, just throw an error to indicate this mode isn't fully implemented yet
    throw new Error("Global generation mode not yet implemented in package-scoped architecture")
  }

  /**
   * Get service method name from handler export name or operation ID
   */
  private getServiceMethodName(exportName: string, operationId: string): string {
    // For 'handler' exports, derive from operation ID
    if (exportName === 'handler') {
      // Convert 'accounts.list' -> 'listAccounts'
      const parts = operationId.split('.')
      if (parts.length >= 2) {
        return this.toCamelCase(parts[1] + this.capitalize(parts[0]))
      }
      return this.toCamelCase(operationId)
    }
    
    // For 'makeListAccountsHandler' exports, extract method name
    const match = exportName.match(/^make(.+)Handler$/)
    if (match) {
      return this.toCamelCase(match[1])
    }
    
    // Fallback to export name
    return exportName
  }

  private generateErrorHandler(): string {
    return `
/**
 * Handle errors from service methods
 */
function handleError(reply: any, error: unknown): void {
  // Check if it's one of our known error types with toHandlerError method
  if (error && typeof error === 'object' && 'toHandlerError' in error) {
    const handlerError = (error as any).toHandlerError()
    return reply.status(handlerError.status || 500).send(handlerError)
  }
  
  // Fallback for unknown errors
  reply.status(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  })
}`
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }
}

export const fastifyRoutesGenerator = new FastifyRoutesGenerator()
