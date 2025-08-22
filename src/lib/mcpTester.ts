import type { MCP } from '@/types';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  duration: number;
  error?: string;
}

async function testHttpSseConnection(mcp: MCP, startTime: number): Promise<ConnectionTestResult> {
  // Mock HTTP/SSE server testing based on URL patterns
  const url = mcp.url!;
  
  if (url.includes('vercel.com')) {
    return {
      success: true,
      message: 'Connected to Vercel MCP successfully',
      duration: Date.now() - startTime
    };
  }
  
  if (url.includes('notion.com')) {
    // Check for authorization header
    if (!mcp.headers?.Authorization && !mcp.env?.NOTION_API_KEY) {
      return {
        success: false,
        message: 'Notion API authorization required',
        duration: Date.now() - startTime,
        error: 'Authorization header or NOTION_API_KEY environment variable is required'
      };
    }
    
    return {
      success: true,
      message: 'Connected to Notion MCP successfully',
      duration: Date.now() - startTime
    };
  }
  
  if (url.includes('linear.app')) {
    return {
      success: true,
      message: 'Connected to Linear MCP successfully (SSE)',
      duration: Date.now() - startTime
    };
  }
  
  if (url.includes('stripe.com')) {
    if (!mcp.env?.STRIPE_API_KEY) {
      return {
        success: false,
        message: 'Stripe API key required',
        duration: Date.now() - startTime,
        error: 'STRIPE_API_KEY environment variable is required'
      };
    }
    
    return {
      success: true,
      message: 'Connected to Stripe MCP successfully',
      duration: Date.now() - startTime
    };
  }
  
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Local servers might not be running
    const success = Math.random() > 0.5;
    return {
      success,
      message: success ? 'Connected to local MCP server' : 'Local server not running',
      duration: Date.now() - startTime,
      error: success ? undefined : 'Unable to connect to local server. Make sure it is running.'
    };
  }
  
  // Generic HTTP/SSE server test
  const success = Math.random() > 0.3;
  return {
    success,
    message: success ? `Connected to ${mcp.type?.toUpperCase()} MCP server` : 'Connection failed',
    duration: Date.now() - startTime,
    error: success ? undefined : 'Unable to connect to MCP server'
  };
}

async function testStdioConnection(mcp: MCP, startTime: number): Promise<ConnectionTestResult> {
  const command = mcp.command!;
  
  // Mock connection test results based on command
  if (command.includes('github')) {
    // Check if GitHub token is provided
    if (!mcp.env?.GITHUB_PERSONAL_ACCESS_TOKEN && !mcp.env?.GITHUB_TOKEN) {
      return {
        success: false,
        message: 'GitHub token required',
        duration: Date.now() - startTime,
        error: 'GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required'
      };
    }
    
    return {
      success: true,
      message: 'Connected to GitHub MCP successfully',
      duration: Date.now() - startTime
    };
  }

  if (command.includes('filesystem')) {
    return {
      success: true,
      message: 'Filesystem MCP is ready',
      duration: Date.now() - startTime
    };
  }

  if (command.includes('sqlite')) {
    return {
      success: Math.random() > 0.3,
      message: Math.random() > 0.3 ? 'SQLite database connected' : 'Database connection failed',
      duration: Date.now() - startTime,
      error: Math.random() > 0.3 ? undefined : 'Unable to connect to database'
    };
  }

  // Default success for other stdio MCPs
  return {
    success: Math.random() > 0.2,
    message: Math.random() > 0.2 ? 'MCP connection successful' : 'Connection timeout',
    duration: Date.now() - startTime,
    error: Math.random() > 0.2 ? undefined : 'Connection timed out after 30 seconds'
  };
}

export async function testMCPConnection(mcp: MCP): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate MCP connection test
    // In a real implementation, this would spawn the MCP process or make HTTP requests
    
    // Basic validation based on MCP type
    if (mcp.type === 'http' || mcp.type === 'sse') {
      // For HTTP/SSE servers, validate URL
      if (!mcp.url || mcp.url.trim() === '') {
        return {
          success: false,
          message: 'Invalid URL',
          duration: Date.now() - startTime,
          error: 'URL is required for HTTP/SSE servers'
        };
      }
      
      // Validate URL format
      try {
        new URL(mcp.url);
      } catch {
        return {
          success: false,
          message: 'Invalid URL format',
          duration: Date.now() - startTime,
          error: 'Please provide a valid URL'
        };
      }
    } else {
      // For stdio servers, validate command
      if (!mcp.command || mcp.command.trim() === '') {
        return {
          success: false,
          message: 'Invalid command',
          duration: Date.now() - startTime,
          error: 'Command is required for stdio servers'
        };
      }
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Handle different MCP types
    if (mcp.type === 'http' || mcp.type === 'sse') {
      // Test HTTP/SSE connections
      return await testHttpSseConnection(mcp, startTime);
    } else {
      // Test stdio connections (existing logic)
      return await testStdioConnection(mcp, startTime);
    }

  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}