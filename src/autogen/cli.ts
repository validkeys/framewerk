#!/usr/bin/env node

/**
 * CLI for framewerk autogen system
 * Supports both global (monorepo) and package-scoped generation
 */
import { parseArgs } from "node:util"
import { resolve } from "node:path"
import { scanHandlers } from "./scanner.js"
import { fastifyRoutesGenerator } from "./generators/fastify-routes/generator.js"
import { detectPackageContext, loadPackageConfig } from "./config.js"

const GENERATORS = {
  "fastify-routes": fastifyRoutesGenerator,
} as const

type GeneratorName = keyof typeof GENERATORS

interface CliArgs {
  generator: GeneratorName
  searchPath?: string
  outputDir?: string
  package?: string
  help: boolean
}

/**
 * Parse CLI arguments
 */
function parseCliArgs(): CliArgs {
  const { values } = parseArgs({
    options: {
      generator: {
        type: "string",
        short: "g",
      },
      "search-path": {
        type: "string",
        short: "s",
      },
      "output-dir": {
        type: "string",
        short: "o",
      },
      package: {
        type: "string",
        short: "p",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
  })

  return {
    generator: values.generator as GeneratorName,
    searchPath: values["search-path"],
    outputDir: values["output-dir"],
    package: values.package,
    help: values.help || false,
  }
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`framewerk-autogen - Generate code from handler definitions

Usage:
  framewerk-autogen [options]

Generation Modes:
  Package-scoped (recommended):
    Run from within a package directory with autogen/config.json
    
  Global (monorepo):
    Run from monorepo root to generate cross-package code

Options:
  --generator, -g <name>     Generator to use (fastify-routes)
  --search-path, -s <path>   Directory to search for handlers (default: auto-detect)
  --output-dir, -o <path>    Directory to output generated files (default: auto-detect)
  --package, -p <name>       Target specific package (for global mode)
  --help, -h                 Show this help message

Examples:
  # Package-scoped generation (run from within package)
  cd packages/domain-accountManager
  framewerk-autogen --generator fastify-routes
  
  # Global generation from monorepo root  
  framewerk-autogen --generator fastify-routes --search-path src/packages --output-dir generated

  # Target specific package from anywhere
  framewerk-autogen --generator fastify-routes --package domain-accountManager
`)
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const args = parseCliArgs()

    if (args.help) {
      showHelp()
      return
    }

    if (!args.generator) {
      console.error("❌ Generator is required. Use --generator <name>")
      showHelp()
      process.exit(1)
    }

    if (!(args.generator in GENERATORS)) {
      console.error(`❌ Unknown generator: ${args.generator}`)
      console.error(`Available generators: ${Object.keys(GENERATORS).join(", ")}`)
      process.exit(1)
    }

    // Detect if we're in package-scoped mode
    const packageContext = await detectPackageContext()
    
    if (packageContext) {
      // Package-scoped mode
      await runPackageScopedGeneration(args, packageContext)
    } else {
      // Global mode
      await runGlobalGeneration(args)
    }

    console.log("✨ Generation complete!")
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

/**
 * Run generation in package-scoped mode
 */
async function runPackageScopedGeneration(args: CliArgs, packageDir: string): Promise<void> {
  console.log("🔍 Running in package-scoped mode...")
  console.log(`   Package directory: ${packageDir}`)
  console.log(`   Generator: ${args.generator}`)

  // Load package configuration
  const config = await loadPackageConfig(packageDir)
  console.log(`   Package: ${config.package.name}`)

  // Set up paths
  const searchPath = resolve(args.searchPath || `${packageDir}`)
  const outputDir = resolve(args.outputDir || `${packageDir}/autogen/generated`)

  console.log(`   Search path: ${searchPath}`)
  console.log(`   Output directory: ${outputDir}`)

  // Scan for handlers in this package only
  console.log("")
  console.log("🔍 Scanning for handlers...")
  const scanResult = await scanHandlers({
    searchPath,
    extensions: [".ts", ".js"],
    ignore: ["node_modules", ".git", "dist", "autogen/generated"],
  })

  if (scanResult.errors.length > 0) {
    console.warn("⚠️  Scan warnings:")
    for (const error of scanResult.errors) {
      console.warn(`   ${error.filePath}: ${error.error}`)
    }
    console.log("")
  }

  if (scanResult.handlers.length === 0) {
    console.log("⚠️  No handlers found")
    return
  }

  console.log(`📊 Found ${scanResult.handlers.length} handlers:`)
  for (const handler of scanResult.handlers) {
    console.log(`   - ${handler.exportName} (${handler.metadata.operationId})`)
  }

  // Generate code
  console.log("")
  const generator = GENERATORS[args.generator]
  await generator.generate(scanResult.handlers, {
    name: args.generator,
    outputDir,
    options: { packageConfig: config },
  })
}

/**
 * Run generation in global mode (original behavior)
 */
async function runGlobalGeneration(args: CliArgs): Promise<void> {
  console.log("🔍 Running in global mode...")
  
  // Use provided paths or defaults
  const searchPath = resolve(args.searchPath || "./src")
  const outputDir = resolve(args.outputDir || "./generated")
  
  console.log(`   Search path: ${searchPath}`)
  console.log(`   Generator: ${args.generator}`)
  console.log(`   Output directory: ${outputDir}`)

  // Scan for handlers
  console.log("")
  console.log("🔍 Scanning for handlers...")
  const scanResult = await scanHandlers({
    searchPath,
    extensions: [".ts", ".js"],
    ignore: ["node_modules", ".git", "dist"],
  })

  if (scanResult.errors.length > 0) {
    console.warn("⚠️  Scan warnings:")
    for (const error of scanResult.errors) {
      console.warn(`   ${error.filePath}: ${error.error}`)
    }
    console.log("")
  }

  if (scanResult.handlers.length === 0) {
    console.log("⚠️  No handlers found")
    return
  }

  console.log(`📊 Found ${scanResult.handlers.length} handlers:`)
  for (const handler of scanResult.handlers) {
    console.log(`   - ${handler.exportName} (${handler.metadata.operationId})`)
  }

  // Generate code
  console.log("")
  const generator = GENERATORS[args.generator]
  await generator.generate(scanResult.handlers, {
    name: args.generator,
    outputDir,
    options: {},
  })
}

// Run the CLI
main().catch((error) => {
  console.error("❌ Error parsing arguments:", error)
  showHelp()
  process.exit(1)
})
