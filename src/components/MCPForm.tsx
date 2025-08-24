"use client"

import * as React from "react"
import { X, Plus, FileText, Upload, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMCPStore } from "@/stores/mcpStore"
import type { MCP } from "@/types"

interface MCPFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mcp?: MCP
  onSave: (mcp: Omit<MCP, 'id'>, selectedProfileIds?: string[]) => void
}

export function MCPForm({ open, onOpenChange, mcp, onSave }: MCPFormProps) {
  const { profiles } = useMCPStore()
  const [formData, setFormData] = React.useState({
    name: '',
    command: '',
    args: [''],
    env: [{ key: '', value: '' }],
    type: 'stdio' as 'stdio' | 'http' | 'sse',
    category: 'general',
    description: '',
    url: '',
    headers: [{ key: '', value: '' }],
    alwaysAllow: ['']
  })
  const [selectedProfiles, setSelectedProfiles] = React.useState<string[]>([])
  const [jsonInput, setJsonInput] = React.useState('')
  const [jsonMode, setJsonMode] = React.useState(false)

  React.useEffect(() => {
    if (mcp) {
      setFormData({
        name: mcp.name,
        command: mcp.command || '',
        args: mcp.args && mcp.args.length > 0 ? mcp.args : [''],
        env: mcp.env 
          ? Object.entries(mcp.env).map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }],
        type: mcp.type || 'stdio',
        category: mcp.category || 'general',
        description: mcp.description || '',
        url: mcp.url || '',
        headers: mcp.headers
          ? Object.entries(mcp.headers).map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }],
        alwaysAllow: mcp.alwaysAllow || ['']
      })
    } else {
      setFormData({
        name: '',
        command: '',
        args: [''],
        env: [{ key: '', value: '' }],
        type: 'stdio',
        category: 'general',
        description: '',
        url: '',
        headers: [{ key: '', value: '' }],
        alwaysAllow: ['']
      })
      
      // Smart defaults for profile selection when creating new MCPs
      if (!mcp && profiles.length > 0) {
        // Auto-select default profile if it exists
        const defaultProfile = profiles.find(p => p.isDefault)
        if (defaultProfile) {
          setSelectedProfiles([defaultProfile.id])
        } else {
          // Otherwise, select no profiles by default to let user choose
          setSelectedProfiles([])
        }
      } else {
        setSelectedProfiles([])
      }
    }
    setJsonInput('')
    setJsonMode(false)
  }, [mcp, open])

  const handleJsonParse = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      
      if (parsed.mcpServers) {
        // Handle Claude/Gemini format like {"mcpServers": {"vercel": {"url": "https://mcp.vercel.com"}}}
        const firstServer = Object.entries(parsed.mcpServers)[0]
        if (firstServer) {
          const [name, config] = firstServer as [string, any]
          
          // Determine type based on config properties
          let type: 'stdio' | 'http' | 'sse' = 'stdio'
          if (config.url) {
            type = 'http' // Default HTTP for URL-based configs
          } else if (config.command) {
            type = 'stdio'
          }
          
          setFormData(prev => ({
            ...prev,
            name,
            command: config.command || '',
            args: config.args || (config.command ? [''] : []),
            env: config.env ? Object.entries(config.env).map(([key, value]) => ({ key, value: String(value) })) : [{ key: '', value: '' }],
            type: config.type || type,
            url: config.url || '',
            headers: config.headers ? Object.entries(config.headers).map(([key, value]) => ({ key, value: String(value) })) : [{ key: '', value: '' }],
            alwaysAllow: config.alwaysAllow || [''],
            description: `Imported from JSON`
          }))
        }
      } else if (parsed.url || parsed.command || parsed.name) {
        // Handle direct MCP config format
        let type: 'stdio' | 'http' | 'sse' = 'stdio'
        if (parsed.url) {
          type = 'http'
        }
        
        setFormData(prev => ({
          ...prev,
          name: parsed.name || '',
          command: parsed.command || '',
          args: parsed.args || (parsed.command ? [''] : []),
          env: parsed.env ? Object.entries(parsed.env).map(([key, value]) => ({ key, value: String(value) })) : [{ key: '', value: '' }],
          type: parsed.type || type,
          url: parsed.url || '',
          headers: parsed.headers ? Object.entries(parsed.headers).map(([key, value]) => ({ key, value: String(value) })) : [{ key: '', value: '' }],
          description: parsed.description || '',
          alwaysAllow: parsed.alwaysAllow || ['']
        }))
      } else {
        alert('Unrecognized JSON format. Please ensure it contains either "mcpServers" object or direct MCP configuration.')
        return
      }
      setJsonMode(false)
      setJsonInput('')
    } catch (error) {
      alert('Invalid JSON format: ' + (error as Error).message)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const envObject = formData.env.reduce((acc, { key, value }) => {
      if (key.trim() && value.trim()) {
        acc[key.trim()] = value.trim()
      }
      return acc
    }, {} as Record<string, string>)
    
    const headersObject = formData.headers.reduce((acc, { key, value }) => {
      if (key.trim() && value.trim()) {
        acc[key.trim()] = value.trim()
      }
      return acc
    }, {} as Record<string, string>)
    
    const alwaysAllowArray = formData.alwaysAllow.filter(item => item.trim() !== '')
    
    // Validate required fields based on type
    if ((formData.type === 'http' || formData.type === 'sse') && !formData.url.trim()) {
      alert('URL is required for HTTP/SSE server types')
      return
    }
    
    if (formData.type === 'stdio' && !formData.command.trim()) {
      alert('Command is required for stdio server type')
      return
    }
    
    const mcpData: Omit<MCP, 'id'> = {
      name: formData.name,
      type: formData.type,
      category: formData.category,
      description: formData.description,
      usageCount: 0,
      tags: [],
      // Conditional fields based on type
      ...(formData.type === 'stdio' 
        ? {
            command: formData.command,
            args: formData.args.filter(arg => arg.trim() !== ''),
          }
        : {
            url: formData.url.trim(),
            headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
          }
      ),
      env: Object.keys(envObject).length > 0 ? envObject : undefined,
      alwaysAllow: alwaysAllowArray.length > 0 ? alwaysAllowArray : undefined,
    }
    
    onSave(mcpData, selectedProfiles)
    onOpenChange(false)
  }

  const addArg = () => {
    setFormData(prev => ({
      ...prev,
      args: [...prev.args, '']
    }))
  }

  const removeArg = (index: number) => {
    setFormData(prev => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index)
    }))
  }

  const updateArg = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      args: prev.args.map((arg, i) => i === index ? value : arg)
    }))
  }

  const addEnvVar = () => {
    setFormData(prev => ({
      ...prev,
      env: [...prev.env, { key: '', value: '' }]
    }))
  }

  const removeEnvVar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      env: prev.env.filter((_, i) => i !== index)
    }))
  }

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      env: prev.env.map((envVar, i) => 
        i === index ? { ...envVar, [field]: value } : envVar
      )
    }))
  }

  const addAlwaysAllow = () => {
    setFormData(prev => ({
      ...prev,
      alwaysAllow: [...prev.alwaysAllow, '']
    }))
  }

  const removeAlwaysAllow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      alwaysAllow: prev.alwaysAllow.filter((_, i) => i !== index)
    }))
  }

  const updateAlwaysAllow = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      alwaysAllow: prev.alwaysAllow.map((item, i) => i === index ? value : item)
    }))
  }

  const addHeader = () => {
    setFormData(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }]
    }))
  }

  const removeHeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index)
    }))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: prev.headers.map((header, i) => 
        i === index ? { ...header, [field]: value } : header
      )
    }))
  }

  // Simple profile selection handlers without complex memoization
  const handleSelectAllProfiles = () => {
    setSelectedProfiles(profiles.map(p => p.id))
  }

  const handleSelectNoneProfiles = () => {
    setSelectedProfiles([])
  }

  const handleProfileToggle = (profileId: string) => {
    setSelectedProfiles(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mcp ? 'Edit MCP' : 'Add MCP'}</DialogTitle>
          <DialogDescription>
            {mcp ? 'Update the MCP configuration' : 'Add a new MCP configuration or paste JSON to auto-fill'}
          </DialogDescription>
        </DialogHeader>

        {!jsonMode ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Configuration</h3>
              <Button type="button" variant="outline" onClick={() => setJsonMode(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Paste JSON
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., GitHub MCP"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Transport Type</Label>
                <Select value={formData.type} onValueChange={(value: 'stdio' | 'http' | 'sse') => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">stdio (subprocess)</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="sse">HTTP + SSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            {formData.type === 'http' || formData.type === 'sse' ? (
              <div className="space-y-2">
                <Label htmlFor="url">Server URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/mcp"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="command">Command</Label>
                <Input
                  id="command"
                  value={formData.command}
                  onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., npx -y @modelcontextprotocol/server-github"
                  required
                />
              </div>
            )}

            {formData.type === 'stdio' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Arguments</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addArg}>
                    <Plus className="w-4 h-4" />
                    Add Arg
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.args.map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={arg}
                        onChange={(e) => updateArg(index, e.target.value)}
                        placeholder="Argument value"
                      />
                      {formData.args.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArg(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(formData.type === 'http' || formData.type === 'sse') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>HTTP Headers (Optional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                    <Plus className="w-4 h-4" />
                    Add Header
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        placeholder="Header-Name"
                        className="flex-1"
                      />
                      <Input
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        placeholder="header value"
                        className="flex-1"
                      />
                      {formData.headers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeHeader(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environment Variables</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
                  <Plus className="w-4 h-4" />
                  Add Env Var
                </Button>
              </div>
              <div className="space-y-2">
                {formData.env.map((envVar, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                      placeholder="KEY"
                      className="flex-1"
                    />
                    <Input
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      placeholder="value"
                      type="password"
                      className="flex-1"
                    />
                    {formData.env.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEnvVar(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Always Allow (Permissions)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAlwaysAllow}>
                  <Plus className="w-4 h-4" />
                  Add Permission
                </Button>
              </div>
              <div className="space-y-2">
                {formData.alwaysAllow.map((permission, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={permission}
                      onChange={(e) => updateAlwaysAllow(index, e.target.value)}
                      placeholder="e.g., read_file, write_file"
                    />
                    {formData.alwaysAllow.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeAlwaysAllow(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {profiles.length > 0 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <Label className="text-base font-medium">Add to Profiles</Label>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllProfiles}
                        disabled={selectedProfiles.length === profiles.length}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectNoneProfiles}
                        disabled={selectedProfiles.length === 0}
                        className="text-xs"
                      >
                        Select None
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {profiles.map((profile) => {
                      const isSelected = selectedProfiles.includes(profile.id)
                      const mcpCount = profile.mcpIds.length
                      return (
                        <div
                          key={profile.id}
                          className="flex items-start sm:items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`profile-${profile.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleProfileToggle(profile.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor={`profile-${profile.id}`}
                                className="text-sm font-medium cursor-pointer truncate"
                              >
                                {profile.name}
                              </Label>
                              <span className="text-xs text-gray-500 ml-2">
                                {mcpCount} MCP{mcpCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {profile.description && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {profile.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedProfiles.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      This MCP will be added to {selectedProfiles.length} profile{selectedProfiles.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {mcp ? 'Update MCP' : 'Add MCP'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Paste JSON Configuration</h3>
              <Button type="button" variant="outline" onClick={() => setJsonMode(false)}>
                Manual Form
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="json-input">JSON Configuration</Label>
              <Textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`Paste your MCP JSON configuration here. Supports multiple formats:

1. HTTP/SSE Server (like Vercel):
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}

2. Stdio Server (traditional):
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}

3. Direct format:
{
  "name": "Notion API",
  "url": "https://mcp.notion.com/mcp",
  "type": "http",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}`}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleJsonParse} disabled={!jsonInput.trim()}>
                <Upload className="w-4 h-4 mr-2" />
                Parse & Import
              </Button>
              <Button type="button" variant="outline" onClick={() => setJsonMode(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}