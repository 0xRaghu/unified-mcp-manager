/**
 * Intelligent duplicate detection for MCPs
 * Detects duplicates based on multiple criteria: name, command, args, url
 */

import type { MCP } from '../types';

export interface DuplicateMatch {
  existingMCP: MCP;
  matchReason: 'name' | 'command' | 'url' | 'exact';
  similarity: number; // 0-1 scale
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  suggestedName?: string;
}

/**
 * Check if an MCP is a duplicate of existing MCPs
 */
export function checkForDuplicates(
  newMCP: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'>,
  existingMCPs: MCP[]
): DuplicateCheckResult {
  const matches: DuplicateMatch[] = [];

  for (const existing of existingMCPs) {
    const match = compareRealMCPs(newMCP, existing);
    if (match.similarity > 0.3) { // 30% threshold for considering it a match
      matches.push({
        existingMCP: existing,
        matchReason: match.reason,
        similarity: match.similarity
      });
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  const isDuplicate = matches.length > 0 && matches[0] ? matches[0].similarity > 0.7 : false; // 70% threshold for duplicate
  const suggestedName = isDuplicate ? generateUniqueName(newMCP.name, existingMCPs) : undefined;

  return {
    isDuplicate,
    matches,
    suggestedName
  };
}

/**
 * Compare two MCPs and return similarity score
 */
function compareRealMCPs(mcp1: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'>, mcp2: MCP): {
  similarity: number;
  reason: 'name' | 'command' | 'url' | 'exact';
} {
  // Exact name match
  if (mcp1.name.toLowerCase() === mcp2.name.toLowerCase()) {
    return { similarity: 1.0, reason: 'name' };
  }

  // Command/args comparison for stdio type
  if (mcp1.type === 'stdio' && mcp2.type === 'stdio') {
    if (mcp1.command === mcp2.command) {
      const argsSimilarity = compareArrays(mcp1.args || [], mcp2.args || []);
      if (argsSimilarity > 0.8) {
        return { similarity: 0.9, reason: 'command' };
      }
    }
  }

  // URL comparison for http/sse types
  if ((mcp1.type === 'http' || mcp1.type === 'sse') && 
      (mcp2.type === 'http' || mcp2.type === 'sse')) {
    if (mcp1.url === mcp2.url) {
      return { similarity: 0.9, reason: 'url' };
    }
  }

  // Name similarity (fuzzy matching)
  const nameSimilarity = calculateStringSimilarity(mcp1.name.toLowerCase(), mcp2.name.toLowerCase());
  if (nameSimilarity > 0.7) {
    return { similarity: nameSimilarity * 0.6, reason: 'name' }; // Reduce weight for fuzzy name matches
  }

  return { similarity: 0, reason: 'name' };
}

/**
 * Calculate similarity between two arrays
 */
function compareArrays(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  
  return (maxLength - distance) / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0]![i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j]![0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const currentRow = matrix[j]!;
      const prevRow = matrix[j - 1]!;
      currentRow[i] = Math.min(
        currentRow[i - 1]! + 1, // deletion
        prevRow[i]! + 1, // insertion
        prevRow[i - 1]! + indicator // substitution
      );
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Generate a unique name by appending numbers
 * FIXED: Prevent infinite loops with safety limit and correct comparison
 */
export function generateUniqueName(baseName: string, existingMCPs: MCP[]): string {
  const existingNames = new Set(existingMCPs.map(mcp => mcp.name.toLowerCase()));
  
  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 1;
  let uniqueName: string;
  
  do {
    uniqueName = `${baseName} (${counter})`;
    counter++;
    
    // SAFETY: Prevent infinite loops
    if (counter > 1000) {
      console.warn('generateUniqueName: Hit safety limit, using timestamp');
      return `${baseName} (${Date.now()})`;
    }
  } while (existingNames.has(uniqueName.toLowerCase()));

  return uniqueName;
}

/**
 * Format duplicate match information for display
 */
export function formatDuplicateReason(match: DuplicateMatch): string {
  const similarity = Math.round(match.similarity * 100);
  
  switch (match.matchReason) {
    case 'name':
      return `Same name as "${match.existingMCP.name}" (${similarity}% match)`;
    case 'command':
      return `Same command as "${match.existingMCP.name}" (${similarity}% match)`;
    case 'url':
      return `Same URL as "${match.existingMCP.name}" (${similarity}% match)`;
    case 'exact':
      return `Exact duplicate of "${match.existingMCP.name}"`;
    default:
      return `Similar to "${match.existingMCP.name}" (${similarity}% match)`;
  }
}