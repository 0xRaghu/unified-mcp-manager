import { describe, it, expect } from 'vitest';
import { testMCPConnection } from '../../src/lib/mcpTester';
import type { MCP } from '../../src/types';

describe('MCP Tester', () => {
  it('should fail for MCP without command', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Invalid MCP',
      command: '',
      args: [],
      category: 'test',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid command');
    expect(result.error).toBe('Command is required');
  });

  it('should test GitHub MCP with token', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'GitHub MCP',
      command: 'npx server-github',
      args: ['--token'],
      env: { GITHUB_TOKEN: 'test-token' },
      category: 'git',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Connected to GitHub MCP successfully');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should fail GitHub MCP without token', async () => {
    const mcp: MCP = {
      id: '1', 
      name: 'GitHub MCP',
      command: 'npx server-github',
      args: [],
      category: 'git',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('GitHub token required');
    expect(result.error).toBe('GITHUB_TOKEN environment variable is required');
  });

  it('should test filesystem MCP successfully', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Filesystem MCP', 
      command: 'npx server-filesystem',
      args: ['/path/to/files'],
      category: 'file',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Filesystem MCP is ready');
  });

  it('should handle generic MCP connections', async () => {
    const mcp: MCP = {
      id: '1',
      name: 'Generic MCP',
      command: 'npx some-other-server', 
      args: [],
      category: 'other',
      usageCount: 0,
      tags: []
    };

    const result = await testMCPConnection(mcp);
    
    expect(result.duration).toBeGreaterThan(0);
    expect(['MCP connection successful', 'Connection timeout']).toContain(result.message);
  });
});