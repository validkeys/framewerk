---
"@framewerk/core": minor
---

Introduce Effect-TS inspired tagged error system and fix TypeScript visibility issues

**Major Error System Improvements:**

**New Features:**
- Added `FramewerkError.tagged()` factory for creating tagged error classes with minimal boilerplate
- Added `TaggedError()` factory function for Effect-TS-like error creation
- Automatic `_tag` type inference for exhaustive error checking
- Enhanced type safety with literal `_tag` types for better IDE support

**Critical TypeScript Fixes:**
- **BREAKING FIX**: Resolved `HandlerMarker` visibility issues that caused "cannot be named" errors in consuming applications
- Handler factories now use proper interface abstraction to hide internal markers from public type signatures
- Made `HandlerMarker` non-enumerable to prevent it from appearing in JSON serialization or object iteration
- Improved type safety for exported handlers in consuming applications

**Developer Experience:**
- Reduced boilerplate: no need to manually define `_tag`, `errorCode`, or `handlerError` methods
- Better autocomplete and refactoring support with literal types
- Exhaustive error checking ensures all error cases are handled at compile-time
- Seamless integration with existing handler system and neverthrow Result types
- Fixed compilation errors when exporting handlers from consuming applications

**Example Usage:**
```typescript
// New tagged pattern (recommended)
class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
  static readonly httpStatus = 404
  constructor(userId?: string) {
    super(userId ? `User ${userId} not found` : "User not found")
  }
}

// Factory pattern
export const NetworkError = TaggedError("NetworkError")

// Exhaustive error handling with full type safety
const handleError = (error: UserNotFoundError | ValidationError) => {
  switch (error._tag) {
    case "UserNotFoundError": // ✅ Fully typed
      return handleUserNotFound(error)
    case "ValidationError": // ✅ Fully typed  
      return handleValidation(error)
    // TypeScript error if any cases are missing
  }
}

// Handler integration (resolvers return error instances)
export const getUserHandler = defineHandler("getUser", "Get user by ID")
  .input(z.object({ userId: z.string() }))
  .output(z.object({ id: z.string(), name: z.string() }))
  .errors([UserNotFoundError, DatabaseError] as const)
  .withDependencies<Dependencies>()
  .resolver((deps) => async (input) => {
    const user = await deps.db.findUser(input.userId)
    if (!user) {
      return err(new UserNotFoundError(input.userId)) // ✅ Return error instance
    }
    return ok(user)
  })
  .build()

// ✅ No more TypeScript "cannot be named" errors when exporting!
export { getUserHandler } // This now works in consuming applications
```

**Migration Notes:**
- Handler error integration: Resolvers should return error instances (not `.toHandlerError()` objects)
- The framework automatically converts error instances to the proper handler error format internally
- No changes needed for service handlers (they already worked correctly)

**Backward Compatibility:**
- `AbstractError` is now deprecated but fully backward compatible
- All existing error classes continue to work without changes
- Existing handler exports will now work without TypeScript errors
- Migration path provided with comprehensive examples

This enhancement brings framewerk's error handling in line with modern Effect-TS patterns while fixing critical TypeScript integration issues for consuming applications.
