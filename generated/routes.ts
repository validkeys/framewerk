/**
 * Auto-generated Fastify routes
 * Generated at: 2025-08-10T18:22:50.840Z
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { handler } from './src/packages/domain-accountManager/handlers/listAccounts/index.ts'
import { handler } from './src/packages/domain-userManager/handlers/listUsers.ts'

export interface RouteContext {
  // Add your dependency injection context here
  [key: string]: unknown
}

export async function registerRoutes(
  fastify: FastifyInstance,
  context: RouteContext
): Promise<void> {
    // List accounts
  fastify.post<{
    Body: any // TODO: Generate from input schema
    Reply: any // TODO: Generate from output schema
  }>('/accounts.list', {
    schema: {
      description: 'List accounts',
      tags: [],
      body: {}, // TODO: Generate from input schema
      response: {
        200: {}, // TODO: Generate from output schema
        
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const handlerFactory = handler(context as any)
      const result = await handlerFactory.method(request.body)
      
      if (result.isErr()) {
        return handleError(reply, result.error)
      }
      
      return reply.send(result.value)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      })
    }
  })

    // List users
  fastify.post<{
    Body: any // TODO: Generate from input schema
    Reply: any // TODO: Generate from output schema
  }>('/user', {
    schema: {
      description: 'List users',
      tags: [],
      body: {}, // TODO: Generate from input schema
      response: {
        200: {}, // TODO: Generate from output schema
        
      }
    }
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const handlerFactory = handler(context as any)
      const result = await handlerFactory.method(request.body)
      
      if (result.isErr()) {
        return handleError(reply, result.error)
      }
      
      return reply.send(result.value)
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      })
    }
  })
}


/**
 * Handle errors from handlers
 */
function handleError(reply: FastifyReply, error: unknown): void {
  // Check if it's one of our known error types
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
