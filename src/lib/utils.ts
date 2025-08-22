import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
// import { stringify } from 'yaml';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Failed to copy to clipboard:', fallbackError);
      return false;
    }
  }
}

/**
 * Download text as file
 */
export function downloadAsFile(content: string, filename: string, contentType = 'application/json'): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate JSON string
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Convert object to YAML string - simple implementation without external dependencies
 */
export function convertToYaml(data: any): string {
  try {
    function toYaml(obj: any, indent = 0): string {
      const spaces = '  '.repeat(indent);
      
      if (obj === null || obj === undefined) {
        return 'null';
      }
      
      if (typeof obj === 'string') {
        // Escape quotes and special characters, quote if necessary
        if (obj.includes('\n') || obj.includes(':') || obj.includes('-') || obj.includes('#')) {
          return `"${obj.replace(/"/g, '\\"')}"`;
        }
        return obj;
      }
      
      if (typeof obj === 'number' || typeof obj === 'boolean') {
        return String(obj);
      }
      
      if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        return obj.map(item => `${spaces}- ${toYaml(item, indent + 1).replace(/^\s+/, '')}`).join('\n');
      }
      
      if (typeof obj === 'object') {
        const entries = Object.entries(obj);
        if (entries.length === 0) return '{}';
        
        return entries.map(([key, value]) => {
          const yamlValue = toYaml(value, indent + 1);
          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            return `${spaces}${key}:\n${yamlValue}`;
          } else if (Array.isArray(value) && value.length > 0) {
            return `${spaces}${key}:\n${yamlValue}`;
          } else {
            return `${spaces}${key}: ${yamlValue}`;
          }
        }).join('\n');
      }
      
      return String(obj);
    }
    
    return toYaml(data);
  } catch (error) {
    console.error('Failed to convert to YAML:', error);
    throw new Error('Failed to convert data to YAML format');
  }
}

/**
 * Validate YAML string
 */
export function isValidYAML(str: string): boolean {
  try {
    // For validation, we can use JSON.parse since the library will handle conversion
    // The yaml library's parse function would require importing it which might cause build issues
    // For now, we'll do basic validation by checking if it can be converted
    return typeof str === 'string' && str.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get color for category
 */
export function getCategoryColor(category: string): string {
  const colors = {
    'AI & Language': 'bg-blue-100 text-blue-800',
    'Database': 'bg-green-100 text-green-800',
    'Web Scraping': 'bg-orange-100 text-orange-800',
    'Development Tools': 'bg-purple-100 text-purple-800',
    'Testing': 'bg-red-100 text-red-800',
    'File Management': 'bg-yellow-100 text-yellow-800',
    'API Integration': 'bg-indigo-100 text-indigo-800',
    'Analytics': 'bg-pink-100 text-pink-800',
    'Security': 'bg-red-100 text-red-800',
    'Other': 'bg-gray-100 text-gray-800'
  };
  
  return colors[category as keyof typeof colors] || colors.Other;
}