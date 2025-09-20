# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a TypeScript-based Model Context Protocol (MCP) server that provides integration with the Qase test management platform. It exposes tools for managing test management entities (projects, cases, runs, results, plans, suites, and shared steps) through standardized MCP interfaces.

## Development Commands

### Building and Development
```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Development with auto-rebuild
npm run watch

# Prepare for distribution (builds and sets executable permissions)
npm run prepare
```

### Testing and Quality
```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Docker Development
```bash
# Build Docker image
npm run docker:build

# Start container with build (foreground)
npm run docker:start

# Start container in detached mode
npm run docker:start:detached

# Stop container
npm run docker:stop
```

### MCP Development
```bash
# Run MCP Inspector for debugging
npm run inspector

# Or with manual command (requires QASE_API_TOKEN environment variable)
npx @modelcontextprotocol/inspector build/index.js
```

## Architecture Overview

### Core Structure
- **Entry Point**: `src/index.ts` - Main MCP server setup with tool registration
- **Operations Layer**: `src/operations/` - Domain-specific API wrappers for each Qase entity
- **Utilities**: `src/utils.ts` - Shared API client, error handling, and response transformation
- **System Fields**: `src/system-field-options.ts` - Handles mapping between string/numeric field identifiers

### MCP Server Pattern
The server follows MCP specifications with three main capabilities:
- **Tools**: API operations exposed as callable tools (25+ tools for CRUD operations)
- **Resources**: Currently unused but available for future content exposure
- **Prompts**: Currently unused but available for future templated interactions

### API Client Architecture
- Uses `qaseio` npm package for Qase API integration
- Wraps all API calls with `neverthrow` for functional error handling
- Employs `ramda` for functional programming patterns (pipe, apply)
- Validates all inputs using `zod` schemas with automatic JSON schema generation

### Operations Pattern
Each operations file follows a consistent pattern:
1. **Schema Definitions**: Zod schemas for input validation (e.g., `GetCasesSchema`, `CreateCaseSchema`)
2. **Function Exports**: Functional composition using `pipe()` to chain API client → result transformation
3. **Type Safety**: Full TypeScript integration with Qase API types

### Error Handling Strategy
- All API calls return `ResultAsync` types for explicit error handling
- Centralized error formatting in `utils.ts`
- Pattern matching in main handler for comprehensive request routing

### Environment Configuration
- Requires `QASE_API_TOKEN` environment variable
- Docker setup includes HTTPS proxy capability with certificate mounting
- Development and production configurations separated

### Key Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `qaseio`: Official Qase API client
- `zod`: Runtime type validation and schema generation
- `neverthrow`: Functional error handling
- `ts-pattern`: Exhaustive pattern matching
- `ramda`: Functional programming utilities

## Development Notes

### Testing MCP Tools
Use the MCP Inspector for interactive testing of tools. It provides a web interface to call tools and inspect responses without needing to integrate with an MCP client.

### Docker Development Workflow
The Docker setup includes mcp-proxy for HTTPS exposure, useful when integrating with MCP clients that require secure connections. Certificates should be generated using mkcert and placed in the `certs/` directory.

### Schema Evolution
When modifying tool inputs, update the corresponding Zod schema in the operations files. The JSON schema is automatically generated from Zod schemas for MCP tool registration.

### API Token Security
The server validates the presence of `QASE_API_TOKEN` at startup and fails fast if not provided. This prevents runtime failures during API calls.