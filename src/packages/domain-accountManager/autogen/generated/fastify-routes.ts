/**
 * Auto-generated Fastify routes for accountManager
 * Generated at: 2025-08-10T18:49:02.235Z
 */
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { makeAccountManagerService } from '../src/index.js'
import type { AccountManagerDeps } from '../src/index.js'

export const registerAccountManagerRoutes = async (
  fastify: FastifyInstance.withTypeProvider<ZodTypeProvider>(),
  dependencies: AccountManagerDeps
) => {
  const service = makeAccountManagerService(dependencies)
  
    // List accounts
  await fastify.get('/accounts/accounts.list', {
    schema: {
      description: 'List accounts',
      tags: [],
      body: {}, // TODO: Extract actual schema from handler
      response: {
        200: {}, // TODO: Extract actual schema from handler
        
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await service.listAccounts(request.body)
    
    if (result.isErr()) {
      return handleError(reply, result.error)
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