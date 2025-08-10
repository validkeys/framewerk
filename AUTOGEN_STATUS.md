# Framewerk Autogen System - Status & Roadmap

## 🎯 Project Goals & Vision

### Primary Objective
Build a comprehensive code generation system that automatically generates production-ready code from handler definitions **within individual packages** of the framewerk monorepo. The system should be:
- **Package-scoped**: Each domain package (domain-accountManager, domain-userManager) runs autogen independently
- **Type-safe**: Generate properly typed TypeScript code with Zod schema integration
- **Self-contained**: Each package has its own autogen folder and configuration
- **Configuration-driven**: Flexible configuration per package for different deployment scenarios
- **Production-ready**: Generate code that can be deployed without manual modifications

### Key Design Principles
1. **Package Independence**: Each package manages its own code generation
2. **Service Factory Pattern**: Use `makeXService(dependencies)` pattern from the current package
3. **Local Dependency Injection**: Inject dependencies at the package level
4. **Progressive Enhancement**: Start with basic functionality, add features incrementally
5. **Schema-First**: Extract and use actual Zod schemas from handlers for validation and documentation
6. **Multi-Generator Architecture**: Support multiple output formats per package

### Package-Centric Architecture
```
packages/domain-accountManager/
├── src/
│   ├── handlers/
│   │   └── listAccounts/
│   │       └── index.ts
│   └── index.ts (exports makeAccountManagerService)
├── autogen/              # Package-specific autogen
│   ├── generated/        # Generated code output
│   ├── config.json       # Package-specific config
│   └── cli.ts           # Package CLI (optional)
└── package.json

packages/domain-userManager/
├── src/
├── autogen/              # Separate autogen for this package
└── package.json
```

### CLI Usage Pattern
```bash
# Run from within a package directory
cd packages/domain-accountManager
npx framewerk-autogen --generator fastify-routes

# Or from monorepo root targeting specific package
npx framewerk-autogen --package domain-accountManager --generator fastify-routes
```

---

## 📊 Current Status

### ✅ Completed Milestones

#### Milestone 1: Core Infrastructure ✅
- [x] Created autogen directory structure (needs to be moved to package-level)
- [x] Implemented SWC-based TypeScript AST scanner
- [x] Created modular generator architecture
- [x] Built CLI interface with argument parsing
- [x] Added configuration system (needs package-scoped updates)

#### Milestone 2: Basic Handler Detection ✅
- [x] Scanner finds TypeScript files in package directories
- [x] Detects `export const handler = defineHandler(...)` patterns
- [x] Extracts operationId and description from defineHandler calls
- [x] Processes handlers within a single package context

#### Milestone 3: Package-Scoped Route Generation ✅
- [x] **COMPLETED**: Package-scoped architecture refactor
- [x] **COMPLETED**: CLI detects and works within package context
- [x] **COMPLETED**: Generates single package routes only  
- [x] **COMPLETED**: Uses package-local configuration
- [x] **COMPLETED**: Outputs to package's autogen/generated folder
- [x] **COMPLETED**: Service factory pattern with correct naming
- [x] **COMPLETED**: Smart method mapping (accounts.list → listAccounts)

### 🚧 Current Working State

**✅ MILESTONE 3.5 COMPLETE**: Package-scoped architecture successfully implemented!

**Working Example:** 
```bash
cd src/packages/domain-accountManager
npx tsx ../../../src/autogen/cli.ts --generator fastify-routes
# ✅ Generates: autogen/generated/fastify-routes.ts (package-scoped)
```

**Generated Output Quality:**
- ✅ Uses `makeAccountManagerService(dependencies)` 
- ✅ Correct method mapping: `service.listAccounts(request.body)`
- ✅ Configuration-driven: GET method, auth required, `/accounts/` prefix
- ✅ Package-local config: `autogen/config.json` 
- ✅ fastify-zod-openapi structure ready

---

## 🎯 Remaining Milestones

### Milestone 4: Schema Extraction & Integration 🔄 NEXT
**Priority: HIGH** - Core functionality for production use

#### Goals:
- Extract actual Zod schemas from `.input()` and `.output()` calls within current package
- Generate proper schema definitions for fastify-zod-openapi
- Support for complex schema types and imports

#### Tasks:
- [ ] Enhance AST scanner to detect `.input(ListAccountsMethod.$inputSchema.strict())` calls
- [ ] Extract schema references and import statements
- [ ] Generate proper schema imports in route files
- [ ] Handle schema methods like `.strict()` 
- [ ] Test with package-local handlers

#### Expected Output:
```typescript
// Instead of: body: {} // TODO
// Generate: body: ListAccountsMethod.$inputSchema.strict()
// With proper imports: import { ListAccountsMethod } from '@framewerk/contracts/accountManager'
```

### Milestone 5: Service Method Mapping 🔄 NEXT
**Priority: HIGH** - Critical for connecting routes to actual service methods

#### Goals:
- Map handler exports to actual service method names
- Support different naming conventions
- Handle method signatures and parameters

#### Tasks:
- [ ] Improve service method name detection from handler exports
- [ ] Map `export const handler` to service method names
- [ ] Support configurable method naming patterns
- [ ] Handle request context passing (FastifyRequest, etc.)

#### Expected Output:
```typescript
// Instead of: await service.handleRequest(request.body)
// Generate: await service.listAccounts(request.body)
```

### Milestone 6: Error Schema Generation 🟡 MEDIUM
**Priority: MEDIUM** - Improves API documentation and client generation

