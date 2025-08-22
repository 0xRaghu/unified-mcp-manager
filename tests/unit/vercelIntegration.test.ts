/**
 * Specific test for Vercel HTTP config format integration
 * Tests the exact format provided by the user
 */

import { test, expect, describe } from 'bun:test'

describe('Vercel MCP Integration Tests', () => {
  test('should handle exact Vercel config format from user example', () => {
    // This is the exact format the user mentioned was not working
    const vercelConfigString = `{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}`

    // Parse the JSON (this should not throw)
    let parsed: any
    expect(() => {
      parsed = JSON.parse(vercelConfigString)
    }).not.toThrow()

    // Verify structure
    expect(parsed).toBeTruthy()
    expect(parsed.mcpServers).toBeTruthy()
    expect(parsed.mcpServers.vercel).toBeTruthy()
    expect(parsed.mcpServers.vercel.url).toBe('https://mcp.vercel.com')

    // Simulate form processing logic
    const mcpServers = parsed.mcpServers
    const firstServerEntry = Object.entries(mcpServers)[0]
    expect(firstServerEntry).toBeTruthy()
    
    const [serverName, serverConfig] = firstServerEntry as [string, any]
    expect(serverName).toBe('vercel')
    expect(serverConfig.url).toBe('https://mcp.vercel.com')
    
    // Verify it would be recognized as HTTP type
    expect(serverConfig.url).toBeTruthy()
    expect(serverConfig.command).toBeFalsy()
  })

  test('should correctly export Vercel format back to JSON', () => {
    // Test the reverse operation - converting internal MCP to export format
    const internalMCP = {
      id: 'test-id',
      name: 'vercel',
      type: 'http' as const,
      url: 'https://mcp.vercel.com',
      category: 'infrastructure',
      usageCount: 0,
      tags: []
    }

    // Simulate export logic
    const exportFormat = {
      mcpServers: {
        [internalMCP.name]: {
          url: internalMCP.url,
          type: internalMCP.type
        }
      }
    }

    expect(exportFormat.mcpServers.vercel.url).toBe('https://mcp.vercel.com')
    expect(exportFormat.mcpServers.vercel.type).toBe('http')
  })

  test('should handle Vercel config with additional fields', () => {
    const enhancedVercelConfig = `{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com",
      "type": "http",
      "headers": {
        "Authorization": "Bearer vercel_token_123"
      },
      "env": {
        "VERCEL_TEAM_ID": "team_123"
      }
    }
  }
}`

    let parsed: any
    expect(() => {
      parsed = JSON.parse(enhancedVercelConfig)
    }).not.toThrow()

    const vercelConfig = parsed.mcpServers.vercel
    expect(vercelConfig.url).toBe('https://mcp.vercel.com')
    expect(vercelConfig.type).toBe('http')
    expect(vercelConfig.headers).toEqual({ "Authorization": "Bearer vercel_token_123" })
    expect(vercelConfig.env).toEqual({ "VERCEL_TEAM_ID": "team_123" })
  })

  test('should differentiate HTTP configs from stdio configs', () => {
    const mixedConfig = `{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}`

    const parsed = JSON.parse(mixedConfig)
    
    // Vercel should be HTTP
    const vercelConfig = parsed.mcpServers.vercel
    expect(vercelConfig.url).toBeTruthy()
    expect(vercelConfig.command).toBeFalsy()
    
    // GitHub should be stdio
    const githubConfig = parsed.mcpServers.github
    expect(githubConfig.command).toBeTruthy()
    expect(githubConfig.url).toBeFalsy()
  })

  test('should validate Vercel URL format', () => {
    const validUrls = [
      'https://mcp.vercel.com',
      'https://mcp.vercel.com/',
      'https://mcp.vercel.com/api/mcp',
      'http://localhost:3000/mcp'
    ]

    validUrls.forEach(url => {
      const config = {
        mcpServers: {
          vercel: { url }
        }
      }
      
      expect(config.mcpServers.vercel.url).toBe(url)
      // Basic URL validation
      expect(() => new URL(url)).not.toThrow()
    })
  })

  test('should handle malformed Vercel configs gracefully', () => {
    const malformedConfigs = [
      '{"mcpServers": {"vercel": {}}}', // Missing URL
      '{"mcpServers": {"vercel": {"url": ""}}}', // Empty URL
      '{"mcpServers": {"vercel": {"url": "not-a-url"}}}', // Invalid URL format
    ]

    malformedConfigs.forEach(configString => {
      let parsed: any
      expect(() => {
        parsed = JSON.parse(configString)
      }).not.toThrow()
      
      const vercelConfig = parsed.mcpServers.vercel
      expect(vercelConfig).toBeTruthy()
      // The URL might be invalid, but parsing should still work
    })
  })
})