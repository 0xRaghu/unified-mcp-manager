"use client"

import * as React from "react"
import { Check, ChevronDown, Plus, User, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMCPStore } from "../stores/mcpStore"
import type { Profile } from "../types"

interface ProfileDropdownProps {
  onCreateProfile: () => void
  onManageProfiles: () => void
  onEditProfile: (profile: Profile) => void
  onDeleteProfile: (profile: Profile) => void
}

export function ProfileDropdown({
  onCreateProfile,
  onManageProfiles,
  onEditProfile,
  onDeleteProfile,
}: ProfileDropdownProps) {
  const { 
    profiles, 
    selectedProfile, 
    setActiveProfile, 
    loadProfile, 
    mcps,
    enableAllMCPs
  } = useMCPStore()

  const handleProfileSelect = async (profileId: string | null) => {
    if (profileId) {
      await loadProfile(profileId)
    } else {
      // When "All MCPs" is selected, enable all MCPs and clear selected profile
      await enableAllMCPs()
      setActiveProfile(null)
    }
  }

  const getProfileMCPCount = (profile: Profile) => {
    return profile.mcpIds.filter(id => mcps.some(mcp => mcp.id === id)).length
  }

  const activeMCPCount = mcps.filter(mcp => !mcp.disabled).length
  const totalMCPCount = mcps.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="truncate">
              {selectedProfile ? selectedProfile.name : 'All MCPs'}
            </span>
            {selectedProfile && (
              <Badge variant="secondary" className="ml-2">
                {getProfileMCPCount(selectedProfile)}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Current Profile</p>
            <p className="text-xs leading-none text-muted-foreground">
              {selectedProfile 
                ? `${getProfileMCPCount(selectedProfile)} MCPs in this profile`
                : `${activeMCPCount}/${totalMCPCount} MCPs active`
              }
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* All MCPs Option */}
        <DropdownMenuItem
          className="flex items-center justify-between cursor-pointer"
          onSelect={() => handleProfileSelect(null)}
        >
          <div className="flex items-center space-x-2">
            <span>All MCPs</span>
            {!selectedProfile && <Check className="h-4 w-4" />}
          </div>
          <Badge variant="outline">
            {activeMCPCount}/{totalMCPCount}
          </Badge>
        </DropdownMenuItem>

        {profiles.length > 0 && <DropdownMenuSeparator />}
        
        {/* Profile Options */}
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            className="flex items-center justify-between cursor-pointer group"
            onSelect={() => handleProfileSelect(profile.id)}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="truncate">{profile.name}</span>
              {selectedProfile?.id === profile.id && <Check className="h-4 w-4" />}
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="text-xs">
                {getProfileMCPCount(profile)}
              </Badge>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditProfile(profile)
                  }}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteProfile(profile)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Actions */}
        <DropdownMenuItem onSelect={onCreateProfile} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Create New Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onManageProfiles} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Manage Profiles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}