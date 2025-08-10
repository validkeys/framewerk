/**
 * Auto-generated Fastify routes for userManager
 * Generated at: 2025-08-10T18:34:24.187Z
 */
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { makeUserManagerService } from '../packages/domain-userManager/index.js'
import type { UserManagerDependencies } from '../packages/domain-userManager/index.js'

export const registerUserManagerRoutes = async (
  fastify: FastifyInstance.withTypeProvider<ZodTypeProvider>(),
  options: {
    dependencies: UserManagerDependencies
  }
) => {
  const service = makeUserManagerService(options.dependencies)
  
    // List users
  await fastify.get('/users/user', {
    schema: {
      description: 'List users',
      tags: [],
      body: {} // TODO: Extract input schema from handler,
      response: {
        200: {} // TODO: Extract output schema from handler,
        
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await service.handleRequest(request.body)
    
    if (result.isErr()) {
      return this.handleError(reply, result.error)
    }
    
    return reply.send(result.value)
  })
}


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
}