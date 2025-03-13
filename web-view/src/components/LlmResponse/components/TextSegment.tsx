import React, { memo, useMemo, useState, useCallback } from 'react';
import { TextSegmentProps } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { LucideChevronDown, LucideLoader } from 'lucide-react';

// Maximum size of each chunk to render
const CHUNK_SIZE = 5000;

// Maximum initial content to show for very large responses
const MAX_INITIAL_CONTENT = 10000;

// Threshold for large content that should be simplified during streaming
const LARGE_STREAMING_THRESHOLD = 3000; // Reduced for VSCode plugin

// Threshold for extremely large content that should be completely hidden during streaming
const EXTREME_STREAMING_THRESHOLD = 10000; // Added for VSCode plugin

// Regex to detect code blocks in markdown - compile once for better performance
const CODE_BLOCK_REGEX = /```([\w-]*)\n([\s\S]*?)```/g;

// Detect if running in VSCode context
const isVSCodeContext = typeof acquireVsCodeApi !== 'undefined';

const TextSegment = memo(({ content, isStreaming }: TextSegmentProps) => {
  const [showFullContent, setShowFullContent] = useState(false);
  
  // Toggle full content visibility
  const toggleFullContent = useCallback(() => {
    setShowFullContent(true);
  }, []);
  
  // Format character count for display
  const formatCharCount = useCallback((count: number) => {
    if (count < 1000) return `${count} chars`;
    return `${(count / 1000).toFixed(1)}K chars`;
  }, []);
  
  // For streaming content, replace code blocks with placeholders to improve performance
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // Skip processing if content is very small or if we're going to skip rendering anyway
    if (content.length < 100) return content;
    
    // In VSCode, use more aggressive thresholds
    const effectiveThreshold = isVSCodeContext ? LARGE_STREAMING_THRESHOLD / 2 : LARGE_STREAMING_THRESHOLD;
    
    if (isStreaming && content.length > effectiveThreshold) return '';
    
    // During streaming, replace code blocks with placeholders to improve performance
    if (isStreaming) {
      // First check if there are any code blocks to avoid unnecessary processing
      if (!content.includes('```')) return content;
      
      // Use a simple string replacement approach for better performance
      try {
        // Replace code blocks with placeholders
        let result = content;
        result = result.replace(CODE_BLOCK_REGEX, (match, language) => {
          // Keep the language information for the placeholder
          return '```' + language + '\n[Code block being generated...]\n```';
        });
        
        return result;
      } catch (e) {
        // If regex fails, return original content
        console.warn('Error processing code blocks:', e);
        return content;
      }
    }
    
    return content;
  }, [content, isStreaming]);
  
  // Split content into manageable chunks if it's large
  const chunks = useMemo(() => {
    if (!processedContent) return [];
    
    // Skip chunking for small content
    if (processedContent.length < CHUNK_SIZE) {
      return [processedContent];
    }
    
    // For very large content, initially show only a portion
    const contentToProcess = (!showFullContent && processedContent.length > MAX_INITIAL_CONTENT && !isStreaming)
      ? processedContent.substring(0, MAX_INITIAL_CONTENT)
      : processedContent;
    
    if (contentToProcess.length <= CHUNK_SIZE) {
      return [contentToProcess];
    }
    
    // Use a simpler chunking approach for better performance
    const chunks: string[] = [];
    for (let i = 0; i < contentToProcess.length; i += CHUNK_SIZE) {
      chunks.push(contentToProcess.substring(i, i + CHUNK_SIZE));
    }
    
    return chunks;
  }, [processedContent, showFullContent, isStreaming]);
  
  // Determine if content is truncated
  const isContentTruncated = useMemo(() => {
    return !showFullContent && content && content.length > MAX_INITIAL_CONTENT && !isStreaming;
  }, [showFullContent, content, isStreaming]);
  
  // Skip rendering entirely for large streaming content
  // Use a more aggressive threshold in VSCode
  const effectiveExtremeThreshold = isVSCodeContext ? EXTREME_STREAMING_THRESHOLD / 2 : EXTREME_STREAMING_THRESHOLD;
  
  if (isStreaming && content) {
    // For extremely large content, show a minimal placeholder
    if (content.length > effectiveExtremeThreshold) {
      return (
        <div className="p-4 border border-primary rounded-lg bg-secondary my-2">
          <div className="flex items-center gap-2 mb-2">
            <LucideLoader size={14} className="animate-spin" />
            <span className="text-tertiary">Processing large content ({formatCharCount(content.length)})...</span>
          </div>
          <div className="text-xs text-tertiary opacity-70">
            Content will be displayed when complete
          </div>
        </div>
      );
    }
    
    // For moderately large content, show a more informative placeholder
    if (content.length > LARGE_STREAMING_THRESHOLD) {
      return (
        <div className="p-4 border border-primary rounded-lg bg-secondary my-2">
          <div className="flex items-center gap-2 mb-2">
            <LucideLoader size={14} className="animate-spin" />
            <span className="text-tertiary">Processing content ({formatCharCount(content.length)})...</span>
          </div>
          <div className="text-xs text-tertiary opacity-70">
            {isVSCodeContext ? 
              "VSCode extension is optimizing performance. Content will be displayed when complete." :
              "Content will be displayed when complete or smaller in size"}
          </div>
        </div>
      );
    }
  }
  
  if (!content || chunks.length === 0) return null;
  
  // For VSCode, limit the number of chunks rendered during streaming
  const chunksToRender = isVSCodeContext && isStreaming ? chunks.slice(0, 1) : chunks;
  
  return (
    <>
      {chunksToRender.map((chunk, index) => (
        <MarkdownRenderer key={`chunk-${index}`} isStreaming={isStreaming}>
          {chunk}
        </MarkdownRenderer>
      ))}
      
      {isContentTruncated && (
        <div className="mt-4 mb-2">
          <button 
            onClick={toggleFullContent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
          >
            <LucideChevronDown size={14} />
            Show more content
          </button>
        </div>
      )}
    </>
  );
});

export default TextSegment; 