# Changelog

## 1.1.0

### Minor Changes

- Initial release of @framewerk/core

  ## Features Added

  - **Type-Safe Service Architecture**: Complete service/handler builder pattern with full TypeScript type safety
  - **Dependency Injection System**: Built-in DI with type-safe service dependencies
  - **Testing Utilities**: Comprehensive testing tools including ServiceTestHarness, MockFactories, and Result testing utilities
  - **Contract System**: Extract and share type-safe API contracts between monorepo packages
  - **Service Introspection**: Runtime metadata extraction and OpenAPI 3.0 generation
  - **Error Handling**: Built-in neverthrow Result types for robust error management
  - **Performance Testing**: Built-in performance measurement and testing utilities

  ## Core APIs

  - `defineService()` - Create type-safe service definitions
  - `defineHandler()` - Create individual handler definitions
  - `createServiceTestHarness()` - Comprehensive testing utilities
  - `ServiceInspector` - Runtime introspection and metadata
  - `createServiceContracts()` - Contract extraction for monorepos

  ## Package Information

  - Package name: `@framewerk/core`
  - Full TypeScript support with type definitions
  - Compatible with Node.js 18+
  - Zero runtime dependencies (peer dependency on neverthrow)
  - Comprehensive test coverage (46/47 tests passing)

  This is the foundational release that provides all core functionality for building scalable, type-safe service architectures.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of @framewerk/core
- Type-safe service and handler definition system
- Comprehensive testing utilities with MockFactories
- Contract system for monorepo package sharing
- Service introspection and OpenAPI generation
- Built-in error handling with neverthrow Result types
- Performance testing utilities
- Service registry for multi-service discovery

### Features

- 🎯 Type-Safe Service Architecture
- 🔧 Dependency Injection system
- 📝 Contract extraction and sharing
- 🧪 Comprehensive testing utilities
- 🔍 Runtime introspection and metadata
- 📦 Monorepo-ready architecture
