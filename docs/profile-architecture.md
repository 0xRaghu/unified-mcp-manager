# MCP Profiles Architecture Design

## System Overview

The MCP Profiles feature enables users to create, manage, and switch between different collections of MCP configurations. This architecture extends the existing MCP-JSON-UI system with comprehensive profile management capabilities.

## Enhanced Profile Data Model

### Core Profile Interface
```typescript
interface ProfileMetadata {
  author?: string;
  version?: string;
  compatibility?: string;
  lastExported?: Date;
  exportFormat?: string;
}

interface ProfileStats {
  totalMCPs: number;
  enabledMCPs: number;
  disabledMCPs: number;
  mostUsedMCP?: string;
  avgUsageCount: number;
}

interface EnhancedProfile extends Profile {
  // Core fields (existing)
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  
  // Enhanced fields
  metadata: ProfileMetadata;
  stats: ProfileStats;
  tags: string[];
  color?: string; // For visual identification
  icon?: string;  // For visual identification
  category: string; // Development, Production, Testing, etc.
  settings: {
    autoEnable: boolean;    // Auto-enable MCPs when loading profile
    autoDisable: boolean;   // Auto-disable others when loading profile
    strictMode: boolean;    // Only allow MCPs in this profile
  };
}
```

## Profile-MCP Relationships

1. **One-to-Many**: Profile → MCPs (via mcpIds array)
2. **Many-to-Many**: MCPs can belong to multiple profiles
3. **Profile Inheritance**: Profiles can inherit from parent profiles
4. **Profile Dependencies**: Profiles can depend on other profiles

## CRUD Operations Design

### Create Operations
- `createProfile(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>)`
- `createDefaultProfile(name?: string)` - Auto-selects all enabled MCPs
- `duplicateProfile(profileId: string, newName?: string)`
- `createFromTemplate(templateId: string, customizations?: Partial<Profile>)`

### Read Operations
- `getProfile(id: string): Profile | null`
- `getAllProfiles(): Profile[]`
- `getDefaultProfile(): Profile | null`
- `getProfilesByCategory(category: string): Profile[]`
- `getProfileStats(id: string): ProfileStats`
- `getProfileMCPs(id: string): MCP[]`

### Update Operations
- `updateProfile(id: string, updates: Partial<Profile>)`
- `addMCPToProfile(profileId: string, mcpId: string)`
- `removeMCPFromProfile(profileId: string, mcpId: string)`
- `setDefaultProfile(id: string)`
- `updateProfileMCPs(profileId: string, mcpIds: string[])`
- `renameProfile(id: string, newName: string)`

### Delete Operations
- `deleteProfile(id: string)`
- `clearProfile(id: string)` // Remove all MCPs but keep profile
- `bulkDeleteProfiles(ids: string[])`

### Validation Operations
- `validateProfile(profile: Partial<Profile>): ValidationResult`
- `validateProfileName(name: string): boolean`
- `checkProfileConflicts(profile: Profile): ConflictResult[]`

## Profile Switching Logic

### Switching Modes
1. **Soft Switch**: Keep other MCPs, just highlight profile MCPs
2. **Hard Switch**: Disable all, enable only profile MCPs  
3. **Additive Switch**: Enable profile MCPs, keep others as-is
4. **Preview Switch**: Temporarily switch without saving state

### Switching Workflow
1. **Pre-Switch Validation**:
   - Check profile exists and is valid
   - Validate MCP dependencies
   - Check for conflicts with current state

2. **Switch Execution**:
   - Save current state (for rollback)
   - Apply profile configuration
   - Update MCP enabled/disabled states
   - Update UI selection state
   - Trigger re-renders

3. **Post-Switch Actions**:
   - Update profile usage statistics
   - Log switch event
   - Notify other components
   - Auto-save if configured

### Switching API
```typescript
interface SwitchResult {
  success: boolean;
  previousState?: ProfileState;
  errors?: string[];
}

interface SwitchEvent {
  timestamp: Date;
  fromProfile?: string;
  toProfile: string;
  mode: SwitchMode;
  success: boolean;
}

- switchToProfile(profileId: string, mode: SwitchMode): Promise<SwitchResult>
- previewProfile(profileId: string): Promise<PreviewResult>
- rollbackSwitch(): Promise<void>
- getSwitchHistory(): SwitchEvent[]
```

