# MCP HTTP/SSE Support Implementation

## Overview

This document describes the comprehensive implementation of HTTP and Server-Sent Events (SSE) MCP server support in the MCP Manager UI. This implementation fixes the issues with HTTP request handling and storage, providing full support for all MCP transport types.

## Issues Fixed

### 1. Type Definition Problems
- **Issue**: The MCP interface required a `command` field, but HTTP/SSE servers use URLs instead
- **Fix**: Made `command` optional and added `url` and `headers` fields for HTTP/SSE configurations

### 2. Form Handling Issues  
- **Issue**: Form used separate `url` field but didn't properly map it to MCP data structure
- **Fix**: Updated form to handle type-specific fields and validation

### 3. JSON Parsing Problems
- **Issue**: Parser didn't handle HTTP configurations like Vercel's format properly
- **Fix**: Implemented comprehensive JSON parsing supporting all MCP formats

### 4. Export Functionality Issues
- **Issue**: Export didn't handle HTTP/SSE formats correctly
- **Fix**: Updated export logic to generate proper configurations for each transport type

## Supported Formats

### 1. HTTP Servers (like Vercel)
```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

### 2. SSE Servers (like Linear)
```json
{
  "mcpServers": {
    "linear": {
      "url": "https://mcp.linear.app/sse",
      "type": "sse"
    }
  }
}
```

### 3. HTTP with Headers and Environment
```json
{
  "mcpServers": {
    "notion": {
      "url": "https://mcp.notion.com/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer your-token"
      },
      "env": {
        "NOTION_API_KEY": "secret_key"
      }
    }
  }
}
```

### 4. Traditional Stdio Servers
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_token"
      }
    }
  }
}
```

## Key Changes

### Type Definitions (`src/types/index.ts`)
- Made `command` and `args` optional
- Made `type` field required
- Added `url` and `headers` fields for HTTP/SSE support
- Updated form interfaces to support all transport types

### Form Component (`src/components/MCPForm.tsx`)
- Added conditional UI for HTTP/SSE configurations
- Implemented proper validation based on transport type
- Enhanced JSON parsing to handle all MCP formats
- Added header management for HTTP/SSE servers

### Store Logic (`src/stores/mcpStore.ts`)
- Updated export function to handle all transport types correctly
- Fixed import function to properly recognize HTTP/SSE configurations
- Implemented type inference based on configuration properties

## Validation Rules

### HTTP/SSE Servers
- **Required**: `url` field must be provided
- **Optional**: `headers` for authentication/configuration
- **Optional**: `env` for environment variables
- **Type**: Defaults to 'http' if URL is provided, 'sse' if explicitly set

### Stdio Servers
- **Required**: `command` field must be provided
- **Optional**: `args` for command line arguments
- **Optional**: `env` for environment variables
- **Type**: Defaults to 'stdio'

## Testing

Comprehensive test suites have been implemented:

### 1. Format Parsing Tests (`tests/unit/mcpFormats.test.ts`)
- Tests parsing of various MCP configuration formats
- Covers HTTP, SSE, and stdio configurations
- Tests edge cases and error handling

### 2. Vercel Integration Tests (`tests/unit/vercelIntegration.test.ts`)
- Specific tests for the Vercel HTTP format
- Validates exact format matching
- Tests round-trip import/export

### 3. Export Functionality Tests (`tests/unit/exportFunctionality.test.ts`)
- Tests export of all server types
- Validates proper format generation
- Tests mixed server type exports

### 4. End-to-End Integration Tests (`tests/unit/endToEndIntegration.test.ts`)
- Tests complete workflow from import to export
- Validates data consistency
- Tests real-world scenarios

## Usage Examples

### Adding Vercel MCP Server
1. Click "Add MCP" button
2. Select transport type: "HTTP"
3. Enter name: "vercel"
4. Enter URL: "https://mcp.vercel.com"
5. Save

### Importing from JSON
1. Click "Add MCP" button
2. Click "Paste JSON" 
3. Paste Vercel configuration:
   ```json
   {
     "mcpServers": {
       "vercel": {
         "url": "https://mcp.vercel.com"
       }
     }
   }
   ```
4. Click "Parse & Import"

### Exporting HTTP Servers
The export functionality now correctly generates HTTP server configurations:
- HTTP servers export with `url` field
- SSE servers export with `url` and `type: "sse"`
- Headers are preserved in the export
- Environment variables are maintained

## Backward Compatibility

All existing stdio MCP configurations continue to work without changes. The implementation maintains full backward compatibility while adding support for new transport types.

## Future Enhancements

1. **Authentication Flow**: Add OAuth 2.0 support for servers requiring authentication
2. **Connection Testing**: Implement connection testing for HTTP/SSE endpoints
3. **Header Templates**: Provide common header templates for popular services
4. **URL Validation**: Enhanced URL validation and formatting
5. **Batch Import**: Support for importing multiple server configurations at once

## Migration Guide

### For Existing Users
No action required. Existing stdio configurations will continue to work as before.

### For New HTTP/SSE Servers
1. Use the new transport type selection in the form
2. Provide URL instead of command
3. Add headers if authentication is required
4. Test connection to verify configuration

## Technical Notes

### Type Inference
The system automatically infers the transport type based on configuration:
- If `url` is present → HTTP (default) or SSE (if type specified)
- If `command` is present → stdio
- Explicit `type` field overrides inference

### Export Optimization
The export function only includes necessary fields:
- HTTP servers: Only includes `url`, `headers`, `env` if present
- SSE servers: Includes `type: "sse"` to differentiate from HTTP
- Stdio servers: Only includes `command`, `args`, `env` if present

### Form Validation
Real-time validation ensures:
- HTTP/SSE servers must have valid URLs
- Stdio servers must have valid commands
- Required fields are highlighted
- Type-specific fields are shown/hidden appropriately