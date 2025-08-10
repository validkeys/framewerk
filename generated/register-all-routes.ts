/**
 * Auto-generated main route registration
 * Generated at: 2025-08-10T18:34:24.187Z
 */
import type { FastifyInstance } from 'fastify'
import { registerAccountManagerRoutes } from './register-accountManager-routes.js'
import { registerUserManagerRoutes } from './register-userManager-routes.js'

export interface AllDependencies {
  accountManager: any // TODO: Import proper type
  userManager: any // TODO: Import proper type
}

export const registerAllRoutes = async (
  fastify: FastifyInstance,
  dependencies: AllDependencies
) => {
    await registerAccountManagerRoutes(fastify, { dependencies: dependencies.accountManager })
    await registerUserManagerRoutes(fastify, { dependencies: dependencies.userManager })
}