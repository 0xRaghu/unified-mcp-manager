# MCP Manager

> **Centralized MCP Configuration Management Tool for AI Coding Agents**

A modern web application that solves the fragmentation problem of MCP (Model Context Protocol) configurations across different AI coding agents like Claude, Gemini, Crush, and OpenCode.

## 🎯 Problem Statement

AI coding agents store MCP configurations in different locations and formats:
- **Claude**: `~/.claude/.mcp.json`
- **Gemini**: `~/.gemini/settings.json` 
- **Crush**: `~/.crush/mcps.yaml`
- **OpenCode**: `~/.opencode/config.json`

This fragmentation makes it difficult to:
- ✗ Share MCP configurations between agents
- ✗ Manage MCPs across different projects
- ✗ Keep track of which MCPs are enabled/disabled
- ✗ Test MCP connections

## ✨ Solution

![MCP Manager Interface](public/Screenshot.jpg)

MCP Manager provides a centralized web UI where you can:

- ✅ **Add MCPs** through an intuitive form interface
- ✅ **Enable/disable** MCPs with toggle switches
- ✅ **Export configurations** as JSON for any AI agent
- ✅ **Copy to clipboard** for easy pasting into project `.mcp.json` files
- ✅ **Test connections** to verify MCP functionality
- ✅ **Duplicate & edit** existing configurations
- ✅ **Search & filter** through your MCP collection
- ✅ **Secure storage** with encryption for sensitive environment variables

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/0xRaghu/unified-mcp-manager.git
cd unified-mcp-manager

# Install dependencies
bun install

# Start development server
bun run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

## 🖥️ Usage

### Adding Your First MCP

1. Click **"Add MCP"** or **"Add First MCP"**
2. Fill out the form:
   - **Name**: Human-readable name (e.g., "GitHub MCP")
   - **Command**: MCP server command (e.g., `npx @modelcontextprotocol/server-github`)
   - **Arguments**: Command arguments (e.g., `--github-token`)
   - **Environment Variables**: Sensitive data like API keys
3. Click **"Add MCP"**

### Managing MCPs

- **Edit**: Click the ⋮ menu → Edit
- **Duplicate**: Create a copy with slight modifications
- **Test Connection**: Verify the MCP server is working
- **Delete**: Remove with confirmation dialog

### Exporting Configurations

- **Copy JSON**: Copies configuration to clipboard
- **Download**: Downloads as `mcp-config.json` file

The exported format is compatible with all major AI coding agents:

```json
{
  "mcpServers": {
    "GitHub MCP": {
      "command": "npx @modelcontextprotocol/server-github",
      "args": ["--github-token"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State Management**: Zustand
- **Storage**: LocalStorage with Web Crypto API encryption
- **Animations**: Framer Motion
- **Testing**: Playwright (E2E) + Vitest (Unit)
- **Build Tool**: Vite
- **Runtime**: Bun

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── MCPForm.tsx     # MCP form component
├── lib/                # Utility libraries
│   ├── storage.ts      # Encrypted storage
│   ├── crypto.ts       # Encryption utilities
│   ├── mcpTester.ts    # Connection testing
│   └── utils.ts        # General utilities
├── stores/             # Zustand stores
│   └── mcpStore.ts     # Main MCP state management
├── types/              # TypeScript type definitions
│   └── index.ts        # Core interfaces
└── App.tsx             # Main application component
```

### Key Features

#### 🔐 Secure Storage
- Environment variables encrypted using Web Crypto API
- AES-GCM encryption with random salts
- No sensitive data stored in plain text

#### 🎨 Modern UI
- Responsive design (mobile, tablet, desktop)
- Dark/light theme support
- Smooth animations with Framer Motion
- Accessible components with proper ARIA labels
- Grid and list view modes for MCP display
- Real-time connection status monitoring
- Comprehensive search and filtering system

#### 🧪 Testing & Connectivity
- 27+ E2E tests with Playwright
- Cross-browser testing (Chrome, Firefox, Safari)
- Unit tests for core functionality
- Live MCP connection testing with status indicators
- Automatic connection health monitoring

#### ⚡ Advanced Features
- Bulk operations for MCP management
- Auto-refresh functionality
- Real-time status updates
- Connection timeout handling
- Comprehensive error handling with user-friendly messages

## 🔧 Development

### Available Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build            # Production build
bun run preview          # Preview build

# Testing  
bun run test             # Unit tests
bun run test:ui          # Unit tests with UI
bun run test:e2e         # E2E tests
bun run test:e2e:ui      # E2E tests with UI

# Linting
bun run lint             # TypeScript type checking
```

### Adding New MCP Types

1. Update `src/types/index.ts` with new MCP properties
2. Update `src/lib/mcpTester.ts` for connection testing logic
3. Add export format support in `src/stores/mcpStore.ts`

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bun run test && bun run test:e2e`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🤝 MCP Compatibility

### Supported AI Agents

| Agent | Config Location | Format | Status |
|-------|----------------|--------|---------|
| Claude Code | `~/.claude/.mcp.json` | JSON | ✅ Full Support |
| Gemini CLI | `~/.gemini/settings.json` | JSON | ✅ Full Support |
| Crush | `~/.crush/mcps.yaml` | YAML | 🔄 Planned |
| OpenCode | `~/.opencode/config.json` | JSON | ✅ Full Support |

### Popular MCP Servers

The tool supports all standard MCP servers:

- **GitHub**: `npx @modelcontextprotocol/server-github`
- **Filesystem**: `npx @modelcontextprotocol/server-filesystem`
- **SQLite**: `npx @modelcontextprotocol/server-sqlite`
- **Web Search**: `npx @modelcontextprotocol/server-brave-search`
- **Memory**: `npx @modelcontextprotocol/server-memory`

## 🔍 Troubleshooting

### Common Issues

**Q: MCPs not showing up after import**
A: Check that the JSON format matches the expected structure with `mcpServers` as the root key.

**Q: Environment variables not working**
A: Ensure sensitive values are properly encrypted. Check browser console for crypto errors.

**Q: Connection test failing**
A: Verify the MCP server command is correct and all required environment variables are set.

### Debug Mode

Enable detailed logging by adding to localStorage:
```javascript
localStorage.setItem('mcp-debug', 'true')
```

## 📊 Performance

- **Load Time**: < 1s on modern browsers
- **Bundle Size**: < 500KB gzipped
- **Memory Usage**: < 50MB with 100+ MCPs
- **Encryption**: AES-GCM with minimal performance impact

## 🛡️ Security

- **Environment Variables**: Encrypted using Web Crypto API
- **No Network Requests**: All data stored locally
- **XSS Protection**: Input sanitization and CSP headers
- **Type Safety**: Full TypeScript coverage

## 🗺️ Roadmap

### Planned Features
- **Profiles**: Create and manage different MCP configuration profiles for different projects
- **Categorization**: Organize MCPs into categories (Development, Security, Data, etc.)
- **Dark Mode**: Enhanced dark theme with system preference detection
- **Bulk Import**: Add multiple MCP servers at once via JSON file upload
- **Export Formats**: Support for YAML and other configuration formats
- **Backup & Sync**: Cloud backup and synchronization across devices

### Contributing
We welcome contributions! Pick any roadmap item or suggest new features via GitHub issues.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) team
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Zustand](https://zustand-demo.pmnd.rs/) for state management

---

**Built with ❤️ for the AI coding community**
