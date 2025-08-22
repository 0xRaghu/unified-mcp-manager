/**
 * Tests for App display fix - ensuring HTTP/SSE servers don't cause errors
 */

import { test, expect, describe } from 'bun:test'
import type { MCP } from '../../src/types'

// Mock the display logic from App.tsx
function getDisplayCommand(mcp: MCP): string {
  if (mcp.type === 'http' || mcp.type === 'sse') {
    return mcp.url || ''
  } else {
    return `${mcp.command || ''} ${mcp.args?.join(' ') || ''}`.trim()
  }
}

describe('App Display Fix Tests', () => {
  test('should handle HTTP server without args', () => {
    const httpMCP: MCP = {
      id: 'http-1',
      name: 'vercel',
      type: 'http',
      url: 'https://mcp.vercel.com',
      category: 'Infrastructure',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(httpMCP)
    expect(display).toBe('https://mcp.vercel.com')
    // Should not throw error even though args is undefined
  })

  test('should handle SSE server without args', () => {
    const sseMCP: MCP = {
      id: 'sse-1',
      name: 'linear',
      type: 'sse',
      url: 'https://mcp.linear.app/sse',
      category: 'Project Management',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(sseMCP)
    expect(display).toBe('https://mcp.linear.app/sse')
  })

  test('should handle stdio server with args', () => {
    const stdioMCP: MCP = {
      id: 'stdio-1',
      name: 'github',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      category: 'Development',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(stdioMCP)
    expect(display).toBe('npx -y @modelcontextprotocol/server-github')
  })

  test('should handle stdio server without args', () => {
    const stdioMCP: MCP = {
      id: 'stdio-2',
      name: 'simple',
      type: 'stdio',
      command: 'echo',
      category: 'Test',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(stdioMCP)
    expect(display).toBe('echo')
  })

  test('should handle stdio server with empty args array', () => {
    const stdioMCP: MCP = {
      id: 'stdio-3',
      name: 'empty-args',
      type: 'stdio',
      command: 'node',
      args: [],
      category: 'Test',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(stdioMCP)
    expect(display).toBe('node')
  })

  test('should handle malformed stdio server gracefully', () => {
    const malformedMCP: MCP = {
      id: 'malformed-1',
      name: 'malformed',
      type: 'stdio',
      // command is undefined
      category: 'Test',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(malformedMCP)
    expect(display).toBe('') // Should not throw error
  })

  test('should handle HTTP server without URL gracefully', () => {
    const httpNoUrlMCP: MCP = {
      id: 'http-no-url',
      name: 'broken-http',
      type: 'http',
      // url is undefined
      category: 'Test',
      usageCount: 0,
      tags: []
    }

    const display = getDisplayCommand(httpNoUrlMCP)
    expect(display).toBe('') // Should not throw error
  })
})