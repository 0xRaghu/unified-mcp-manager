import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useMCPStore } from '../stores/mcpStore';
import { useToast } from './ui/toast';
import { checkForDuplicates, formatDuplicateReason, generateUniqueName } from '../lib/duplicateDetection';
import type { MCP } from '../types';

interface ParsedMCP {
  name: string;
  config: any;
  mcp: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'>;
  isDuplicate: boolean;
  duplicateReason?: string;
  suggestedName?: string;
  willImport: boolean;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { mcps, addMCP } = useMCPStore();
  const { showToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [parsedMCPs, setParsedMCPs] = useState<ParsedMCP[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (!file || !file.name.endsWith('.json')) {
      showToast({
        title: 'Invalid file type',
        description: 'Please select a JSON file',
        type: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const content = await file.text();
      await parseAndAnalyzeMCPs(content);
    } catch (error) {
      showToast({
        title: 'File reading failed',
        description: error instanceof Error ? error.message : 'Failed to read the file',
        type: 'error',
        duration: 3000
      });
    }
  };

  const parseAndAnalyzeMCPs = async (content: string) => {
    try {
      const data = JSON.parse(content);
      
      if (!data.mcpServers || typeof data.mcpServers !== 'object') {
        throw new Error('Invalid file format. Expected "mcpServers" object');
      }

      const parsed: ParsedMCP[] = [];
      
      Object.entries(data.mcpServers).forEach(([name, config]: [string, any]) => {
        try {
          // Determine type based on config properties
          let type: 'stdio' | 'http' | 'sse' = 'stdio';
          if (config.url) {
            type = config.type === 'sse' ? 'sse' : 'http';
          } else if (config.command) {
            type = 'stdio';
          }

          const mcp: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> = {
            name,
            type: config.type || type,
            category: 'Imported',
            description: `Imported from JSON`,
            tags: ['imported'],
            source: 'import',
            disabled: config.disabled || false,
            // Conditional fields based on type
            ...(type === 'stdio' 
              ? {
                  command: config.command || '',
                  args: config.args || [],
                }
              : {
                  url: config.url || '',
                  headers: config.headers || {},
                }
            ),
            env: config.env || {},
            alwaysAllow: config.alwaysAllow || [],
          };

          // Check for duplicates
          const duplicateCheck = checkForDuplicates(mcp, mcps);
          
          parsed.push({
            name,
            config,
            mcp,
            isDuplicate: duplicateCheck.isDuplicate,
            duplicateReason: duplicateCheck.matches.length > 0 && duplicateCheck.matches[0]
              ? formatDuplicateReason(duplicateCheck.matches[0])
              : undefined,
            suggestedName: duplicateCheck.suggestedName,
            willImport: !duplicateCheck.isDuplicate // Default to import if not duplicate
          });
        } catch (error) {
          console.error(`Failed to parse MCP ${name}:`, error);
        }
      });

      setParsedMCPs(parsed);
      setStep('preview');

      showToast({
        title: 'File parsed successfully',
        description: `Found ${parsed.length} MCPs in the file`,
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      showToast({
        title: 'Parsing failed',
        description: error instanceof Error ? error.message : 'Failed to parse JSON file',
        type: 'error',
        duration: 3000
      });
    }
  };

  const toggleMCPImport = (index: number) => {
    setParsedMCPs(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, willImport: !item.willImport } : item
      )
    );
  };

  const handleImport = async () => {
    const mcpsToImport = parsedMCPs.filter(item => item.willImport);
    
    if (mcpsToImport.length === 0) {
      showToast({
        title: 'No MCPs selected',
        description: 'Please select at least one MCP to import',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    setIsImporting(true);
    
    try {
      let imported = 0;
      for (const item of mcpsToImport) {
        let mcpToAdd = { ...item.mcp };
        
        // Use suggested name if it's a duplicate
        if (item.isDuplicate && item.suggestedName) {
          mcpToAdd.name = item.suggestedName;
        }
        
        await addMCP(mcpToAdd);
        imported++;
      }

      showToast({
        title: 'Import completed',
        description: `Successfully imported ${imported} MCPs`,
        type: 'success',
        duration: 3000
      });
      
      setStep('complete');
      
      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        resetDialog();
      }, 2000);
      
    } catch (error) {
      showToast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import MCPs',
        type: 'error',
        duration: 3000
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setParsedMCPs([]);
    setStep('upload');
    setDragActive(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetDialog();
  };

  const selectedCount = parsedMCPs.filter(item => item.willImport).length;
  const duplicateCount = parsedMCPs.filter(item => item.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import MCPs
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex-1 p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload MCP Configuration File
              </h3>
              <p className="text-gray-600 mb-6">
                Drag and drop a JSON file here, or click to browse
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".json"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload">
                <Button type="button" asChild>
                  <span className="cursor-pointer">Browse Files</span>
                </Button>
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Supports JSON files with "mcpServers" configuration
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <strong>{parsedMCPs.length}</strong> MCPs found
                </div>
                <div className="text-sm text-gray-600">
                  <strong>{selectedCount}</strong> selected for import
                </div>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {duplicateCount} duplicates
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetDialog}>
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting}
                >
                  {isImporting ? 'Importing...' : `Import ${selectedCount} MCPs`}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {parsedMCPs.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={item.willImport}
                          onChange={() => toggleMCPImport(index)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <h4 className="font-medium text-gray-900">
                          {item.isDuplicate && item.suggestedName ? item.suggestedName : item.name}
                        </h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.mcp.type}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {item.mcp.type === 'stdio' 
                          ? `${item.mcp.command} ${item.mcp.args?.join(' ') || ''}`
                          : item.mcp.url
                        }
                      </div>

                      {item.isDuplicate && item.duplicateReason && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-yellow-800">
                            {item.duplicateReason}
                            {item.suggestedName && (
                              <span className="ml-1">
                                → Will be imported as "{item.suggestedName}"
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.isDuplicate && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 ml-2" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import Completed
              </h3>
              <p className="text-gray-600">
                Successfully imported {selectedCount} MCPs
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}