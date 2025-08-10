/**
 * Scanner for finding and parsing handler definitions using SWC
 */
import { readFile, readdir, stat } from "node:fs/promises"
import { join } from "node:path"
import { parseSync } from "@swc/core"
import { z } from "zod"
import type { Module, ExportDeclaration, VariableDeclaration } from "@swc/types"
import type { HandlerInfo, ScanResult } from "./types.js"

export interface ScanOptions {
  /** Base directory to search for handlers */
  searchPath: string
  /** File extensions to scan (default: ['.ts', '.js']) */
  extensions?: string[]
  /** Patterns to ignore (default: ['node_modules', '.git', 'dist']) */
  ignore?: string[]
}

export class HandlerScanner {
  private readonly extensions: string[]
  private readonly ignore: string[]

  constructor(private options: ScanOptions) {
    this.extensions = options.extensions || ['.ts', '.js']
    this.ignore = options.ignore || ['node_modules', '.git', 'dist', 'build']
  }

  /**
   * Scan for all handlers in the specified directory
   */
  async scan(): Promise<ScanResult> {
    const handlers: HandlerInfo[] = []
    const errors: Array<{ filePath: string; error: string }> = []

    try {
      const files = await this.findFiles(this.options.searchPath)
      
      for (const filePath of files) {
        try {
          const handlerInfos = await this.parseFile(filePath)
          handlers.push(...handlerInfos)
        } catch (error) {
          errors.push({
            filePath,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    } catch (error) {
      errors.push({
        filePath: this.options.searchPath,
        error: `Failed to scan directory: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    return { handlers, errors }
  }

  /**
   * Recursively find all TypeScript/JavaScript files
   */
  private async findFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await readdir(dir)
      
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const stats = await stat(fullPath)
        
        if (stats.isDirectory()) {
          // Skip ignored directories
          if (this.ignore.some(pattern => entry.includes(pattern))) {
            continue
          }
          
          const subFiles = await this.findFiles(fullPath)
          files.push(...subFiles)
        } else if (stats.isFile()) {
          // Check if file has a valid extension
          if (this.extensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error)
    }
    
    return files
  }

  /**
   * Parse a single file and extract handler definitions
   */
  private async parseFile(filePath: string): Promise<HandlerInfo[]> {
    const content = await readFile(filePath, 'utf-8')
    const handlers: HandlerInfo[] = []

    try {
      // Parse the file with SWC
      const ast = parseSync(content, {
        syntax: "typescript",
        tsx: false,
        decorators: true,
        dynamicImport: true,
      })

      // Look for exports that use defineHandler
      handlers.push(...this.extractHandlers(ast, filePath))
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
    }

    return handlers
  }

  /**
   * Extract handler definitions from the AST
   * Looks for: export const handler = defineHandler(...)
   */
  private extractHandlers(ast: Module, filePath: string): HandlerInfo[] {
    const handlers: HandlerInfo[] = []

    for (const item of ast.body) {
      if (item.type === "ExportDeclaration") {
        const exportDecl = item as ExportDeclaration
        
        if (exportDecl.declaration?.type === "VariableDeclaration") {
          const varDecl = exportDecl.declaration as VariableDeclaration
          
          for (const declarator of varDecl.declarations) {
            // Check if this is: const handler = defineHandler(...)
            if (
              declarator.id.type === "Identifier" &&
              declarator.id.value === "handler" &&
              declarator.init &&
              this.isDefineHandlerCall(declarator.init)
            ) {
              const metadata = this.extractHandlerMetadata(declarator.init)
              if (metadata) {
                handlers.push({
                  filePath,
                  exportName: "handler",
                  metadata
                })
              }
            }
          }
        }
      }
    }

    return handlers
  }

  /**
   * Check if a node is a defineHandler call (possibly chained)
   */
  private isDefineHandlerCall(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false
    
    const expr = node as Record<string, unknown>
    
    // Check for direct defineHandler call: defineHandler(...)
    if (expr.type === 'CallExpression') {
      const callee = expr.callee as Record<string, unknown>
      if (callee?.type === 'Identifier' && callee.value === 'defineHandler') {
        return true
      }
    }
    
    // Check for chained calls: defineHandler(...).input(...).output(...)
    if (expr.type === 'CallExpression') {
      const callee = expr.callee as Record<string, unknown>
      if (callee?.type === 'MemberExpression') {
        return this.isDefineHandlerCall(callee.object)
      }
    }
    
    return false
  }

  /**
   * Extract metadata from a defineHandler call chain
   */
  private extractHandlerMetadata(node: unknown): HandlerInfo['metadata'] | null {
    try {
      const expr = node as Record<string, unknown>
      
      // Find the initial defineHandler call to get operationId and description
      const defineHandlerCall = this.findDefineHandlerCall(expr)
      if (!defineHandlerCall) {
        console.warn('No defineHandler call found in:', JSON.stringify(expr, null, 2))
        return null
      }
      
      const args = defineHandlerCall.arguments as unknown[]
      const operationId = this.extractStringLiteral(args?.[0])
      const description = this.extractStringLiteral(args?.[1])
      
      console.log('Found defineHandler call with:', { operationId, description })
      
      // Extract schema information from method chain
      const inputSchema = this.extractSchemaFromChain(expr, 'input')
      const outputSchema = this.extractSchemaFromChain(expr, 'output')
      const errors = this.extractErrorsFromChain(expr)
      
      return {
        operationId: operationId || 'unknown',
        description: description || 'No description',
        tags: [],
        auth: undefined,
        private: false,
        errors: errors,
        inputSchema: inputSchema || z.unknown(),
        outputSchema: outputSchema || z.unknown()
      }
    } catch (error) {
      console.warn('Failed to extract handler metadata:', error)
      return null
    }
  }

  /**
   * Find the defineHandler call in a potentially chained expression
   */
  private findDefineHandlerCall(node: unknown): Record<string, unknown> | null {
    if (!node || typeof node !== 'object') return null
    
    const expr = node as Record<string, unknown>
    
    if (expr.type === 'CallExpression') {
      const callee = expr.callee as Record<string, unknown>
      
      // Check if this is the defineHandler call
      if (callee?.type === 'Identifier' && callee.value === 'defineHandler') {
        return expr
      }
      
      // Check if this is a chained call and recurse
      if (callee?.type === 'MemberExpression') {
        return this.findDefineHandlerCall(callee.object)
      }
    }
    
    return null
  }

  /**
   * Extract string value from a string literal node
   */
  private extractStringLiteral(node: unknown): string | null {
    if (!node || typeof node !== 'object') {
      console.log('Not an object:', node)
      return null
    }
    
    const literal = node as Record<string, unknown>
    console.log('Checking literal node:', JSON.stringify(literal, null, 2))
    
    // Check if it's directly a StringLiteral
    if (literal.type === 'StringLiteral') {
      console.log('Found string literal:', literal.value)
      return literal.value as string
    }
    
    // Check if it's wrapped in an expression object
    if (literal.expression && typeof literal.expression === 'object') {
      const expr = literal.expression as Record<string, unknown>
      if (expr.type === 'StringLiteral') {
        console.log('Found string literal in expression:', expr.value)
        return expr.value as string
      }
    }
    
    return null
  }
  
  /**
   * Extract schema from method chain (e.g., .input() or .output() calls)
   */
  private extractSchemaFromChain(_node: unknown, _methodName: string): z.ZodTypeAny | null {
    // For now, return null - we'll improve this later with actual AST parsing
    return null
  }
  
  /**
   * Extract errors from .errors() call in method chain
   */
  private extractErrorsFromChain(_node: unknown): Array<{code: string, status: number, schema: z.ZodTypeAny}> {
    // For now, return empty array - we'll improve this later with actual AST parsing
    return []
  }
}

/**
 * Convenience function to scan for handlers in a directory
 */
export async function scanHandlers(options: ScanOptions): Promise<ScanResult> {
  const scanner = new HandlerScanner(options)
  return scanner.scan()
}
