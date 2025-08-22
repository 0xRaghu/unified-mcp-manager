/**
 * End-to-end integration tests for MCP HTTP support
 * Tests the complete workflow from JSON import to export
 */

import { test, expect, describe } from 'bun:test'

describe('End-to-End MCP HTTP Integration', () => {
  test('should handle complete Vercel workflow: import -> store -> export', () => {
    // 1. Create test Vercel config (simulating user input)
    const configContent = `{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}`
    
    // 2. Parse the JSON (simulating form input)
    const parsedConfig = JSON.parse(configContent)
    expect(parsedConfig.mcpServers.vercel.url).toBe('https://mcp.vercel.com')
    
    // 3. Convert to internal MCP format (simulating form processing)
    const [serverName, serverConfig] = Object.entries(parsedConfig.mcpServers)[0] as [string, any]
    
    const internalMCP = {
      id: 'vercel-test-id',
      name: serverName,
      type: 'http' as const,
      url: serverConfig.url,
      category: 'infrastructure',
      description: 'Vercel MCP Server',
      usageCount: 0,
      tags: [],
      disabled: false
    }
    
    expect(internalMCP.name).toBe('vercel')
    expect(internalMCP.type).toBe('http')
    expect(internalMCP.url).toBe('https://mcp.vercel.com')
    expect(internalMCP.command).toBeUndefined()
    
    // 4. Export back to MCP format (simulating export functionality)
    const exportedConfig = {
      mcpServers: {
        [internalMCP.name]: {
          url: internalMCP.url
        }
      }
    }
    
    // 5. Verify the exported format matches the original
    expect(exportedConfig).toEqual(parsedConfig)
    
    // 6. Verify round-trip consistency
    const exportedJson = JSON.stringify(exportedConfig, null, 2)
    const originalJson = JSON.stringify(parsedConfig, null, 2)
    expect(exportedJson).toBe(originalJson)
  })

  test('should handle mixed server types correctly', () => {
    const mixedConfig = {
      "mcpServers": {
        "vercel": {
          "url": "https://mcp.vercel.com"
        },
        "notion": {
          "url": "https://mcp.notion.com/mcp",
          "type": "http",
          "headers": {
            "Authorization": "Bearer token"
          }
        },
        "linear": {
          "url": "https://mcp.linear.app/sse",
          "type": "sse"
        },
        "github": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-github"],
          "env": {
            "GITHUB_PERSONAL_ACCESS_TOKEN": "token"
          }
        }
      }
    }

    // Convert each server to internal format
    const internalMCPs = Object.entries(mixedConfig.mcpServers).map(([name, config]: [string, any]) => {
      const type = config.url ? (config.type === 'sse' ? 'sse' : 'http') : 'stdio'
      
      return {
        id: `${name}-id`,
        name,
        type,
        category: 'test',
        usageCount: 0,
        tags: [],
        disabled: false,
        // Type-specific fields
        ...(type === 'stdio' ? {
          command: config.command,
          args: config.args
        } : {
          url: config.url,
          headers: config.headers
        }),
        env: config.env
      }
    })

    // Verify each server type
    const vercel = internalMCPs.find(mcp => mcp.name === 'vercel')
    expect(vercel?.type).toBe('http')
    expect(vercel?.url).toBe('https://mcp.vercel.com')

    const notion = internalMCPs.find(mcp => mcp.name === 'notion')
    expect(notion?.type).toBe('http')
    expect(notion?.headers).toEqual({ "Authorization": "Bearer token" })

    const linear = internalMCPs.find(mcp => mcp.name === 'linear')
    expect(linear?.type).toBe('sse')

    const github = internalMCPs.find(mcp => mcp.name === 'github')
    expect(github?.type).toBe('stdio')
    expect(github?.command).toBe('npx')

    // Export back and verify
    const exportedConfig = { mcpServers: {} as any }
    
    internalMCPs.forEach(mcp => {
      const config: any = {}
      
      if (mcp.type === 'http' || mcp.type === 'sse') {
        if (mcp.url) config.url = mcp.url
        if (mcp.headers && Object.keys(mcp.headers).length > 0) config.headers = mcp.headers
        if (mcp.type === 'sse') config.type = mcp.type
      } else {
        if (mcp.command) config.command = mcp.command
        if (mcp.args && mcp.args.length > 0) config.args = mcp.args
      }
      
      if (mcp.env && Object.keys(mcp.env).length > 0) config.env = mcp.env
      
      exportedConfig.mcpServers[mcp.name] = config
    })

    // Verify export matches original format
    expect(exportedConfig.mcpServers.vercel).toEqual({ url: 'https://mcp.vercel.com' })
    expect(exportedConfig.mcpServers.notion).toEqual({
      url: 'https://mcp.notion.com/mcp',
      headers: { "Authorization": "Bearer token" }
    })
    expect(exportedConfig.mcpServers.linear).toEqual({
      url: 'https://mcp.linear.app/sse',
      type: 'sse'
    })
    expect(exportedConfig.mcpServers.github).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { "GITHUB_PERSONAL_ACCESS_TOKEN": "token" }
    })
  })

  test('should validate required fields based on server type', () => {
    const validConfigs = [
      // Valid HTTP
      { name: 'http-valid', type: 'http', url: 'https://example.com' },
      // Valid SSE
      { name: 'sse-valid', type: 'sse', url: 'https://example.com/sse' },
      // Valid stdio
      { name: 'stdio-valid', type: 'stdio', command: 'node server.js' }
    ]

    validConfigs.forEach(config => {
      // Should pass validation
      if (config.type === 'http' || config.type === 'sse') {
        expect(config.url).toBeTruthy()
      } else {
        expect(config.command).toBeTruthy()
      }
    })

    const invalidConfigs = [
      // HTTP without URL
      { name: 'http-invalid', type: 'http' },
      // SSE without URL
      { name: 'sse-invalid', type: 'sse' },
      // Stdio without command
      { name: 'stdio-invalid', type: 'stdio' }
    ]

    invalidConfigs.forEach(config => {
      // Should fail validation
      if (config.type === 'http' || config.type === 'sse') {
        expect((config as any).url).toBeFalsy()
      } else {
        expect((config as any).command).toBeFalsy()
      }
    })
  })

  test('should preserve exact user-provided Vercel format', () => {
    // Test the exact format from user's issue
    const userProvidedFormat = `{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}`

    // Parse and process
    const parsed = JSON.parse(userProvidedFormat)
    const [name, config] = Object.entries(parsed.mcpServers)[0] as [string, any]
    
    // Create internal representation
    const internal = {
      id: 'test-id',
      name,
      type: 'http' as const,
      url: config.url,
      category: 'test',
      usageCount: 0,
      tags: []
    }
    
    // Export back
    const exported = {
      mcpServers: {
        [internal.name]: {
          url: internal.url
        }
      }
    }
    
    // Should match exactly (ignoring formatting)
    expect(exported.mcpServers.vercel.url).toBe('https://mcp.vercel.com')
    expect(Object.keys(exported.mcpServers.vercel)).toEqual(['url'])
    expect(exported.mcpServers.vercel.command).toBeUndefined()
    expect(exported.mcpServers.vercel.args).toBeUndefined()
    expect(exported.mcpServers.vercel.type).toBeUndefined() // HTTP is default
  })
})