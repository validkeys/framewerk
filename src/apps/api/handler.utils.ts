import { FastifyRequest } from "fastify"
import { HandlerContext } from "@framewerk/core"


// example utility to generate a HandlerContext from a Fastify request
export const extractHandlerContext = (
  request: FastifyRequest
): HandlerContext => {
  const context: HandlerContext = {
    restRequest: request,
  }

  if ("state" in request && request.state) {
    const session = request.state as {
      actorType: "user"
      actorId: string
    }
    if (session) {
      context.actor = session
    }
  }

  return context
}
