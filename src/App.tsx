import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Download, 
  Server, 
  Clock, 
  MoreVertical, 
  Filter, 
  RefreshCw,
  Copy,
  Grid3X3,
  List,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { useMCPStore } from './stores/mcpStore';
import type { MCP } from './types';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { copyToClipboard, downloadAsFile } from './lib/utils';
import { MCPForm } from './components/MCPForm';
import { useToast } from './components/ui/toast';
import { testMCPConnection } from './lib/mcpTester';
import { Switch } from './components/ui/switch';

function App() {
  const { 
    loadData, 
    isLoading, 
    error, 
    mcps, 
    getFilteredMCPs,
    exportMCPs,
    setFilters,
    addMCP,
    updateMCP,
    deleteMCP,
    duplicateMCP,
    toggleMCP
  } = useMCPStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCP | undefined>(undefined);
  const [testingMCP, setTestingMCP] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'testing'>>({});
  const { showToast } = useToast();
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Test connections for all enabled MCPs on app start
  useEffect(() => {
    const testAllConnections = async () => {
      const enabledMCPs = mcps.filter(mcp => !mcp.disabled);
      for (const mcp of enabledMCPs) {
        setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'testing' }));
        try {
          const result = await testMCPConnection(mcp);
          setConnectionStatuses(prev => ({ 
            ...prev, 
            [mcp.id]: result.success ? 'connected' : 'disconnected' 
          }));
        } catch {
          setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'disconnected' }));
        }
      }
    };

    if (mcps.length > 0) {
      testAllConnections();
    }
  }, [mcps.length]);

  useEffect(() => {
    setFilters({ search: searchQuery });
  }, [searchQuery, setFilters]);

  const filteredMCPs = getFilteredMCPs();
  const activeMCPs = mcps.filter(mcp => !mcp.disabled).length;

  const handleExportJSON = async () => {
    const exported = exportMCPs();
    const jsonString = JSON.stringify(exported, null, 2);
    const success = await copyToClipboard(jsonString);
    
    showToast({
      title: success ? 'Copied to clipboard' : 'Copy failed',
      description: success ? 'MCP configuration copied as JSON' : 'Failed to copy to clipboard',
      type: success ? 'success' : 'error',
      duration: 3000
    });
  };

  const handleDownloadJSON = () => {
    const exported = exportMCPs();
    const jsonString = JSON.stringify(exported, null, 2);
    downloadAsFile(jsonString, 'mcp-config.json', 'application/json');
  };

  const handleAddMCP = () => {
    setEditingMCP(undefined);
    setIsFormOpen(true);
  };

  const handleEditMCP = (mcp: MCP) => {
    setEditingMCP(mcp);
    setIsFormOpen(true);
  };

  const handleSaveMCP = (mcpData: Omit<MCP, 'id'>) => {
    if (editingMCP) {
      updateMCP(editingMCP.id, mcpData);
    } else {
      addMCP(mcpData);
    }
  };

  const handleDeleteMCP = async (mcp: MCP) => {
    if (confirm(`Are you sure you want to delete "${mcp.name}"?`)) {
      await deleteMCP(mcp.id);
    }
  };

  const handleDuplicateMCP = async (mcp: MCP) => {
    await duplicateMCP(mcp.id);
  };

  const handleToggleMCP = async (mcp: MCP) => {
    await toggleMCP(mcp.id);
    showToast({
      title: `MCP ${mcp.disabled ? 'enabled' : 'disabled'}`,
      description: `${mcp.name} has been ${mcp.disabled ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 3000
    });
  };

  const handleRefresh = async () => {
    await loadData();
    const enabledMCPs = mcps.filter(mcp => !mcp.disabled);
    setConnectionStatuses({});
    for (const mcp of enabledMCPs) {
      setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'testing' }));
      try {
        const result = await testMCPConnection(mcp);
        setConnectionStatuses(prev => ({ 
          ...prev, 
          [mcp.id]: result.success ? 'connected' : 'disconnected' 
        }));
      } catch {
        setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'disconnected' }));
      }
    }
  };


  const handleTestConnection = async (mcp: MCP) => {
    setTestingMCP(mcp.id);
    setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'testing' }));
    showToast({
      title: 'Testing connection...',
      description: `Connecting to ${mcp.name}`,
      type: 'info',
      duration: 2000
    });

    try {
      const result = await testMCPConnection(mcp);
      
      setConnectionStatuses(prev => ({ 
        ...prev, 
        [mcp.id]: result.success ? 'connected' : 'disconnected' 
      }));
      
      showToast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: `${result.message} (${result.duration}ms)`,
        type: result.success ? 'success' : 'error',
        duration: 5000
      });
    } catch (error) {
      setConnectionStatuses(prev => ({ ...prev, [mcp.id]: 'disconnected' }));
      showToast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000
      });
    } finally {
      setTestingMCP(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MCP Manager...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Application
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MCP Manager</h1>
                <p className="text-sm text-gray-600">Centralized MCP Configuration Tool</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="text-sm text-gray-600">
            Total MCPs: <span className="font-semibold text-gray-900">{mcps.length}</span>
          </div>
          <div className="text-sm text-gray-600">
            Enabled: <span className="font-semibold text-green-600">{activeMCPs}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search MCPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilters({ status: 'all' })}>
                  All MCPs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters({ status: 'enabled' })}>
                  Enabled Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilters({ status: 'disabled' })}>
                  Disabled Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex border rounded-md">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportJSON}>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
            <Button variant="outline" onClick={handleDownloadJSON}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleAddMCP}>
              <Plus className="h-4 w-4 mr-2" />
              Add MCP
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredMCPs.length === 0 && mcps.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <Server className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No MCPs Yet</h3>
            <p className="text-gray-600 text-center max-w-md mb-6">
              Get started by adding your first MCP configuration. 
              You can paste JSON from any MCP documentation or import from existing configs.
            </p>
            <Button onClick={handleAddMCP}>
              <Plus className="h-4 w-4 mr-2" />
              Add First MCP
            </Button>
          </div>
        ) : filteredMCPs.length === 0 ? (
          // No results
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No MCPs found</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          // MCP Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMCPs.map((mcp) => {
                const connectionStatus = connectionStatuses[mcp.id];
                const isConnected = connectionStatus === 'connected';
                const isConnecting = connectionStatus === 'testing';
                const isDisconnected = connectionStatus === 'disconnected';
                
                return (
                  <motion.div
                    key={mcp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Server className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-gray-900 truncate">{mcp.name}</h3>
                                <p className="text-sm text-gray-600 truncate">
                                  {mcp.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!mcp.disabled}
                                  onCheckedChange={() => handleToggleMCP(mcp)}
                                  className="h-4 w-7"
                                />
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditMCP(mcp)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateMCP(mcp)}>Duplicate</DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleTestConnection(mcp)}
                                    disabled={testingMCP === mcp.id}
                                  >
                                    {testingMCP === mcp.id ? 'Testing...' : 'Test Connection'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteMCP(mcp)} className="text-red-600">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isConnecting ? (
                                <Badge variant="outline" className="text-yellow-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Testing...
                                </Badge>
                              ) : !mcp.disabled ? (
                                <Badge 
                                  variant="outline" 
                                  className={isConnected ? "text-green-600" : isDisconnected ? "text-red-600" : "text-gray-500"}
                                >
                                  {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                                  {isConnected ? 'Connected' : isDisconnected ? 'Disconnected' : 'Unknown'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Disabled
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-sm">
                            <span className="text-gray-500">Type: </span>
                            <span className="font-semibold capitalize">{mcp.type || 'stdio'}</span>
                          </div>

                          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono overflow-x-auto whitespace-nowrap">
                            {mcp.command} {mcp.args.join(' ')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          // MCP Table View
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Command</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enabled</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {filteredMCPs.map((mcp) => {
                      const connectionStatus = connectionStatuses[mcp.id];
                      const isConnected = connectionStatus === 'connected';
                      const isConnecting = connectionStatus === 'testing';
                      const isDisconnected = connectionStatus === 'disconnected';
                      
                      return (
                        <motion.tr
                          key={mcp.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                <Server className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{mcp.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {mcp.description || 'No description'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isConnecting ? (
                              <Badge variant="outline" className="text-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Testing...
                              </Badge>
                            ) : !mcp.disabled ? (
                              <Badge 
                                variant="outline" 
                                className={isConnected ? "text-green-600" : isDisconnected ? "text-red-600" : "text-gray-500"}
                              >
                                {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                                {isConnected ? 'Connected' : isDisconnected ? 'Disconnected' : 'Unknown'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {mcp.type || 'stdio'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-500 font-mono truncate max-w-xs">
                              {mcp.command} {mcp.args.join(' ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Switch
                              checked={!mcp.disabled}
                              onCheckedChange={() => handleToggleMCP(mcp)}
                              className="h-4 w-7"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditMCP(mcp)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateMCP(mcp)}>Duplicate</DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleTestConnection(mcp)}
                                  disabled={testingMCP === mcp.id}
                                >
                                  {testingMCP === mcp.id ? 'Testing...' : 'Test Connection'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteMCP(mcp)} className="text-red-600">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <MCPForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mcp={editingMCP}
        onSave={handleSaveMCP}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="text-center text-sm text-gray-600">
            Created for the AI coding community by{' '}
            <a 
              href="https://github.com/0xRaghu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              0xRaghu
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;