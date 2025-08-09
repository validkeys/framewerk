import { Logger, Cache } from "./contracts.ts"
import { Service, createRuntime } from "./di.ts"
import { ConsoleLogger, MemoryCache } from "./services.ts"

const runtime = createRuntime({
  // Logger,
  // Cache,
})

const subprogram = async function* () {
  const cache = yield* Cache
  await cache.set("test", "[CACHED] Hello, World!", 1000 * 60 * 5) // Set cache with 5 min expiration
  const cacheValue = await cache.get("test")
  return cacheValue || "Cache miss"
}

const program = async function* () {
  const logger = yield* Logger
  logger.info("Hello, World!")
  const cacheValue = yield* subprogram()
  logger.info(`Cache value: ${cacheValue}`)
  return "Done"
}

const run = async () => {
  const result = await runtime.run(program(), {
    Logger: ConsoleLogger,
    Cache: MemoryCache,
  })
  console.log("Program result:", result)
}

run()
