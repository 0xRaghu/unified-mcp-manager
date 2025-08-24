# Profile Export Format Specification

## Export Format Overview

The profile export format is designed to be comprehensive, version-aware, and compatible with other MCP management tools. It includes complete profile metadata, MCP configurations, and dependency information.

## Profile Export Structure

### Complete Export Format
```json
{
  "exportInfo": {
    "version": "1.0",
    "exportedAt": "2025-01-24T15:00:00Z",
    "exportedBy": "MCP-JSON-UI",
    "exporterVersion": "1.2.0",
    "format": "profile-bundle",
    "checksum": "sha256:abc123...",
    "compression": "none"
  },
  "profile": {
    "name": "Development Environment",
    "description": "MCPs for local development work",
    "category": "Development",
    "metadata": {
      "author": "John Doe",
      "version": "1.2.0",
      "compatibility": ">=1.0.0",
      "lastExported": "2025-01-24T15:00:00Z",
      "exportFormat": "profile-bundle"
    },
    "settings": {
      "autoEnable": true,
      "autoDisable": false,
      "strictMode": false
    },
    "tags": ["development", "local", "github"],
    "color": "#3B82F6",
    "icon": "code",
    "stats": {
      "totalMCPs": 5,
      "enabledMCPs": 4,
      "disabledMCPs": 1,
      "avgUsageCount": 12.4
    }
  },
  "mcps": [
    {
      "id": "github-mcp-001",
      "name": "GitHub MCP",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "[ENCRYPTED]"
      },
      "description": "GitHub integration for repository management",
      "category": "Development Tools",
      "tags": ["github", "git", "repository"],
      "disabled": false,
      "alwaysAllow": ["read_file", "write_file"],
      "usageCount": 25,
      "lastUsed": "2025-01-24T14:30:00Z",
      "source": "import",
      "version": "1.0.0"
    },
    {
      "id": "notion-mcp-002", 
      "name": "Notion API",
      "type": "http",
      "url": "https://mcp.notion.com/mcp",
      "headers": {
        "Authorization": "Bearer [ENCRYPTED]",
        "Content-Type": "application/json"
      },
      "description": "Notion workspace integration",
      "category": "Productivity",
      "tags": ["notion", "docs", "workspace"],
      "disabled": false,
      "usageCount": 8,
      "lastUsed": "2025-01-24T12:15:00Z",
      "version": "2.1.0"
    }
  ],
  "dependencies": {
    "requiredMCPs": [],
    "conflictingProfiles": [],
    "systemRequirements": {
      "nodeVersion": ">=16.0.0",
      "npmPackages": ["@modelcontextprotocol/server-github"]
    },
    "environmentVariables": [
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "NOTION_API_TOKEN"
    ]
  },
  "security": {
    "encryptionUsed": true,
    "encryptionAlgorithm": "AES-256-GCM",
    "sensitiveFields": [
      "env.GITHUB_PERSONAL_ACCESS_TOKEN",
      "headers.Authorization"
    ],
    "exportedWithSecrets": false
  }
}
```

## Export Types

### 1. Full Profile Export
- Complete profile with all MCPs and configurations
- Includes sensitive data (encrypted or redacted)
- Suitable for backup and migration
- Large file size but complete data

### 2. Profile Template Export
- Profile structure without sensitive data
- Shareable format for teams
- MCP references without credentials
- Smaller file size, good for sharing

### 3. Profile Manifest Export  
- Lightweight profile description
- MCP references only (no full configs)
- Dependency information
- Quick profile overview

## Security Considerations

### Sensitive Data Handling
1. **Encryption**: Sensitive fields encrypted with user-provided key
2. **Redaction**: Option to export without sensitive data
3. **Tokenization**: Replace secrets with placeholder tokens
4. **Selective Export**: Choose which fields to include

### Export Options
```typescript
interface ExportOptions {
  includeSensitiveData: boolean;
  encryptionKey?: string;
  exportType: 'full' | 'template' | 'manifest';
  compression: 'none' | 'gzip' | 'brotli';
  format: 'json' | 'yaml';
}
```

