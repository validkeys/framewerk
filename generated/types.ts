/**
 * Auto-generated types for Fastify routes
 * Generated at: 2025-08-10T18:34:24.187Z
 */

// Handler operation IDs
export type HandlerOperationId = 'accounts.list' | 'user'

// Domain names
export type DomainName = 'accountManager' | 'userManager'

export interface HandlerMetadata {
  operationId: string
  description: string
  domain: string
  filePath: string
}

export const HANDLER_REGISTRY: Record<string, HandlerMetadata> = {
  'accounts.list': {
    operationId: 'accounts.list',
    description: 'List accounts',
    domain: 'accountManager',
    filePath: '/Users/kyledavis/Sites/framewerk/src/packages/domain-accountManager/handlers/listAccounts/index.ts'
  },
  'user': {
    operationId: 'user',
    description: 'List users',
    domain: 'userManager',
    filePath: '/Users/kyledavis/Sites/framewerk/src/packages/domain-userManager/handlers/listUsers.ts'
  }
}