import { ListAccountsMethod } from "@framewerk/contracts/accountManager/index.js"
import { parseJson } from "@framewerk/std/json.js"
import { AccountManagerCtx } from "../../types.ts"

import { AccountEntity } from "../../../core-contracts/entities.ts"
import { UncaughtDefectError } from "../../../core-contracts/errors.ts"

export const makeListAccountsHandler =
  (ctx: AccountManagerCtx): ListAccountsMethod.Type =>
  async (_input) => {
    console.log("[INFO] Listing accounts", _input)

    return (await ctx.Redis.get("accounts"))
      .andThen((value) =>
        parseJson<AccountEntity[]>(value ?? "[]").mapErr(
          (parseError) => new UncaughtDefectError("Failed to parse accounts", parseError),
        ),
      )
      .map((accounts) => ({ accounts }))
  }
