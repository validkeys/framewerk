import { makeUserManagerService } from "../../packages/feat-userManager/index.ts"
import { makeAccountManagerService } from "../../packages/feat-accountManager/index.ts"
import { makeRedisService } from "../../packages/infra-redis/index.ts"

const startServer = async () => {
  const redis = makeRedisService()

  await redis.set(
    "accounts",
    JSON.stringify([
      { id: "1", name: "Account 1" },
      { id: "2", name: "Account 2" },
    ])
  )

  const userManager = makeUserManagerService({
    Redis: redis,
  })
  const accountManager = makeAccountManagerService({
    Redis: redis,
    UserManager: userManager,
  })

  const result = await accountManager.listAccounts({
    foo: "bar"
  })
  console.log("Accounts:", result)
}

startServer()
