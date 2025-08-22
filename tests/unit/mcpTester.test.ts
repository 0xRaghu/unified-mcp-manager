import { describe, test, expect } from 'bun:test';
import { testMCPConnection } from '../../src/lib/mcpTester';
import type { MCP } from '../../src/types';

describe('MCP Tester', () => {
  test('should fail for MCP without command', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Invalid MCP',
      command: '',
      args: [],
      type: 'stdio', // Added required type field
      category: 'test',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid command');
    expect(result.error).toBe('Command is required for stdio servers');
  });

  test('should test GitHub MCP with token', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'GitHub MCP',
      command: 'npx server-github',
      args: ['--token'],
      type: 'stdio',
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'test-token' },
      category: 'git',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Connected to GitHub MCP successfully');
    expect(result.duration).toBeGreaterThan(0);
  });

  test('should fail GitHub MCP without token', async () => {
    const mcp: MCP = {
      id: '1', 
      name: 'GitHub MCP',
      command: 'npx server-github',
      args: [],
      type: 'stdio',
      category: 'git',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('GitHub token required');
    expect(result.error).toBe('GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required');
  });

  test('should test filesystem MCP successfully', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Filesystem MCP', 
      command: 'npx server-filesystem',
      args: ['/path/to/files'],
      type: 'stdio',
      category: 'file',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Filesystem MCP is ready');
  });

  test('should handle generic MCP connections', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Generic MCP',
      command: 'npx some-other-server', 
      args: [],
      type: 'stdio',
      category: 'other',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.duration).toBeGreaterThan(0);
    expect(['MCP connection successful', 'Connection timeout']).toContain(result.message);
  });
});