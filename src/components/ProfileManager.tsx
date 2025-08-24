"use client"

import * as React from "react"
// Simple date formatting function
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(date);
};
import { MoreHorizontal, Edit, Trash2, Download, Upload, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMCPStore } from "../stores/mcpStore"
import { useToast } from "./ui/toast"
import { copyToClipboard, downloadAsFile } from "../lib/utils"
import type { Profile } from "../types"

interface ProfileManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProfile: () => void
  onEditProfile: (profile: Profile) => void
}

export function ProfileManager({ 
  open, 
  onOpenChange, 
  onCreateProfile, 
  onEditProfile 
}: ProfileManagerProps) {
  const { 
    profiles, 
    mcps, 
    deleteProfile, 
    exportProfile, 
    importProfile,
    selectedProfile,
    setActiveProfile 
  } = useMCPStore()
  const { showToast } = useToast()
  
  const [importData, setImportData] = React.useState('')
  const [showImport, setShowImport] = React.useState(false)

  const getProfileMCPCount = (profile: Profile) => {
    return profile.mcpIds.filter(id => mcps.some(mcp => mcp.id === id)).length
  }

  const handleDeleteProfile = async (profile: Profile) => {
    if (confirm(`Are you sure you want to delete "${profile.name}"? This action cannot be undone.`)) {
      try {
        await deleteProfile(profile.id)
        
        // Clear active profile if it was deleted
        if (selectedProfile?.id === profile.id) {
          setActiveProfile(null)
        }
        
        showToast({
          title: 'Profile deleted',
          description: `${profile.name} has been deleted successfully`,
          type: 'success',
          duration: 3000
        })
      } catch (error) {
        showToast({
          title: 'Failed to delete profile',
          description: (error as Error).message,
          type: 'error',
          duration: 5000
        })
      }
    }
  }

  const handleExportProfile = async (profile: Profile) => {
    try {
      const exportData = exportProfile(profile.id)
      const jsonString = JSON.stringify(exportData, null, 2)
      
      const success = await copyToClipboard(jsonString)
      if (success) {
        showToast({
          title: 'Profile copied',
          description: `${profile.name} configuration copied to clipboard`,
          type: 'success',
          duration: 3000
        })
      } else {
        // Fallback to download
        downloadAsFile(jsonString, `${profile.name.toLowerCase().replace(/\s+/g, '-')}-profile.json`, 'application/json')
        showToast({
          title: 'Profile downloaded',
          description: `${profile.name} configuration downloaded as file`,
          type: 'success',
          duration: 3000
        })
      }
    } catch (error) {
      showToast({
        title: 'Export failed',
        description: (error as Error).message,
        type: 'error',
        duration: 5000
      })
    }
  }

  const handleImportProfile = async () => {
    if (!importData.trim()) return

    try {
      await importProfile(importData)
      setImportData('')
      setShowImport(false)
      
      showToast({
        title: 'Profile imported',
        description: 'Profile has been imported successfully',
        type: 'success',
        duration: 3000
      })
    } catch (error) {
      showToast({
        title: 'Import failed',
        description: (error as Error).message,
        type: 'error',
        duration: 5000
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Profile Manager</DialogTitle>
          <DialogDescription>
            Manage your MCP profiles, export configurations, and import from backups
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button onClick={onCreateProfile}>
                Create New Profile
              </Button>
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import Profile
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {profiles.length} profile{profiles.length !== 1 ? 's' : ''} total
            </div>
          </div>

          {/* Import Section */}
          {showImport && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-2">Import Profile</h4>
              <textarea
                className="w-full h-32 p-2 border rounded text-sm font-mono"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste profile JSON data here..."
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleImportProfile} disabled={!importData.trim()}>
                  Import
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowImport(false)
                  setImportData('')
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Profiles List */}
          <div className="flex-1 overflow-y-auto">
            {profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <Copy className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No profiles yet</h3>
                <p className="text-gray-600 mb-4">Create your first profile to save MCP configurations</p>
                <Button onClick={onCreateProfile}>
                  Create First Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div key={profile.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{profile.name}</h3>
                          {profile.isDefault && (
                            <Badge variant="default" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {selectedProfile?.id === profile.id && (
                            <Badge variant="secondary" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        {profile.description && (
                          <p className="text-sm text-gray-600 mb-2">{profile.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{getProfileMCPCount(profile)} MCPs</span>
                          <span>Created {formatDate(new Date(profile.createdAt))}</span>
                          {profile.updatedAt !== profile.createdAt && (
                            <span>Updated {formatDate(new Date(profile.updatedAt))}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {getProfileMCPCount(profile)} MCPs
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditProfile(profile)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportProfile(profile)}>
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProfile(profile)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}