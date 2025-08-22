/**
 * Comprehensive tests for different MCP configuration formats
 * Tests parsing and validation of various MCP server configurations
 */

import { test, expect, describe, beforeEach } from 'bun:test'
import type { MCP } from '../../src/types'

// Mock the form parsing logic
function parseMCPFromJSON(jsonString: string): Omit<MCP, 'id' | 'usageCount' | 'tags'> | null {
  try {
    const parsed = JSON.parse(jsonString)
    
    if (parsed.mcpServers) {
      // Handle Claude/Gemini format like {"mcpServers": {"vercel": {"url": "https://mcp.vercel.com"}}}
      const firstServer = Object.entries(parsed.mcpServers)[0]
      if (firstServer) {
        const [name, config] = firstServer as [string, any]
        
        // Determine type based on config properties
        let type: 'stdio' | 'http' | 'sse' = 'stdio'
        if (config.url) {
          type = 'http' // Default HTTP for URL-based configs
        } else if (config.command) {
          type = 'stdio'
        }
        
        return {
          name,
          command: config.command,
          args: config.args || (config.command ? [] : undefined),
          env: config.env,
          type: config.type || type,
          url: config.url,
          headers: config.headers,
          alwaysAllow: config.alwaysAllow,
          category: 'general',
          description: 'Imported from JSON'
        }
      }
    } else if (parsed.url || parsed.command || parsed.name) {
      // Handle direct MCP config format
      let type: 'stdio' | 'http' | 'sse' = 'stdio'
      if (parsed.url) {
        type = 'http'
      }
      
      return {
        name: parsed.name || '',
        command: parsed.command,
        args: parsed.args || (parsed.command ? [] : undefined),
        env: parsed.env,
        type: parsed.type || type,
        url: parsed.url,
        headers: parsed.headers,
        description: parsed.description || '',
        alwaysAllow: parsed.alwaysAllow,
        category: 'general'
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

describe('MCP Format Parsing Tests', () => {
  describe('HTTP/SSE Server Configurations', () => {
    test('should parse Vercel HTTP format correctly', () => {
      const vercelConfig = {
        "mcpServers": {
          "vercel": {
            "url": "https://mcp.vercel.com"
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(vercelConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('vercel')
      expect(result?.url).toBe('https://mcp.vercel.com')
      expect(result?.type).toBe('http')
      expect(result?.command).toBeUndefined()
    })

    test('should parse Notion HTTP format with headers', () => {
      const notionConfig = {
        "mcpServers": {
          "notion": {
            "url": "https://mcp.notion.com/mcp",
            "type": "http",
            "headers": {
              "Authorization": "Bearer token123"
            }
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(notionConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('notion')
      expect(result?.url).toBe('https://mcp.notion.com/mcp')
      expect(result?.type).toBe('http')
      expect(result?.headers).toEqual({ "Authorization": "Bearer token123" })
    })

    test('should parse SSE server configuration', () => {
      const sseConfig = {
        "mcpServers": {
          "linear": {
            "url": "https://mcp.linear.app/sse",
            "type": "sse"
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(sseConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('linear')
      expect(result?.url).toBe('https://mcp.linear.app/sse')
      expect(result?.type).toBe('sse')
    })

    test('should parse HTTP server with environment variables', () => {
      const httpWithEnv = {
        "mcpServers": {
          "stripe": {
            "url": "https://mcp.stripe.com",
            "type": "http",
            "env": {
              "STRIPE_API_KEY": "sk_test_123",
              "STRIPE_WEBHOOK_SECRET": "whsec_456"
            }
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(httpWithEnv))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('stripe')
      expect(result?.url).toBe('https://mcp.stripe.com')
      expect(result?.type).toBe('http')
      expect(result?.env).toEqual({
        "STRIPE_API_KEY": "sk_test_123",
        "STRIPE_WEBHOOK_SECRET": "whsec_456"
      })
    })
  })

  describe('Stdio Server Configurations', () => {
    test('should parse GitHub stdio server correctly', () => {
      const githubConfig = {
        "mcpServers": {
          "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
              "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_123"
            }
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(githubConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('github')
      expect(result?.command).toBe('npx')
      expect(result?.args).toEqual(["-y", "@modelcontextprotocol/server-github"])
      expect(result?.type).toBe('stdio')
      expect(result?.env).toEqual({ "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_123" })
      expect(result?.url).toBeUndefined()
    })

    test('should parse stdio server with alwaysAllow', () => {
      const sqliteConfig = {
        "mcpServers": {
          "sqlite": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
            "alwaysAllow": ["read_query", "write_query"]
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(sqliteConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('sqlite')
      expect(result?.command).toBe('npx')
      expect(result?.alwaysAllow).toEqual(["read_query", "write_query"])
    })
  })

  describe('Direct Format Configurations', () => {
    test('should parse direct HTTP format', () => {
      const directHttp = {
        "name": "Custom API",
        "url": "https://api.example.com/mcp",
        "type": "http",
        "headers": {
          "X-API-Key": "key123"
        },
        "description": "Custom API server"
      }
      
      const result = parseMCPFromJSON(JSON.stringify(directHttp))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('Custom API')
      expect(result?.url).toBe('https://api.example.com/mcp')
      expect(result?.type).toBe('http')
      expect(result?.headers).toEqual({ "X-API-Key": "key123" })
      expect(result?.description).toBe('Custom API server')
    })

    test('should parse direct stdio format', () => {
      const directStdio = {
        "name": "Local Script",
        "command": "python",
        "args": ["/path/to/script.py"],
        "type": "stdio",
        "env": {
          "PYTHONPATH": "/custom/path"
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(directStdio))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('Local Script')
      expect(result?.command).toBe('python')
      expect(result?.args).toEqual(["/path/to/script.py"])
      expect(result?.type).toBe('stdio')
      expect(result?.env).toEqual({ "PYTHONPATH": "/custom/path" })
    })

    test('should infer type from URL in direct format', () => {
      const directWithUrl = {
        "name": "Inferred HTTP",
        "url": "https://example.com/mcp"
      }
      
      const result = parseMCPFromJSON(JSON.stringify(directWithUrl))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('Inferred HTTP')
      expect(result?.url).toBe('https://example.com/mcp')
      expect(result?.type).toBe('http') // Should infer HTTP from URL
    })
  })

  describe('Complex Multi-Server Configurations', () => {
    test('should parse first server from multi-server config', () => {
      const multiConfig = {
        "mcpServers": {
          "primary": {
            "url": "https://primary.example.com/mcp",
            "type": "http"
          },
          "secondary": {
            "command": "node",
            "args": ["server.js"],
            "type": "stdio"
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(multiConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('primary') // Should get first server
      expect(result?.url).toBe('https://primary.example.com/mcp')
      expect(result?.type).toBe('http')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty mcpServers object', () => {
      const emptyConfig = {
        "mcpServers": {}
      }
      
      const result = parseMCPFromJSON(JSON.stringify(emptyConfig))
      
      expect(result).toBeNull()
    })

    test('should handle malformed JSON', () => {
      const malformedJson = '{"mcpServers": {"test": {'
      
      const result = parseMCPFromJSON(malformedJson)
      
      expect(result).toBeNull()
    })

    test('should handle missing required fields gracefully', () => {
      const incompleteConfig = {
        "mcpServers": {
          "incomplete": {
            // Missing both url and command
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(incompleteConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('incomplete')
      expect(result?.type).toBe('stdio') // Default type
    })

    test('should handle configuration with type but no matching fields', () => {
      const mismatchedConfig = {
        "mcpServers": {
          "mismatched": {
            "type": "http",
            "command": "node server.js" // Command with HTTP type
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(mismatchedConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('mismatched')
      expect(result?.type).toBe('http') // Should preserve explicit type
      expect(result?.command).toBe('node server.js')
    })
  })

  describe('Real-world MCP Server Examples', () => {
    test('should parse Cloudflare MCP configuration', () => {
      const cloudflareConfig = {
        "mcpServers": {
          "cloudflare": {
            "url": "https://mcp.cloudflare.com",
            "type": "http",
            "headers": {
              "Authorization": "Bearer cf_token"
            },
            "env": {
              "CLOUDFLARE_ACCOUNT_ID": "account123",
              "CLOUDFLARE_ZONE_ID": "zone456"
            }
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(cloudflareConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('cloudflare')
      expect(result?.url).toBe('https://mcp.cloudflare.com')
      expect(result?.type).toBe('http')
      expect(result?.headers).toEqual({ "Authorization": "Bearer cf_token" })
      expect(result?.env).toEqual({
        "CLOUDFLARE_ACCOUNT_ID": "account123",
        "CLOUDFLARE_ZONE_ID": "zone456"
      })
    })

    test('should parse Figma MCP configuration', () => {
      const figmaConfig = {
        "mcpServers": {
          "figma-dev-mode-mcp-server": {
            "url": "http://127.0.0.1:3845/mcp",
            "type": "http"
          }
        }
      }
      
      const result = parseMCPFromJSON(JSON.stringify(figmaConfig))
      
      expect(result).toBeTruthy()
      expect(result?.name).toBe('figma-dev-mode-mcp-server')
      expect(result?.url).toBe('http://127.0.0.1:3845/mcp')
      expect(result?.type).toBe('http')
    })
  })
})