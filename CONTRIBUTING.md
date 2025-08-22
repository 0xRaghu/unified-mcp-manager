# Contributing to MCP Manager

Thank you for your interest in contributing to MCP Manager! This document provides guidelines and information for contributors.

## 🚀 Quick Start

### Prerequisites

- **Bun** (>= 1.0.0) - [Install Bun](https://bun.sh/)
- **Node.js** (>= 18.0.0) - for compatibility testing
- **Git** - for version control

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/unified-mcp-manager.git
   cd unified-mcp-manager
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Start Development Server**
   ```bash
   bun run dev
   ```
   Opens at `http://localhost:3000` with file-based storage

4. **Test Built Package Locally**
   ```bash
   bun run build
   ./dist/cli.js --port 3001
   ```
   Uses the same file-based storage in `~/.unified-mcp-manager/`

> **📁 Storage Consistency:** Both development (`bun run dev`) and production modes now use the same file-based storage location at `~/.unified-mcp-manager/`. This means:
> - MCPs added in production mode will be visible in development mode
> - Changes made during development persist when running the built package
> - No need to re-add MCPs when switching between dev and production modes

## 🏗️ Project Architecture

### Tech Stack
- **Runtime**: Bun
- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **State Management**: Zustand
- **Testing**: Playwright (E2E) + Vitest (Unit)
- **Build**: Custom Bun bundler

### Project Structure
```
├── dist/               # Built npm package
├── src/                # React frontend source
│   ├── components/     # UI components
│   ├── lib/           # Browser utilities
│   ├── stores/        # Zustand state management
│   └── types/         # TypeScript definitions
├── lib/               # Server-side utilities
├── tests/             # Test suites
├── server.ts          # Bun API server
├── cli.ts             # CLI entry point
└── build-fixed.js     # Build script
```

## 🔧 Development Workflow

### Storage Architecture

The MCP Manager uses a unified storage system for both development and production modes:

#### File-based Storage (`~/.unified-mcp-manager/`)
- **Development server** (`bun run dev`): Uses file storage via API endpoints
- **Production CLI** (`./dist/cli.js`): Uses file storage directly
- **Storage location**: `~/.unified-mcp-manager/` directory in user's home folder

#### Storage Files
- `mcps.json` - MCP server configurations
- `profiles.json` - User profiles (future feature)
- `settings.json` - Application settings
- `backups.json` - Configuration backups

#### Implementation Details
- **Frontend**: Uses `ApiStorageAdapter` that calls `/api/*` endpoints
- **Backend**: API endpoints in both `index.ts` (dev) and `cli.ts` (production)
- **Storage layer**: `lib/fileStorage.ts` handles actual file operations
- **Consistency**: Same storage location ensures MCPs persist between modes

#### API Endpoints (Both Dev & Production)
```
GET/POST /api/mcps           # MCP configurations
GET/POST /api/profiles       # User profiles  
GET/POST /api/settings       # App settings
GET/POST /api/backups        # Backup operations
POST     /api/storage/clear  # Clear all data
GET      /api/storage/info   # Storage statistics
```

### Available Scripts

```bash
# Development
bun run dev              # Start dev server (file storage)
bun run build            # Build npm package
./dist/cli.js            # Test built package

# Testing
bun run test             # Unit tests with Vitest
bun run test:ui          # Unit tests with UI
bun run test:e2e         # E2E tests with Playwright
bun run test:e2e:ui      # E2E tests with UI

# Code Quality
bun run lint             # TypeScript type checking
```

## 💾 Key Features Development Guide

### Working with Bulk Import Feature

The bulk import functionality is implemented in several key files:

#### Core Components
- **`src/components/BulkImportDialog.tsx`**: Main dialog component with drag-and-drop interface
- **`src/lib/duplicateDetection.ts`**: Logic for detecting and handling duplicate MCPs
- **`src/App.tsx`**: Integration point for the bulk import button and dialog

#### Key Features
- **Drag & Drop Support**: Uses HTML5 drag and drop API for file uploads
- **JSON Parsing**: Expects files with `mcpServers` object structure  
- **Duplicate Detection**: Compares name, command, URL, and configuration
- **Selective Import**: Checkbox interface to choose which MCPs to import
- **Auto-renaming**: Suggests unique names for duplicate MCPs
- **Progress Tracking**: Multi-step wizard (upload → preview → complete)

#### Testing Bulk Import
1. Create test JSON files with various MCP configurations
2. Test drag and drop functionality across browsers
3. Verify duplicate detection with existing MCPs
4. Test error handling for malformed JSON files
5. Ensure proper cleanup and state reset

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow existing code patterns and conventions
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   bun run test
   bun run test:e2e
   
   # Test built package
   bun run build
   ./dist/cli.js --help
   ./dist/cli.js --port 3001
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📋 Contribution Guidelines

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Use functional components with hooks
- **Naming**: Use descriptive names, follow camelCase
- **Comments**: Add JSDoc for complex functions
- **Imports**: Use absolute imports where possible

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug in component
docs: update README
test: add unit tests
refactor: improve code structure
style: fix formatting
chore: update dependencies
```

### Testing Requirements

- **Unit Tests**: Required for new utility functions
- **E2E Tests**: Required for new UI features
- **Manual Testing**: Test built package before submitting

### Documentation

- Update README.md for new features
- Add JSDoc comments for complex functions
- Update type definitions when needed

## 🎯 Areas for Contribution

### High Priority
- **YAML Export Support**: Add export format for Crush agent
- **Profile Management**: Multiple MCP configuration profiles
- **Enhanced Bulk Operations**: Advanced filtering and transformation during import
- **Performance**: Optimize for large MCP collections

### Medium Priority
- **UI Improvements**: Better mobile responsiveness
- **Accessibility**: ARIA labels and keyboard navigation
- **Error Handling**: More detailed error messages
- **Testing**: Increase test coverage

### Good First Issues
- **Documentation**: Improve inline code comments
- **UI Polish**: Small visual improvements
- **Bug Fixes**: Resolve reported issues
- **Type Safety**: Add missing TypeScript types

## 🧪 Testing Guidelines

### Unit Tests (Vitest)
- Test utilities in `src/lib/`
- Test store logic in `src/stores/`
- Mock external dependencies

Example:
```typescript
import { test, expect } from "bun:test";
import { mcpStore } from "../src/stores/mcpStore";

test("should add MCP correctly", () => {
  // Test implementation
});
```

### E2E Tests (Playwright)
- Test complete user workflows
- Test across browsers (Chrome, Firefox, Safari)
- Use page object pattern

Example:
```typescript
import { test, expect } from '@playwright/test';

test('should add new MCP', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="add-mcp-button"]');
  // Test implementation
});
```

### Manual Testing Checklist
- [ ] App starts correctly: `./dist/cli.js`
- [ ] Storage directory created: `~/.unified-mcp-manager/`
- [ ] All core features work (add, edit, delete, export)
- [ ] **Bulk import functionality**:
  - [ ] Drag and drop JSON files works
  - [ ] File selection dialog works
  - [ ] Duplicate detection and naming works
  - [ ] Selective import with checkboxes works
  - [ ] Import process completes successfully
- [ ] No console errors
- [ ] TypeScript compilation succeeds

## 🐛 Bug Reports

When reporting bugs, include:

1. **Environment**: OS, Bun version, browser
2. **Steps to Reproduce**: Clear step-by-step instructions
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Console Logs**: Any error messages

Use this template:
```markdown
**Environment:**
- OS: macOS 14.0
- Bun: 1.0.0
- Browser: Chrome 120

