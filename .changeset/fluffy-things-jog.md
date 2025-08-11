---
"@framewerk/core": patch
---

Refactored testing utilities, improved namespace API, and updated documentation

- Made testing.ts test-runner agnostic by removing direct vitest dependencies
- Moved generic mock factories and test fixtures to individual test files
- Cleaned up testing utilities to focus only on Framewerk-specific helpers
- Fixed namespace imports to work without vitest dependency conflicts
- Organized project structure: moved tests to src/__tests__ and examples to src/examples
- Updated README with new import strategies (namespace vs named exports)
- Added comprehensive error handling documentation with tagged error patterns
- Maintained backward compatibility for all existing APIs
- All tests passing with improved separation of concerns
