# @validkeys/framewerk - Development Plan & Status

## 🎯 Project Overview

**Package Name**: `@validkeys/framewerk`
**Goal**: Build a complete service/action architecture toolkit with type-safe builders and codegen support

Based on the README requirements, we need to implement:

### Core Components
1. **Handler System** ✅ (Complete)
2. **Service System** ✅ (Complete) 
3. **Type Contracts** ✅ (Complete)
4. **Introspection Support** ✅ (Basic - Complete)
5. **Package Structure** ❌ (Missing)

## 📋 Detailed Requirements Analysis

### From README Requirements:

1. **Services**: Key/value collections where key=handler name, value=implementation
2. **Service Dependencies**: Global dependencies required by all handlers in a service
3. **Service Make Method**: Instantiates service with dependencies, returns ready-to-use handlers
4. **defineService Builder**: Uses builder pattern with `.withServiceDependencies<T>()` and `.addHandler(name, impl)`
5. **Handler Integration**: Handlers defined with existing `defineHandler` method
6. **Contract Separation**: Service/handler types exportable as contracts for monorepo imports
7. **Codegen Support**: Data structures that support introspection for autogen
8. **Conventional Structure**: 
   - Handlers in `src/handlers/index.ts`
   - Service in `src/index.ts`

## 🎯 Implementation Milestones

### Milestone 1: Service Builder System 🎯 CURRENT FOCUS
**Priority**: CRITICAL - Core missing functionality

#### Goals:
- Implement `defineService()` builder with type-safe pattern
- Support `.withServiceDependencies<T>()` method
- Support `.addHandler(name, impl)` method  
- Generate service factory with proper type inference
- Integration with existing handler system

#### Tasks:
- [x] **Update HandlerMethod signature** to support 3-parameter pattern with merged context
- [x] **Add Options type system** for optional transaction/context parameters
- [x] **Create merged context type system** combining HandlerContext + ServiceDependencies
- [x] **Create service builder class** with progressive type refinement
- [x] **Implement service dependencies injection** via context merging
- [x] **Create service factory pattern** that merges deps into context
- [x] **Add handler registration and validation**
- [x] **Ensure type safety** throughout service definition with merged context
- [x] **Create service introspection metadata**
- [ ] **Migration strategy** for existing 2-param handlers

#### Expected Output:
```typescript
// Service Definition
export const accountService = defineService("AccountService")
  .withServiceDependencies<AccountDeps>()
  .addHandler("listAccounts", listAccountsHandler)
  .addHandler("createAccount", createAccountHandler)
  .build()

// Service Usage  
const service = accountService.make(dependencies)
const result = await service.listAccounts(input, options) // Clean 3-param API

// Handler Implementation (sees merged context)
const listAccountsHandler = defineHandler("listAccounts")
  .withInput<ListAccountsInput>()
  .withOutput<ListAccountsOutput>()
  .handler(async (input, options, ctx) => {
    // ctx.database (from ServiceDeps)
    // ctx.requestId (from HandlerContext)
    // ctx contains merged HandlerContext & ServiceDependencies
    return ok(await ctx.database.listAccounts(input.filters))
  })
```

### Milestone 2: Contract Type System ✅ COMPLETED
**Priority**: HIGH - Required for monorepo architecture

#### Goals:
- Extract service interfaces that can be imported without implementation
- Create handler type interfaces
- Support TypeScript declaration merging
- Enable import of service contracts across packages

#### Tasks:
- [x] Define service contract interfaces
- [x] Create handler contract types
- [x] Implement type extraction utilities
- [x] Add contract export patterns
- [x] Test contract imports in separate packages
- [x] Create monorepo usage examples

#### Expected Output:
```typescript
// Contract exports (no implementation)
export type UserServiceContract = ServiceHandlerContracts<typeof userService>

// Usage in other packages
import type { UserServiceContract } from '@my-org/user-service'

function useUserService(service: UserServiceContract) {
  // Full type safety without implementation dependency
}
```

### Milestone 3: Introspection & Metadata 🟡 MEDIUM
**Priority**: MEDIUM - Enables codegen capabilities

#### Goals:
- Add comprehensive metadata to services and handlers
- Support runtime introspection of service structure
- Enable automatic discovery of handlers and services
- Provide data structures for codegen tools

#### Tasks:
- [ ] Add service metadata collection
- [ ] Implement handler discovery mechanisms
- [ ] Create introspection API
- [ ] Add metadata export for codegen
- [ ] Test with simple codegen example

#### Expected Output:
```typescript
// Introspection API
const metadata = accountService.getMetadata()
// Returns: service name, handlers, dependencies, schemas, etc.

// Handler discovery
const handlers = service.getAllHandlers()
// Returns: Map of handler names to metadata
```

