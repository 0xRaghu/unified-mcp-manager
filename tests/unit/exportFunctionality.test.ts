/**
 * Tests for MCP export functionality
 * Verifies that HTTP/SSE and stdio configurations export correctly
 */

import { test, expect, describe } from 'bun:test'
import type { MCP } from '../../src/types'

// Mock export function from the store
function exportMCPs(mcps: MCP[], format: 'claude' | 'gemini' | 'universal' = 'universal') {
  const mcpServers: Record<string, any> = {};

  mcps.forEach(mcp => {
    const config: any = {};

    // Handle different transport types
    if (mcp.type === 'http' || mcp.type === 'sse') {
      // HTTP/SSE server configuration
      if (mcp.url) {
        config.url = mcp.url;
      }
      if (mcp.headers && Object.keys(mcp.headers).length > 0) {
        config.headers = mcp.headers;
      }
      if (mcp.type !== 'http') {
        config.type = mcp.type;
      }
    } else {
      // Stdio server configuration (default)
      if (mcp.command) {
        config.command = mcp.command;
      }
      if (mcp.args && mcp.args.length > 0) {
        config.args = mcp.args;
      }
    }

    // Common fields for all types
    if (mcp.env && Object.keys(mcp.env).length > 0) {
      config.env = mcp.env;
    }
    if (mcp.alwaysAllow && mcp.alwaysAllow.length > 0) {
      config.alwaysAllow = mcp.alwaysAllow;
    }

    // Format-specific adjustments
    if (format === 'claude') {
      if (mcp.disabled) config.disabled = true;
    }

    // Only add type field if it's not the default for the configuration
    if ((mcp.type === 'http' || mcp.type === 'sse') && mcp.url) {
      // For HTTP/SSE with URL, only add type if it's SSE (HTTP is default)
      if (mcp.type === 'sse') {
        config.type = mcp.type;
      }
    } else if (mcp.type && mcp.type !== 'stdio') {
      // For other types, include if not default stdio
      config.type = mcp.type;
    }

    mcpServers[mcp.name] = config;
  });

  return { mcpServers };
}

