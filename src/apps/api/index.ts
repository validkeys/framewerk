import { makeUserManagerService } from "@framewerk/userManager/index"
import { makeAccountManagerService } from "@framewerk/accountManager/index"
import { makeRedisService } from "@framewerk/infra-redis/index"

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

  const result = await accountManager.listAccounts(
    {
      accountType: "RRIF",
    },
    {
      foo: "bar",
    }
  )

  if (result.isErr()) {
    console.error("Error listing accounts:", result.error)
    return
  }
  console.log("Accounts:", result.value)
}

startServer()
