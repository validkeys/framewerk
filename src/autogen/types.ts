/**
 * Core types for the autogen system
 */
import { z } from "zod"
import type { PackageScopedConfig } from "./config.js"

export interface HandlerMetadata {
  /** The operation ID for the handler */
  operationId: string
  /** Human-readable description */
  description: string
  /** Tags for grouping in documentation */
  tags?: string[]
  /** Authentication requirements */
  auth?: {
    required?: boolean
    scopes?: string[]
  }
  /** Whether this handler is private (excluded from public API) */
  private?: boolean
  /** Error definitions */
  errors: Array<{
    code: string
    status: number
    schema: z.ZodTypeAny
  }>
  /** Input schema */
  inputSchema: z.ZodTypeAny
  /** Output schema */
  outputSchema: z.ZodTypeAny
}

export interface HandlerInfo {
  /** File path where the handler is defined */
  filePath: string
  /** Export name of the handler */
  exportName: string
  /** Handler metadata extracted from the definition */
  metadata: HandlerMetadata
  /** The handler factory function (for runtime use) */
  handlerFactory?: (...args: unknown[]) => unknown
}

export interface ScanResult {
  /** All discovered handlers */
  handlers: HandlerInfo[]
  /** Any errors encountered during scanning */
  errors: Array<{
    filePath: string
    error: string
  }>
}

export interface GeneratorConfig {
  /** Name of the generator */
  name: string
  /** Output directory for generated files */
  outputDir: string
  /** Additional configuration specific to the generator */
  options?: GeneratorOptions
}

/**
 * Options that can be passed to generators
 */
export interface GeneratorOptions {
  /** Package-scoped configuration (when running in package mode) */
  packageConfig?: PackageScopedConfig
  /** Additional generator-specific options */
  [key: string]: unknown
}

export interface Generator {
  /** Generator name */
  name: string
  /** Generate files based on scanned handlers */
  generate(handlers: HandlerInfo[], config: GeneratorConfig): Promise<void>
}