### Milestone 4: Package Structure & Examples 🟢 LOW
**Priority**: LOW - Polish and documentation

#### Goals:
- Create complete package structure example
- Add comprehensive documentation
- Create example implementations
- Prepare for npm publication

#### Tasks:
- [ ] Set up proper package.json structure
- [ ] Create example service implementations
- [ ] Add comprehensive README and docs
- [ ] Set up build and test infrastructure
- [ ] Prepare for extraction to separate repo

## 🚧 Current Implementation Status

### ✅ Completed Features:
- **Handler Builder**: Complete with type-safe builder pattern  
- **Service Builder**: Complete with type-safe builder pattern and dependency injection
- **Contract System**: Complete type extraction and monorepo support
- **Context Merging**: Service dependencies seamlessly merged into handler context
- **Progressive Types**: Builder pattern with compile-time validation for both handlers and services
- **Error System**: Comprehensive error handling with AbstractError base
- **Type System**: HandlerMethod, HandlerContext, ServiceHandler interfaces with 3-param signature
- **Options Support**: Optional transaction/context parameter system
- **Introspection**: Service metadata and contract extraction for codegen support
- **Monorepo Architecture**: Full contract system enabling cross-package type safety

### 🔄 In Progress:
- **Milestone 2**: ✅ COMPLETED - Contract Type System fully functional with monorepo support

### ❌ Missing Critical Features:
- **Advanced Introspection**: Enhanced metadata for complex codegen scenarios
- **Handler Migration**: No migration utilities for 2-param → 3-param handlers
- **Package Structure**: No complete example structure ready for npm publication
- **Documentation**: Comprehensive API documentation and examples

## 🎯 Next Session Priorities

### Immediate Focus (Milestone 1 - Service Builder):
1. **Create Service Builder**: Implement `defineService()` with builder pattern
2. **Dependencies System**: Add `.withServiceDependencies<T>()` support
3. **Handler Registration**: Implement `.addHandler(name, impl)` method
4. **Service Factory**: Create service instantiation with dependency currying
5. **Type Safety**: Ensure full type inference throughout

### Success Criteria:
- Can define services using builder pattern as shown in README
- Service factory properly curries handlers with dependencies
- Full type safety and inference works end-to-end
- Integration with existing handler system is seamless
- Ready for contract extraction (Milestone 2)

### Code Locations:
- `src/npm-framewerk/src/service.ts` - New service builder implementation
- `src/npm-framewerk/src/index.ts` - Main package exports
- `src/npm-framewerk/src/types.ts` - Service-related type definitions

## 🔧 Implementation Notes

### Key Design Decisions:
1. **Handler Signature Update**: Change from `(input, ctx?) => Result` to `(input, options?, ctx) => Result` with merged context
2. **Merged Context Pattern**: Context combines HandlerContext + ServiceDependencies for clean consumer API
3. **Service Factory Pattern**: Service.make() creates handlers with pre-merged context containing dependencies
4. **Builder Pattern Consistency**: Service builder should match handler builder UX
5. **Type Inference**: Must preserve type safety from service definition through usage
6. **Options Parameter**: New optional parameter for transactions, request context, etc.
7. **Metadata Preservation**: All information needed for codegen must be preserved

### Handler Signature Change:
**Current**: `(input, ctx?) => Promise<Result<Output, Error>>`
**New**: `(input, options?, ctx) => Promise<Result<Output, Error>>`

Where:
- `input`: Request/input data (existing)
- `options`: Optional parameter for transactions, request-specific context, etc. (NEW)
- `ctx`: Merged context = HandlerContext + ServiceDependencies (UPDATED - now required and merged)

### Context Merging Pattern:
**Definition Phase**: Handler expects `(input, options?, ctx)` where `ctx: HandlerContext & ServiceDeps`
**Service Factory**: `service.make(deps)` creates handlers with pre-merged context
**Consumer Usage**: Clean 3-parameter API with dependencies transparently injected via context

### Technical Challenges:
1. **Handler Signature Migration**: Update existing 2-param to 3-param signature with merged context
2. **Progressive Type System**: Service builder needs complex type state tracking  
3. **Handler Type Inference**: Need to infer handler types from service definition
4. **Options Type Safety**: Type-safe optional options parameter
5. **Context Merging**: Properly merge HandlerContext + ServiceDependencies with type safety
6. **Dependency Injection**: Transparent injection via service factory context merging
7. **Backward Compatibility**: Migration path for existing handlers
8. **Runtime/Compile-time Balance**: Metadata for codegen vs. runtime performance

---

**Status**: Ready to begin Milestone 1 implementation
**Next Update**: After completing service builder foundation
**Git Commit Points**: After each milestone completion
