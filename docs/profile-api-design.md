# Profile API Design Specification

## API Endpoints Overview

The Profile API extends the existing MCP-JSON-UI backend with comprehensive profile management capabilities. All endpoints follow RESTful conventions and maintain consistency with the existing API structure.

## Base Profile Operations

### List Profiles
```http
GET /api/profiles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "profile-001",
      "name": "Development Environment",
      "description": "MCPs for local development",
      "mcpIds": ["mcp-001", "mcp-002"],
      "createdAt": "2025-01-24T15:00:00Z",
      "updatedAt": "2025-01-24T15:30:00Z",
      "isDefault": true,
      "metadata": {
        "author": "John Doe",
        "version": "1.0.0"
      },
      "stats": {
        "totalMCPs": 2,
        "enabledMCPs": 2,
        "disabledMCPs": 0
      },
      "tags": ["development", "local"],
      "color": "#3B82F6",
      "icon": "code",
      "category": "Development",
      "settings": {
        "autoEnable": true,
        "autoDisable": false,
        "strictMode": false
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### Get Single Profile
```http
GET /api/profiles/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-001",
    "name": "Development Environment",
    // ... full profile object
  }
}
```

### Create Profile
```http
POST /api/profiles
```

**Request Body:**
```json
{
  "name": "New Profile",
  "description": "Profile description",
  "mcpIds": ["mcp-001", "mcp-002"],
  "category": "Development",
  "tags": ["new", "test"],
  "color": "#10B981",
  "icon": "star",
  "settings": {
    "autoEnable": true,
    "autoDisable": false,
    "strictMode": false
  },
  "metadata": {
    "author": "Jane Doe",
    "version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-002",
    "name": "New Profile",
    "createdAt": "2025-01-24T16:00:00Z",
    "updatedAt": "2025-01-24T16:00:00Z",
    // ... complete profile object
  }
}
```

### Update Profile
```http
PUT /api/profiles/{id}
```

**Request Body:** (partial updates allowed)
```json
{
  "name": "Updated Profile Name",
  "description": "Updated description",
  "mcpIds": ["mcp-001", "mcp-003"],
  "tags": ["updated", "development"]
}
```

### Delete Profile
```http
DELETE /api/profiles/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

## Profile MCP Management

### Get Profile MCPs
```http
GET /api/profiles/{id}/mcps
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mcp-001",
      "name": "GitHub MCP",
      "type": "stdio",
      // ... full MCP object
    }
  ]
}
```

### Add MCP to Profile
```http
POST /api/profiles/{id}/mcps
```

**Request Body:**
```json
{
  "mcpId": "mcp-003"
}
```

### Remove MCP from Profile
```http
DELETE /api/profiles/{id}/mcps/{mcpId}
```

### Bulk Update Profile MCPs
```http
PUT /api/profiles/{id}/mcps
```

**Request Body:**
```json
{
  "mcpIds": ["mcp-001", "mcp-002", "mcp-004"],
  "operation": "replace" // or "add", "remove"
}
```

## Profile Switching Operations

### Switch to Profile
```http
POST /api/profiles/{id}/switch
```

**Request Body:**
```json
{
  "mode": "hard", // "soft", "hard", "additive", "preview"
  "saveCurrentState": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "switchedMCPs": {
      "enabled": ["mcp-001", "mcp-002"],
      "disabled": ["mcp-003", "mcp-004"]
    },
    "previousState": {
      "profileId": "profile-001",
      "mcpStates": {
        "mcp-001": true,
        "mcp-002": false,
        "mcp-003": true
      }
    }
  }
}
```

### Preview Profile Switch
```http
POST /api/profiles/{id}/preview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "changes": {
      "toEnable": ["mcp-001", "mcp-002"],
      "toDisable": ["mcp-003"],
      "unchanged": ["mcp-004"]
    },
    "conflicts": [],
    "warnings": ["MCP-003 has high usage count"]
  }
}
```

### Rollback Profile Switch
```http
POST /api/profiles/rollback
```

**Response:**
```json
{
  "success": true,
  "data": {
    "restoredState": {
      "profileId": "profile-001",
      "mcpStates": {
        "mcp-001": true,
        "mcp-002": false
      }
    }
  }
}
```

## Profile Templates & Defaults

### Get Default Profile
```http
GET /api/profiles/default
```

### Set Default Profile
```http
PUT /api/profiles/default
```

**Request Body:**
```json
{
  "profileId": "profile-001"
}
```

### Create Profile from Template
```http
POST /api/profiles/from-template
```

**Request Body:**
```json
{
  "templateId": "template-001",
  "name": "My Custom Profile",
  "customizations": {
    "description": "Customized from template",
    "tags": ["custom"]
  }
}
```

## Profile Import/Export

### Export Profile
```http
GET /api/profiles/{id}/export
```

**Query Parameters:**
- `format`: `json` | `yaml`
- `type`: `full` | `template` | `manifest`
- `includeSensitive`: `true` | `false`
- `compression`: `none` | `gzip` | `brotli`

**Response:**
```json
{
  "success": true,
  "data": {
    "exportInfo": {
      "version": "1.0",
      "exportedAt": "2025-01-24T15:00:00Z",
      "format": "profile-bundle"
    },
    "profile": { /* profile data */ },
    "mcps": [ /* mcp configurations */ ],
    "dependencies": { /* dependency info */ }
  }
}
```

### Export Multiple Profiles
```http
POST /api/profiles/export/bulk
```