describe('MCP Export Functionality Tests', () => {
  describe('HTTP Server Export', () => {
    test('should export Vercel HTTP server correctly', () => {
      const vercelMCP: MCP = {
        id: 'vercel-1',
        name: 'vercel',
        type: 'http',
        url: 'https://mcp.vercel.com',
        category: 'Infrastructure',
        usageCount: 0,
        tags: [],
        disabled: false
      }

      const result = exportMCPs([vercelMCP])
      
      expect(result.mcpServers.vercel).toEqual({
        url: 'https://mcp.vercel.com'
      })
      
      // Should not include type for HTTP (default for URL-based configs)
      expect(result.mcpServers.vercel.type).toBeUndefined()
      // Should not include stdio fields
      expect(result.mcpServers.vercel.command).toBeUndefined()
      expect(result.mcpServers.vercel.args).toBeUndefined()
    })

    test('should export HTTP server with headers and env', () => {
      const stripeMCP: MCP = {
        id: 'stripe-1',
        name: 'stripe',
        type: 'http',
        url: 'https://mcp.stripe.com',
        headers: {
          'Authorization': 'Bearer sk_test_123'
        },
        env: {
          'STRIPE_WEBHOOK_SECRET': 'whsec_456'
        },
        category: 'Payment',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([stripeMCP])
      
      expect(result.mcpServers.stripe).toEqual({
        url: 'https://mcp.stripe.com',
        headers: {
          'Authorization': 'Bearer sk_test_123'
        },
        env: {
          'STRIPE_WEBHOOK_SECRET': 'whsec_456'
        }
      })
    })
  })

  describe('SSE Server Export', () => {
    test('should export Linear SSE server with type', () => {
      const linearMCP: MCP = {
        id: 'linear-1',
        name: 'linear',
        type: 'sse',
        url: 'https://mcp.linear.app/sse',
        category: 'Project Management',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([linearMCP])
      
      expect(result.mcpServers.linear).toEqual({
        url: 'https://mcp.linear.app/sse',
        type: 'sse'
      })
    })
  })

  describe('Stdio Server Export', () => {
    test('should export GitHub stdio server correctly', () => {
      const githubMCP: MCP = {
        id: 'github-1',
        name: 'github',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          'GITHUB_PERSONAL_ACCESS_TOKEN': 'ghp_123'
        },
        category: 'Development',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([githubMCP])
      
      expect(result.mcpServers.github).toEqual({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          'GITHUB_PERSONAL_ACCESS_TOKEN': 'ghp_123'
        }
      })
      
      // Should not include HTTP fields
      expect(result.mcpServers.github.url).toBeUndefined()
      expect(result.mcpServers.github.headers).toBeUndefined()
      // Should not include type for stdio (default)
      expect(result.mcpServers.github.type).toBeUndefined()
    })

    test('should export stdio server with alwaysAllow', () => {
      const sqliteMCP: MCP = {
        id: 'sqlite-1',
        name: 'sqlite',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/db.sqlite'],
        alwaysAllow: ['read_query', 'write_query'],
        category: 'Database',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([sqliteMCP])
      
      expect(result.mcpServers.sqlite).toEqual({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/db.sqlite'],
        alwaysAllow: ['read_query', 'write_query']
      })
    })
  })

  describe('Mixed Server Types Export', () => {
    test('should export different server types correctly', () => {
      const mcps: MCP[] = [
        {
          id: 'vercel-1',
          name: 'vercel',
          type: 'http',
          url: 'https://mcp.vercel.com',
          category: 'Infrastructure',
          usageCount: 0,
          tags: []
        },
        {
          id: 'github-1',
          name: 'github',
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          category: 'Development',
          usageCount: 0,
          tags: []
        },
        {
          id: 'linear-1',
          name: 'linear',
          type: 'sse',
          url: 'https://mcp.linear.app/sse',
          category: 'Project Management',
          usageCount: 0,
          tags: []
        }
      ]

      const result = exportMCPs(mcps)
      
      // Vercel (HTTP)
      expect(result.mcpServers.vercel).toEqual({
        url: 'https://mcp.vercel.com'
      })
      
      // GitHub (stdio)
      expect(result.mcpServers.github).toEqual({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github']
      })
      
      // Linear (SSE)
      expect(result.mcpServers.linear).toEqual({
        url: 'https://mcp.linear.app/sse',
        type: 'sse'
      })
    })
  })

  describe('Edge Cases', () => {
    test('should handle servers with empty optional fields', () => {
      const minimalMCPs: MCP[] = [
        {
          id: 'minimal-http-1',
          name: 'minimal-http',
          type: 'http',
          url: 'https://example.com',
          category: 'Test',
          usageCount: 0,
          tags: [],
          env: {},
          headers: {},
          alwaysAllow: []
        },
        {
          id: 'minimal-stdio-1',
          name: 'minimal-stdio',
          type: 'stdio',
          command: 'echo',
          category: 'Test',
          usageCount: 0,
          tags: [],
          env: {},
          args: [],
          alwaysAllow: []
        }
      ]

      const result = exportMCPs(minimalMCPs)
      
      // Should not include empty objects/arrays
      expect(result.mcpServers['minimal-http']).toEqual({
        url: 'https://example.com'
      })
      
      expect(result.mcpServers['minimal-stdio']).toEqual({
        command: 'echo'
      })
    })

    test('should handle disabled servers in Claude format', () => {
      const disabledMCP: MCP = {
        id: 'disabled-1',
        name: 'disabled-server',
        type: 'http',
        url: 'https://example.com',
        disabled: true,
        category: 'Test',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([disabledMCP], 'claude')
      
      expect(result.mcpServers['disabled-server']).toEqual({
        url: 'https://example.com',
        disabled: true
      })
    })

    test('should preserve original Vercel format exactly', () => {
      // This ensures our export matches the format the user provided
      const vercelMCP: MCP = {
        id: 'vercel-original',
        name: 'vercel',
        type: 'http',
        url: 'https://mcp.vercel.com',
        category: 'Infrastructure',
        usageCount: 0,
        tags: []
      }

      const result = exportMCPs([vercelMCP])
      
      // Should match exactly: {"mcpServers": {"vercel": {"url": "https://mcp.vercel.com"}}}
      expect(result).toEqual({
        mcpServers: {
          vercel: {
            url: 'https://mcp.vercel.com'
          }
        }
      })
    })
  })
})