**Steps to Reproduce:**
1. Run `./dist/cli.js`
2. Click "Add MCP"
3. ...

**Expected:** Feature should work
**Actual:** Error occurs
**Console:** Error message here
```

## 💡 Feature Requests

For new features:

1. **Check Roadmap**: Review existing roadmap in README
2. **Open Discussion**: Create GitHub issue for discussion
3. **Provide Context**: Explain use case and benefits
4. **Consider Scope**: Start small, iterate

## 🔐 Security

- **No Secrets in Code**: Never commit API keys or tokens
- **Environment Variables**: Use secure storage patterns
- **Dependencies**: Keep dependencies updated
- **Input Validation**: Sanitize user inputs

## 📝 Pull Request Process

1. **Description**: Clear description of changes
2. **Testing**: Confirm all tests pass
3. **Documentation**: Update relevant docs
4. **Breaking Changes**: Clearly mark any breaking changes
5. **Screenshots**: For UI changes, include before/after

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly marked)
```

## 🤝 Community

- **Be Respectful**: Follow code of conduct
- **Ask Questions**: Use GitHub Discussions
- **Help Others**: Review PRs and answer questions
- **Share Ideas**: Contribute to roadmap discussions

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [React Documentation](https://react.dev/)
- [Playwright Testing](https://playwright.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes for significant contributions
- Invited to be maintainers for consistent, quality contributions

---

**Questions?** Open an issue or start a discussion. We're here to help!

Thank you for contributing to MCP Manager! 🚀