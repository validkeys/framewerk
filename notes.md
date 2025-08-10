i think the generated fastify code should look like this:


```typescript

// For example, the domain-accountManager would export this
import { makeService  } from "./path/to/service"

export const registerFastifyRoutes = (f: FastifyInstance, options: {
  // These dependencies are included in the accountManager package
  // but perhaps we have a custom gen.config.json file to point to the the type
  // definition of the dependencies
  dependencies: Dependencies
}) => {
  const service = makeService(dependencies)

  for (handler in handlers) {
    fastify.post({
      Body: handler.$inputSchema,
      ...
    })
  }
}
```