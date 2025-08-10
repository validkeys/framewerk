import {
  JsonParseError
} from "packages/core-framewerk/errors.js"
import { err, ok, Result } from "@framewerk/contracts/result.js"

export const parseJson = <T>(jsonString: string): Result<T, JsonParseError> => {
  try {
    const parsed = JSON.parse(jsonString)
    return ok(parsed as T)
  } catch (e) {
    return err(new JsonParseError("Failed to parse JSON", e))
  }
}