#### Goals:
- Extract error classes from handler definitions
- Generate proper error response schemas
- Map error codes to HTTP status codes

#### Tasks:
- [ ] Extract error classes from `.errors([...])` calls
- [ ] Generate error response schemas from AbstractError classes
- [ ] Map error codes to proper HTTP status codes
- [ ] Include error schemas in route definitions

### Milestone 7: Type System Integration 🟡 MEDIUM
**Priority: MEDIUM** - Improves type safety and developer experience

#### Goals:
- Import actual dependency types instead of `any`
- Generate proper TypeScript interfaces
- Support for generic types and complex dependencies

#### Tasks:
- [ ] Extract dependency types from domain package exports
- [ ] Generate proper type imports in registration files
- [ ] Replace `any` types with actual interfaces
- [ ] Support for generic service types

### Milestone 8: Advanced Configuration 🟢 LOW
**Priority: LOW** - Nice to have features for flexibility

#### Goals:
- Support for multiple deployment environments
- Custom route transformations
- Plugin-specific configurations

#### Tasks:
- [ ] Environment-specific configurations
- [ ] Custom route path transformations
- [ ] Plugin-specific option support
- [ ] Validation of configuration files

### Milestone 9: Additional Generators 🟢 FUTURE
**Priority: FUTURE** - Expand beyond Fastify routes

#### Goals:
- OpenAPI specification generation
- Postman collection generation
- Client SDK generation

#### Tasks:
- [ ] OpenAPI 3.0 specification generator
- [ ] Postman collection generator
- [ ] TypeScript client SDK generator
- [ ] Documentation generator

---

## 🔧 Technical Debt & Issues

### Known Issues:
1. **Schema Placeholders**: Currently using `{} // TODO` instead of actual schemas
2. **Method Name Hardcoding**: Using `handleRequest` instead of actual method names
3. **Type Safety**: Using `any` types in several places
4. **Error Handling**: `this.handleError` should be just `handleError`
5. **Import Paths**: May need adjustment for different deployment scenarios

### Performance Considerations:
- AST parsing is currently done for each file individually
- Could batch parse multiple files for better performance
- Schema serialization may need caching for large projects

### Testing Needs:
- Unit tests for scanner AST parsing
- Integration tests for end-to-end generation
- Validation tests for generated code compilation
- Configuration validation tests

---

## 🚀 Next Session Priorities

### Immediate Focus (Milestone 4 - Schema Extraction):
1. **Schema AST Parsing**: Enhance scanner to extract `.input(ListAccountsMethod.$inputSchema.strict())` calls
2. **Import Detection**: Extract and track schema import statements  
3. **Schema Integration**: Generate proper schema references in route files
4. **Testing**: Verify schemas work with actual handlers

### Success Criteria:
- Generated routes use actual Zod schema references instead of `{}`
- Routes include proper import statements for schema types
- Schema methods like `.strict()` are preserved
- At least the `listAccounts` handler works end-to-end with real schemas

### Code Locations to Focus On:
- `src/autogen/scanner.ts` - `extractHandlerMetadata()` method for `.input()/.output()` detection
- `src/autogen/generators/fastify-routes/generator.ts` - schema generation and imports
- `src/packages/domain-accountManager/handlers/listAccounts/index.ts` - test case with real schemas

### After Schema Success - Then Milestone 5:
Once schema extraction is working, proceed with service method mapping improvements.

---

## 📝 Configuration Reference

### Current Package-Scoped Configuration Structure:
```json
// packages/domain-accountManager/autogen/config.json
{
  "package": {
    "name": "accountManager",
    "serviceFactory": "makeAccountManagerService", 
    "dependenciesType": "AccountManagerDeps",
    "servicePath": "../src/index.js"
  },
  "routes": {
    "prefix": "/accounts",
    "defaultMethod": "POST",
    "requireAuth": true,
    "methodOverrides": {
      "accounts.list": "GET"
    }
  },
  "fastify": {
    "useZodOpenApi": true,
    "outputFile": "fastify-routes.ts"
  }
}
```

### Handler Pattern Expected (within package):
```typescript
// packages/domain-accountManager/src/handlers/listAccounts/index.ts
export const handler = defineHandler("accounts.list", "List accounts")
  .input(ListAccountsMethod.$inputSchema.strict())
  .output(ListAccountsMethod.$outputSchema)
  .errors([RedisConnectionError, JsonParseError, UncaughtDefectError])
  .withDependencies<AccountManagerDeps>()
  .resolver((deps) => async (input, ctx) => { ... })
```

### Expected Generated Output (within package):
```typescript
// packages/domain-accountManager/autogen/generated/fastify-routes.ts
import { makeAccountManagerService } from '../src/index.js'
import type { AccountManagerDeps } from '../src/types.js'
import { ListAccountsMethod } from '@framewerk/contracts/accountManager'

export const registerAccountManagerRoutes = (
  fastify: FastifyInstance,
  dependencies: AccountManagerDeps
) => {
  const service = makeAccountManagerService(dependencies)
  
  fastify.get('/accounts/accounts.list', {
    schema: {
      body: ListAccountsMethod.$inputSchema.strict(),
      response: { 200: ListAccountsMethod.$outputSchema }
    }
  }, async (request, reply) => {
    const result = await service.listAccounts(request.body)
    // ... error handling
  })
}
```

---

*Last Updated: 2025-08-10 - Status tracking document created*
*Next Update: After Milestone 4 completion*