**Request Body:**
```json
{
  "profileIds": ["profile-001", "profile-002"],
  "options": {
    "format": "json",
    "type": "full",
    "compression": "gzip"
  }
}
```

### Import Profile
```http
POST /api/profiles/import
```

**Request Body:**
```json
{
  "data": { /* profile export data */ },
  "options": {
    "mergeStrategy": "create-new", // "overwrite", "merge", "skip-conflicts"
    "validateOnly": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profilesImported": 1,
    "mcpsImported": 3,
    "warnings": ["MCP-001 already exists, using existing"],
    "errors": []
  }
}
```

## Profile Statistics & Analytics

### Get Profile Statistics
```http
GET /api/profiles/{id}/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMCPs": 5,
    "enabledMCPs": 4,
    "disabledMCPs": 1,
    "mostUsedMCP": "mcp-001",
    "avgUsageCount": 12.4,
    "lastUsed": "2025-01-24T14:30:00Z",
    "switchCount": 25,
    "categories": {
      "Development Tools": 3,
      "AI & Language": 2
    }
  }
}
```

### Get Profile Usage History
```http
GET /api/profiles/{id}/usage
```

**Query Parameters:**
- `period`: `24h` | `7d` | `30d` | `90d`
- `limit`: number (default 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-01-24T14:30:00Z",
      "action": "switch",
      "duration": 1500,
      "success": true
    }
  ]
}
```

## Profile Validation

### Validate Profile
```http
POST /api/profiles/validate
```

**Request Body:**
```json
{
  "profile": { /* profile data to validate */ }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [
      {
        "field": "name",
        "message": "Profile name is similar to existing profile",
        "code": "NAME_SIMILARITY"
      }
    ]
  }
}
```

### Check Profile Conflicts
```http
POST /api/profiles/{id}/conflicts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "conflicts": []
  }
}
```

## Profile Search & Filtering

### Search Profiles
```http
GET /api/profiles/search
```

**Query Parameters:**
- `q`: search query
- `category`: filter by category  
- `tags`: comma-separated tags
- `hasDefault`: `true` | `false`
- `sortBy`: `name` | `createdAt` | `updatedAt` | `usage`
- `sortOrder`: `asc` | `desc`
- `limit`: number (default 20)
- `offset`: number (default 0)

**Response:**
```json
{
  "success": true,
  "data": [
    { /* matching profiles */ }
  ],
  "meta": {
    "total": 10,
    "hasMore": false,
    "query": "development"
  }
}
```

## Bulk Operations

### Bulk Delete Profiles
```http
DELETE /api/profiles/bulk
```

**Request Body:**
```json
{
  "profileIds": ["profile-001", "profile-002"],
  "force": false // skip confirmation if true
}
```

### Bulk Update Profiles
```http
PATCH /api/profiles/bulk
```

**Request Body:**
```json
{
  "profileIds": ["profile-001", "profile-002"],
  "updates": {
    "category": "Updated Category",
    "tags": ["bulk-updated"]
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profile with ID 'profile-001' not found",
    "details": {
      "profileId": "profile-001",
      "suggestions": ["Check profile ID", "List available profiles"]
    }
  }
}
```

### Common Error Codes
- `PROFILE_NOT_FOUND`: Profile doesn't exist
- `PROFILE_NAME_EXISTS`: Duplicate profile name
- `INVALID_MCP_ID`: Referenced MCP doesn't exist
- `PROFILE_IN_USE`: Cannot delete active profile
- `VALIDATION_ERROR`: Profile data validation failed
- `PERMISSION_DENIED`: Insufficient permissions
- `EXPORT_FAILED`: Profile export operation failed
- `IMPORT_FAILED`: Profile import operation failed

## Rate Limiting & Pagination

### Rate Limits
- GET requests: 100 per minute
- POST/PUT/PATCH requests: 60 per minute  
- DELETE requests: 30 per minute
- Bulk operations: 10 per minute

### Pagination
All list endpoints support pagination:
- `limit`: Maximum results per page (default 20, max 100)
- `offset`: Number of results to skip
- `page`: Alternative to offset (page * limit)

### Pagination Response Headers
```http
X-Total-Count: 150
X-Page-Size: 20
X-Current-Page: 1
X-Total-Pages: 8
Link: <https://api.example.com/profiles?page=2>; rel="next"
```

## Authentication & Authorization

### Authentication
- Uses existing JWT token authentication
- Bearer token in Authorization header
- Token validation for all operations

### Authorization Levels
- `read`: View profiles and MCPs
- `write`: Create, update profiles and assignments
- `delete`: Delete profiles  
- `admin`: All operations including bulk actions

### Permission Matrix
| Operation | Read | Write | Delete | Admin |
|-----------|------|-------|---------|--------|
| List/Get  |  ✓   |   ✓   |    ✓    |   ✓    |
| Create    |      |   ✓   |    ✓    |   ✓    |
| Update    |      |   ✓   |    ✓    |   ✓    |
| Delete    |      |       |    ✓    |   ✓    |
| Bulk Ops  |      |       |         |   ✓    |

## WebSocket Events (Optional Enhancement)

### Real-time Profile Updates
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001/ws/profiles');

// Listen for profile changes
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case 'profile.created':
      // Handle new profile
      break;
    case 'profile.updated': 
      // Handle profile update
      break;
    case 'profile.switched':
      // Handle profile switch
      break;
  }
};
```

### Event Types
- `profile.created`: New profile created
- `profile.updated`: Profile modified
- `profile.deleted`: Profile removed
- `profile.switched`: Active profile changed
- `mcps.updated`: MCPs in profile changed