### Encryption Format
```json
{
  "encrypted": true,
  "algorithm": "AES-256-GCM",
  "iv": "base64-encoded-iv",
  "data": "base64-encoded-encrypted-data",
  "authTag": "base64-encoded-auth-tag"
}
```

## Import Compatibility

### Supported Import Formats

#### 1. Native Profile Format
- Full compatibility with exported profiles
- Complete data restoration
- Version migration support

#### 2. Claude Desktop Format
- Extract MCPs from mcpServers configuration  
- Auto-generate profile from imported MCPs
- Maintain original MCP configurations

#### 3. Generic MCP JSON
- Import from other MCP tools
- Auto-detect MCP configurations
- Create profile wrapper around imported MCPs

#### 4. YAML Format
- Support YAML export/import
- Maintain same structure as JSON
- Human-readable format option

### Import Validation

#### Format Detection
```typescript
interface ImportResult {
  success: boolean;
  format: 'native-profile' | 'claude-desktop' | 'generic-mcp' | 'yaml';
  version?: string;
  profilesImported: number;
  mcpsImported: number;
  warnings: string[];
  errors: string[];
}
```

#### Validation Steps
1. **Format Recognition**: Auto-detect import format
2. **Schema Validation**: Validate against expected schema
3. **Dependency Check**: Verify required dependencies
4. **Conflict Detection**: Check for naming conflicts  
5. **Security Scan**: Validate security fields
6. **Migration**: Convert between versions if needed

## Version Migration

### Version Compatibility Matrix
```
Export Version | Import Compatibility
1.0           | Full support
0.9           | Partial (migrate)
0.8           | Limited (legacy mode)
```

### Migration Strategies
1. **Automatic Migration**: Seamless upgrade of older formats
2. **Assisted Migration**: Guide user through manual steps
3. **Legacy Support**: Limited functionality for very old formats
4. **Fail-Safe**: Reject incompatible formats with clear errors

## File Naming Conventions

### Export File Names
- `profile-{name}-{timestamp}.json`
- `profile-{name}-template.json` (for templates)
- `profile-{name}-manifest.json` (for manifests)

### Examples
- `profile-development-environment-20250124-150000.json`
- `profile-production-setup-template.json`
- `profile-testing-tools-manifest.json`

## Integration with Existing Export System

### Enhanced Export Menu
```
Export ▼
├── Copy as JSON (existing)
├── Copy as YAML (existing)  
├── Download JSON (existing)
├── Download YAML (existing)
├── ─────────────────────
├── Export Current Profile
├── Export All Profiles
└── Export Profile Template
```

### Profile-Specific Export
- Export only MCPs in selected profile
- Include profile metadata
- Maintain profile relationships

### Bulk Profile Export
- Export multiple profiles at once
- Create zip archive with individual files
- Include global settings and dependencies

## Error Handling

### Export Errors
- **Insufficient Permissions**: Cannot access MCP data
- **Encryption Failure**: Cannot encrypt sensitive data
- **Storage Full**: Cannot write export file
- **Network Timeout**: API calls fail during export

### Import Errors
- **Invalid Format**: Cannot parse import file
- **Version Incompatible**: Cannot migrate format
- **Missing Dependencies**: Required MCPs not available
- **Conflict Resolution**: Name conflicts with existing data

### Error Recovery
- **Partial Imports**: Import what's possible, report failures
- **Rollback**: Undo failed imports
- **Retry Logic**: Attempt failed operations multiple times
- **User Guidance**: Clear instructions for manual resolution

## Performance Considerations

### Large Profile Handling
- Stream processing for large exports
- Chunked imports for better memory usage
- Progress indicators for long operations
- Background processing for non-blocking UI

### Optimization Strategies
- Compress exports for smaller file sizes
- Lazy loading during import process
- Efficient diff algorithms for updates
- Caching for repeated operations