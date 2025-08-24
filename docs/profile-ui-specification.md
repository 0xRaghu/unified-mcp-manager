# Profile UI Component Specification

## Component Hierarchy

### 1. Profile Selector Dropdown
**Component**: `ProfileSelector`
**Location**: Header toolbar (next to Export button)
**Purpose**: Primary interface for viewing and switching profiles

#### Features
- Current profile display with icon/color indicator
- Quick switch dropdown with all available profiles
- "Manage Profiles" action item
- Default profile indicator (star icon)
- Profile stats preview on hover
- Search/filter for profiles (if many exist)

#### Props Interface
```typescript
interface ProfileSelectorProps {
  currentProfile: Profile | null;
  profiles: Profile[];
  onProfileSwitch: (profileId: string) => void;
  onManageProfiles: () => void;
  disabled?: boolean;
}
```

#### Visual Design
```
┌─────────────────────────┐
│ 🟦 Development Profile  ▼│
├─────────────────────────┤
│ ⭐ Default Profile       │
│ 🟩 Production Setup     │
│ 🟨 Testing Environment  │
│ ────────────────────    │
│ ⚙️  Manage Profiles...   │
└─────────────────────────┘
```

### 2. Profile Management Dialog
**Component**: `ProfileManagementDialog`
**Trigger**: "Manage Profiles" action from selector
**Purpose**: Comprehensive profile management interface

#### Features
- Profile list with card-based layout
- Create new profile button
- Edit/Delete actions for each profile
- Drag & drop MCP assignment interface
- Profile import/export actions
- Profile statistics display
- Search and filter profiles

#### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│                  Profile Management                         │
├────────────────────────────────────────────────────────────┤
│ [Search...] [Filter: All] [+ New Profile] [Import] [Export]│
├────────────────────────────────────────────────────────────┤
│  Profile Cards Grid                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │🟦Default │ │🟩Production│ │🟨Testing │                   │
│  │5 MCPs    │ │3 MCPs     │ │2 MCPs    │                   │
│  │[Edit][Del]│ │[Edit][Del] │ │[Edit][Del]│                  │
│  └──────────┘ └──────────┘ └──────────┘                   │
├────────────────────────────────────────────────────────────┤
│                [Close] [Apply Changes]                      │
└────────────────────────────────────────────────────────────┘
```

### 3. Profile Form Dialog
**Component**: `ProfileForm`
**Trigger**: Create/Edit profile actions
**Purpose**: Create or modify profile configurations

#### Features
- Profile metadata inputs (name, description, category)
- MCP selection interface with search/filter
- Profile settings toggles
- Color/icon picker for visual identification
- Tags input with auto-complete
- Validation feedback
- Preview profile effects

#### Form Structure
```typescript
interface ProfileFormProps {
  profile?: Profile;
  mcps: MCP[];
  onSave: (profile: ProfileFormData) => void;
  onCancel: () => void;
}

interface ProfileFormData {
  name: string;
  description: string;
  category: string;
  selectedMCPIds: string[];
  settings: ProfileSettings;
  color?: string;
  icon?: string;
  tags: string[];
}
```

### 4. Profile Card Component
**Component**: `ProfileCard`
**Usage**: Within management dialog and selection interfaces
**Purpose**: Visual representation of profile with quick actions

#### Features
- Profile name with color/icon indicator
- MCP count and status badges
- Last used timestamp
- Default profile star indicator
- Quick actions (switch, edit, delete, duplicate)
- Hover effects with detailed stats

#### Card Layout
```
┌─────────────────────────────┐
│ 🟦 Development Profile  ⭐  │
│ "Local development setup"   │
│ ─────────────────────────   │
│ 📊 5 MCPs (4 enabled)      │
│ 🕐 Last used 2 hours ago   │
│ ─────────────────────────   │
│ [Switch] [Edit] [•••]      │
└─────────────────────────────┘
```

### 5. MCP Assignment Interface
**Component**: `ProfileMCPAssignment`
**Context**: Within profile form or dedicated assignment dialog
**Purpose**: Assign/remove MCPs to/from profiles

#### Features
- Dual-pane layout (Available | Selected)
- Search and filter MCPs in both panes
- Drag & drop between panes
- Bulk selection with checkboxes
- MCP details preview
- Category-based grouping

#### Layout Design
```
┌─────────────────────────────────────────────────────────────┐
│              Assign MCPs to Profile                         │
├─────────────────────────────────────────────────────────────┤
│ Available MCPs          │ Selected MCPs (3)                 │
│ [Search...]             │ [Search...]                       │
│ ├─────────────────────   │ ├─────────────────────            │
│ │☐ GitHub MCP         │ │ │☑ Notion API        →│            │
│ │☐ Database Helper    │ │ │☑ File Manager      →│            │
│ │☐ Slack Integration  │ │ │☑ Web Scraper       →│            │
│ │☐ Email Service      │ │ │                     │            │
│ └─────────────────────   │ └─────────────────────            │
├─────────────────────────────────────────────────────────────┤
│                    [Cancel] [Save Changes]                  │
└─────────────────────────────────────────────────────────────┘
```

## UI Integration Points

### Header Integration
- Add Profile Selector dropdown between search and export buttons
- Show current profile name with visual indicator
- Maintain existing header layout and styling

### MCP List Enhancements
- Add profile membership indicators to MCP cards
- Show which profiles contain each MCP
- Color-coded profile badges
- Filter MCPs by profile membership

### Settings Integration
- Add "Profiles" tab to settings dialog
- Profile management preferences
- Default profile configuration
- Profile auto-switching settings

### Export Enhancements
- Add "Export Profile" option to export dropdown
- Profile-specific export formats
- Include profile metadata in exports

## Responsive Design Considerations

### Mobile Layout
- Profile selector becomes full-width button
- Management dialog becomes full-screen modal
- Card grid becomes single column
- Touch-friendly drag & drop with dedicated move buttons

### Tablet Layout
- Maintain desktop-like experience
- Optimize card sizes for tablet screens
- Enhanced touch interactions

### Desktop Layout
- Full featured interface as specified
- Keyboard shortcuts support
- Advanced drag & drop capabilities

## Accessibility Features

### ARIA Support
- Proper labeling for screen readers
- Role assignments for interactive elements
- Keyboard navigation support
- Focus management in modals

### Color & Contrast
- High contrast mode support
- Color-blind friendly indicators
- Alternative visual cues beyond color
- Consistent iconography

### Keyboard Navigation
- Tab order optimization
- Keyboard shortcuts for common actions
- Escape key closes modals
- Enter key activates primary actions

## Animation & Transitions

### Profile Switching
- Smooth transition effects when switching profiles
- Visual feedback during switch process
- Loading states for async operations

### Card Interactions
- Hover animations for profile cards
- Smooth expand/collapse for details
- Fade in/out for dynamic content

### Drag & Drop
- Visual feedback during drag operations
- Drop zone highlighting
- Snap-to-grid animations

## Error Handling & Feedback

### Validation Messages
- Real-time validation feedback
- Clear error messages with solutions
- Warning for potential conflicts

### Loading States
- Skeleton loaders for profile cards
- Progress indicators for operations
- Graceful degradation on failures

### Success Feedback
- Toast notifications for successful operations
- Visual confirmations for state changes
- Undo capabilities where appropriate