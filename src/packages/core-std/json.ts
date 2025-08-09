import { ok, err, Result } from "@framewerk/contracts/result.js"
import { UncaughtDefectError } from "@framewerk/contracts/errors.js"

export const parseJson = <T>(
  jsonString: string
): Result<T, UncaughtDefectError> => {
  try {
    const parsed = JSON.parse(jsonString)
    return ok(parsed as T)
  } catch (e) {
    return err(new UncaughtDefectError("Failed to parse JSON", e))
  }
}
