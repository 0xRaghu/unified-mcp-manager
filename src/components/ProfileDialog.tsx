"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMCPStore } from "../stores/mcpStore"
import type { Profile, MCP } from "../types"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile?: Profile
  mode: 'create' | 'edit'
}

export function ProfileDialog({ open, onOpenChange, profile, mode }: ProfileDialogProps) {
  const { mcps, createProfile, updateProfile } = useMCPStore()
  
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    mcpIds: [] as string[],
    isDefault: false
  })

  React.useEffect(() => {
    if (mode === 'edit' && profile) {
      setFormData({
        name: profile.name,
        description: profile.description,
        mcpIds: [...profile.mcpIds],
        isDefault: profile.isDefault
      })
    } else {
      // Auto-generate name for new profiles
      const profileCount = mcps.length > 0 ? Math.ceil(mcps.length / 5) : 1
      const defaultName = `Profile ${profileCount}`
      
      setFormData({
        name: defaultName,
        description: '',
        mcpIds: [],
        isDefault: false
      })
    }
  }, [profile, mode, mcps.length, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Profile name is required')
      return
    }

    try {
      if (mode === 'edit' && profile) {
        await updateProfile(profile.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          mcpIds: formData.mcpIds,
          isDefault: formData.isDefault
        })
      } else {
        await createProfile({
          name: formData.name.trim(),
          description: formData.description.trim(),
          mcpIds: formData.mcpIds,
          isDefault: formData.isDefault
        })
      }
      onOpenChange(false)
    } catch (error) {
      alert('Failed to save profile: ' + (error as Error).message)
    }
  }

  const handleMCPToggle = (mcpId: string) => {
    setFormData(prev => ({
      ...prev,
      mcpIds: prev.mcpIds.includes(mcpId)
        ? prev.mcpIds.filter(id => id !== mcpId)
        : [...prev.mcpIds, mcpId]
    }))
  }

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      mcpIds: mcps.map(mcp => mcp.id)
    }))
  }

  const handleSelectNone = () => {
    setFormData(prev => ({
      ...prev,
      mcpIds: []
    }))
  }

  const handleSelectEnabled = () => {
    setFormData(prev => ({
      ...prev,
      mcpIds: mcps.filter(mcp => !mcp.disabled).map(mcp => mcp.id)
    }))
  }

  const selectedMCPs = mcps.filter(mcp => formData.mcpIds.includes(mcp.id))
  const availableMCPs = mcps.filter(mcp => !formData.mcpIds.includes(mcp.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Profile' : 'Create New Profile'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Update your profile configuration and MCP selection'
              : 'Create a new profile to save a specific combination of MCPs'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Development Setup"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-7">
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                />
                <Label>Set as default profile</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this profile is for..."
                className="resize-none"
                rows={2}
              />
            </div>

            {/* MCP Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Select MCPs</h3>
                  <p className="text-sm text-gray-600">
                    Choose which MCPs should be included in this profile
                  </p>
                </div>
                <Badge variant="secondary">
                  {formData.mcpIds.length} selected
                </Badge>
              </div>

              {/* Selection Actions */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectEnabled}>
                  Select Enabled
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectNone}>
                  Select None
                </Button>
              </div>

              {/* MCP List */}
              {mcps.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {mcps.map((mcp) => (
                    <div key={mcp.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                      <Switch
                        checked={formData.mcpIds.includes(mcp.id)}
                        onCheckedChange={() => handleMCPToggle(mcp.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm font-medium cursor-pointer">
                            {mcp.name}
                          </Label>
                          <Badge variant={mcp.disabled ? "secondary" : "default"} className="text-xs">
                            {mcp.type || 'stdio'}
                          </Badge>
                          {mcp.disabled && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {mcp.description && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {mcp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No MCPs available. Add some MCPs first.</p>
                </div>
              )}
            </div>

            {/* Selected MCPs Summary */}
            {selectedMCPs.length > 0 && (
              <div className="space-y-2">
                <Label>Selected MCPs ({selectedMCPs.length})</Label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border rounded-lg p-2">
                  {selectedMCPs.map((mcp) => (
                    <Badge 
                      key={mcp.id} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-700"
                      onClick={() => handleMCPToggle(mcp.id)}
                    >
                      {mcp.name} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'edit' ? 'Update Profile' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}