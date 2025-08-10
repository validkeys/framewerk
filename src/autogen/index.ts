/**
 * Main entry point for the autogen system
 */
export * from './types.js'
export * from './scanner.js'
export * from './generators/fastify-routes/generator.js'

// Re-export main functionality
export { scanHandlers } from './scanner.js'
export { fastifyRoutesGenerator } from './generators/fastify-routes/generator.js'