## Default Profile Creation

### Auto-Creation Logic
1. **On First Launch**: Create "Default Profile" with all current MCPs
2. **On MCP Import**: Option to create profile from imported MCPs
3. **Smart Suggestions**: Suggest profiles based on MCP categories

### Default Profile Behavior
- One profile marked as default at any time
- Auto-load default profile on app start
- Fallback to "no profile" if default is deleted

## Profile Name Generation Strategy

### Naming Patterns
1. **Custom Names**: User-provided names (preferred)
2. **Auto-generated**: "Profile 1", "Profile 2", etc.
3. **Template-based**: "Development Profile", "Production Profile"
4. **Context-aware**: Based on MCPs included

### Naming Rules
- Default pattern: "Profile {number}"
- Find highest existing number, increment by 1
- Skip deleted profile numbers
- Validate uniqueness before assignment
- Suggest alternatives if conflicts

### Smart Naming
- Analyze MCP categories to suggest names
- "GitHub + Notion Profile" if contains GitHub & Notion MCPs
- "Development Tools" if mostly dev MCPs
- "AI Services" if contains AI-related MCPs

## Persistence Strategy

### Storage Architecture
1. **Primary**: API-based storage (existing pattern)
2. **Cache**: Browser localStorage for quick access
3. **Backup**: Automatic backups on profile changes
4. **Sync**: Cross-device sync capabilities

### API Endpoints
```
/api/profiles
├── GET    - List all profiles
├── POST   - Create new profile  
├── PUT    - Update profile
└── DELETE - Delete profile

/api/profiles/{id}
├── GET    - Get specific profile
├── PUT    - Update specific profile
├── DELETE - Delete specific profile
└── /mcps  - Profile MCP operations
```

### Caching Strategy
- Cache active profile for instant loading
- Cache profile list for dropdown
- Invalidate on changes
- Sync with server on app start

## Integration with Existing MCP Store

### Store Enhancements
1. Add profile-specific state management
2. Enhance profile operations with new features
3. Add profile switching logic
4. Implement profile validation
5. Add profile-MCP relationship management

### New State Fields
```typescript
interface MCPStore {
  // Existing fields...
  
  // New profile fields
  activeProfile: Profile | null;
  profileSwitchHistory: SwitchEvent[];
  profilePreview: Profile | null;
  profileCache: Map<string, Profile>;
}
```

### Backward Compatibility
- Existing profile operations remain functional
- Graceful degradation if no profiles exist
- Migration path for existing data
- No breaking changes to current API

## Data Flow Diagrams

### Profile Creation Flow
```
User Input → Validation → Name Generation → MCP Selection → Store Creation → UI Update
```

### Profile Switching Flow
```
Profile Selection → Pre-validation → State Backup → MCP State Update → UI Refresh → Post-actions
```

### Profile Export Flow
```
Profile Selection → MCP Data Gathering → Format Conversion → Export Generation → Download/Copy
```

## Architecture Decision Records

### ADR-001: Profile Storage Strategy
**Decision**: Use API-based storage with browser caching
**Rationale**: Consistent with existing architecture, enables cross-device sync
**Consequences**: Requires backend support, improves performance with caching

### ADR-002: Profile-MCP Relationship
**Decision**: Many-to-Many relationship via mcpIds array
**Rationale**: Flexible, allows MCPs to belong to multiple profiles
**Consequences**: Requires careful cleanup of orphaned references

### ADR-003: Profile Switching Modes
**Decision**: Support multiple switching modes (soft, hard, additive, preview)
**Rationale**: Different user workflows require different behaviors
**Consequences**: Increased complexity but better user experience

### ADR-004: Default Profile Handling  
**Decision**: One default profile maximum, auto-create on first use
**Rationale**: Simple mental model, predictable behavior
**Consequences**: Need cleanup logic when default is deleted