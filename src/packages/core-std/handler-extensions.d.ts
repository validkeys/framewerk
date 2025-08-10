// Example of how to extend HandlerRequestBase interface
// Uncomment and modify the properties below to add custom fields to all handler requests

import { FastifyRequest } from "fastify"

declare module "@framewerk/std/handler" {
  interface HandlerContext {
    // Add your custom properties here
    actor?: {
      actorType: "user" | "service"
      actorId: string
    }
    restRequest?: FastifyRequest
  }
}
