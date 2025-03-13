import { useMemo, useRef, useEffect, useCallback } from 'react';
import { StreamingContent, StreamingSegment } from '../types';

// Threshold for significant content change that requires re-processing
const CONTENT_CHANGE_THRESHOLD = 1000; // characters - significantly increased for VSCode plugin

// Maximum content size to process in one go
const MAX_CONTENT_PROCESS_SIZE = 100000; // characters

// Debounce time for processing large content (ms)
const DEBOUNCE_TIME = 800; // increased for VSCode plugin

// Minimum time between processing updates (ms)
const MIN_PROCESS_INTERVAL = 500; // increased for VSCode plugin

// Disable processing for extremely large content
const DISABLE_PROCESSING_THRESHOLD = MAX_CONTENT_PROCESS_SIZE * 3;

export const useStreamingContent = (responseMessage: string, isStreaming: boolean) => {
  // Use refs to track previous state and avoid unnecessary processing
  const prevMessageLengthRef = useRef<number>(0);
  const cachedSegmentsRef = useRef<StreamingContent | null>(null);
  const processingTimerRef = useRef<number | null>(null);
  const fileContentsRef = useRef<{[key: string]: string}>({});
  const lastProcessTimeRef = useRef<number>(0);
  const lastResponseMessageRef = useRef<string>('');
  
  // Store the last response message to handle transition from streaming to completed
  useEffect(() => {
    if (isStreaming && responseMessage) {
      lastResponseMessageRef.current = responseMessage;
    }
  }, [isStreaming, responseMessage]);
  
  // Cleanup function for code fence markers - memoized to avoid recreation
  const cleanupCodeFenceMarkers = useCallback((content: string): string => {
    // Since we now instruct the LLM not to use backticks in file blocks,
    // this function is just a safeguard in case the instruction is ignored
    return content.replace(/```[\w-]*\n?|```/g, '');
  }, []);
  
  // Extract file content - memoized to avoid recreation
  const extractFileContent = useCallback((fileBlockContent: string, fileName: string, isComplete: boolean): string => {
    // Skip processing for very large file blocks during streaming
    if (!isComplete && fileBlockContent.length > MAX_CONTENT_PROCESS_SIZE / 2) {
      return "/* Large file being generated... */";
    }
    
    let fileContent = "";
    
    // First try to extract content using the standard pattern
    const contentMatch = fileBlockContent.match(/fileName="[^"]+"\s*\n([\s\S]*?)(?:---@file:end|$)/);
    
    if (contentMatch && contentMatch[1]) {
      fileContent = contentMatch[1].trim();
      // Apply cleanup only if needed (should be rare now with updated prompt)
      fileContent = cleanupCodeFenceMarkers(fileContent);
      return fileContent;
    }
    
    // Fallback to a simpler extraction method if the regex doesn't match
    // Find the first newline after fileName declaration
    const fileNamePos = fileBlockContent.indexOf(`fileName="${fileName}"`);
    if (fileNamePos !== -1) {
      const firstNewlinePos = fileBlockContent.indexOf('\n', fileNamePos);
      
      if (firstNewlinePos !== -1) {
        // Take everything after the newline
        let extractedContent;
        
        if (isComplete) {
          // If we have an end marker, extract up to that
          const endMarkerPos = fileBlockContent.indexOf('---@file:end', firstNewlinePos);
          if (endMarkerPos !== -1) {
            extractedContent = fileBlockContent.substring(firstNewlinePos + 1, endMarkerPos);
          } else {
            extractedContent = fileBlockContent.substring(firstNewlinePos + 1);
          }
        } else {
          // If no end marker, take everything after the newline
          extractedContent = fileBlockContent.substring(firstNewlinePos + 1);
        }
        
        fileContent = extractedContent.trim();
        fileContent = cleanupCodeFenceMarkers(fileContent);
        return fileContent;
      }
    }
    
    // For incomplete blocks, return a placeholder if we couldn't extract content
    if (!isComplete) {
      return "/* Content being generated... */";
    }
    
    // If we still don't have content, try an even more aggressive approach
    if (fileBlockContent.includes('\n')) {
      // Split by newlines and take everything after the first line (which contains fileName)
      const lines = fileBlockContent.split('\n');
      if (lines.length > 1) {
        let extractedContent;
        
        if (isComplete) {
          // If complete, find the line with ---@file:end and exclude it
          const endMarkerLineIndex = lines.findIndex(line => line.includes('---@file:end'));
          if (endMarkerLineIndex > 1) {
            extractedContent = lines.slice(1, endMarkerLineIndex).join('\n');
          } else {
            extractedContent = lines.slice(1).join('\n');
          }
        } else {
          // If incomplete, take all lines after the first
          extractedContent = lines.slice(1).join('\n');
        }
        
        if (extractedContent) {
          fileContent = extractedContent.trim();
          fileContent = cleanupCodeFenceMarkers(fileContent);
          return fileContent;
        }
      }
    }
    
    return fileContent;
  }, [cleanupCodeFenceMarkers]);
  
  // Memoize the streaming message segments to prevent re-processing on each render
  const streamingSegments = useMemo((): StreamingContent | null => {
    if (!isStreaming) return null;
    
    // For extremely large messages, return a simple placeholder
    if (responseMessage.length > DISABLE_PROCESSING_THRESHOLD) {
      return { 
        type: 'text', 
        content: "Processing very large response... Content will be displayed when complete."
      };
    }
    
    // Throttle processing for large messages to avoid UI freezes
    const now = Date.now();
    if (responseMessage.length > MAX_CONTENT_PROCESS_SIZE) {
      // If we have a cached result and the message hasn't changed much, use the cache
      if (cachedSegmentsRef.current && 
          Math.abs(responseMessage.length - prevMessageLengthRef.current) < CONTENT_CHANGE_THRESHOLD) {
        return cachedSegmentsRef.current;
      }
      
      // Enforce minimum time between processing updates
      if (now - lastProcessTimeRef.current < MIN_PROCESS_INTERVAL) {
        return cachedSegmentsRef.current;
      }
    } else {
      // For smaller messages, use a smaller threshold but still throttle
      if (cachedSegmentsRef.current && 
          Math.abs(responseMessage.length - prevMessageLengthRef.current) < 100 &&
          now - lastProcessTimeRef.current < MIN_PROCESS_INTERVAL / 2) {
        return cachedSegmentsRef.current;
      }
    }
    
    // Update the previous length reference and last process time
    prevMessageLengthRef.current = responseMessage.length;
    lastProcessTimeRef.current = now;
    
    // Skip processing if the message is too large but not large enough for the placeholder
    if (responseMessage.length > MAX_CONTENT_PROCESS_SIZE * 2 && 
        responseMessage.length <= DISABLE_PROCESSING_THRESHOLD) {
      // Use cached result if available, otherwise return a simple text segment
      return cachedSegmentsRef.current || { 
        type: 'text', 
        content: "Processing large response... Updates will be less frequent."
      };
    }
    
    // Clean up the message - use simple string replacement for better performance
    let cleanedMessage = responseMessage;
    if (cleanedMessage.includes('---@figma:inspect')) {
      cleanedMessage = cleanedMessage.replace(/---@figma:inspect/g, '<!-- FIGMA_INSPECT_MARKER -->');
    }
    if (cleanedMessage.includes('---@followups')) {
      cleanedMessage = cleanedMessage.replace(/---@followups[\s\S]*?$/g, '');
    }

    // Find all file start positions
    const fileStarts: { index: number, fileName: string, complete: boolean }[] = [];
    
    // Only process file blocks if they exist
    if (cleanedMessage.includes('---@file:start')) {
      const fileStartRegex = /---@file:start[\s\S]*?fileName="([^"]+)"/g;
      let match;
      let matchCount = 0;
      const maxMatches = 20; // Limit the number of file blocks to process
      
      while ((match = fileStartRegex.exec(cleanedMessage)) !== null && matchCount < maxMatches) {
        const fileName = match[1];
        const blockContent = cleanedMessage.substring(match.index);
        const isComplete = blockContent.includes('---@file:end');
        
        fileStarts.push({
          index: match.index,
          fileName: fileName,
          complete: isComplete
        });
        
        matchCount++;
      }
      
      // If we hit the match limit, this is a very large response with many files
      if (matchCount >= maxMatches) {
        const result: StreamingContent = { 
          type: 'text', 
          content: "Processing response with many files... Content will be displayed when complete."
        };
        cachedSegmentsRef.current = result;
        return result;
      }
    }
    
    // If no file blocks, return early with simple processing
    if (fileStarts.length === 0) {
      const result: StreamingContent = cleanedMessage.includes('<!-- FIGMA_INSPECT_MARKER -->') 
        ? { type: 'figma-text', content: cleanedMessage }
        : { type: 'text', content: cleanedMessage };
        
      cachedSegmentsRef.current = result;
      return result;
    }
    
    // If we have file blocks, build segments
    const segments: StreamingSegment[] = [];
    
    // Add text before the first file block
    if (fileStarts[0].index > 0) {
      segments.push({
        type: 'text',
        content: cleanedMessage.substring(0, fileStarts[0].index)
      });
    }
    
    // Process each file block and the text between them
    fileStarts.forEach((fileStart, i) => {
      // Determine the end of this file block
      let endIndex;
      
      if (fileStart.complete) {
        const blockContent = cleanedMessage.substring(fileStart.index);
        const fileEndMarkerPos = blockContent.indexOf('---@file:end');
        endIndex = fileStart.index + fileEndMarkerPos + '---@file:end'.length;
      } else {
        endIndex = cleanedMessage.length;
      }
      
      // Extract file content
      const fileBlockContent = cleanedMessage.substring(fileStart.index, endIndex);
      
      // Skip processing for very large file blocks
      if (fileBlockContent.length > MAX_CONTENT_PROCESS_SIZE) {
        segments.push({
          type: 'file',
          fileName: fileStart.fileName,
          content: "/* Large file being generated... */",
          complete: fileStart.complete
        });
        
        // Add text between this file block and the next one
        const nextBlockStart = i < fileStarts.length - 1 ? fileStarts[i + 1].index : cleanedMessage.length;
        if (endIndex < nextBlockStart) {
          segments.push({
            type: 'text',
            content: cleanedMessage.substring(endIndex, nextBlockStart)
          });
        }
        
        return; // Skip to next file block
      }
      
      // Extract content even for incomplete blocks so we can show the last 10 lines if requested
      let fileContent = extractFileContent(fileBlockContent, fileStart.fileName, fileStart.complete);
      
      // Store the content in our ref for future use if it's not a placeholder
      if (fileContent && fileContent.length > 0 && !fileContent.includes("being generated")) {
        fileContentsRef.current[fileStart.fileName] = fileContent;
      } else if (fileContentsRef.current[fileStart.fileName]) {
        // Use previously stored content if available
        fileContent = fileContentsRef.current[fileStart.fileName];
      }
      
      // Add this file block to segments
      segments.push({
        type: 'file',
        fileName: fileStart.fileName,
        content: fileContent || "/* Content being generated... */",
        complete: fileStart.complete
      });
      
      // Add text between this file block and the next one
      const nextBlockStart = i < fileStarts.length - 1 ? fileStarts[i + 1].index : cleanedMessage.length;
      if (endIndex < nextBlockStart) {
        segments.push({
          type: 'text',
          content: cleanedMessage.substring(endIndex, nextBlockStart)
        });
      }
    });
    
    const result: StreamingContent = { type: 'segments', segments };
    cachedSegmentsRef.current = result;
    return result;
  }, [responseMessage, isStreaming, extractFileContent]);

  // Use a debounced update for very large content
  useEffect(() => {
    if (isStreaming && responseMessage.length > MAX_CONTENT_PROCESS_SIZE) {
      // Clear any existing timer
      if (processingTimerRef.current !== null) {
        window.clearTimeout(processingTimerRef.current);
      }
      
      // Set a new timer to update the cache after a delay
      // This prevents excessive processing for rapidly changing large content
      processingTimerRef.current = window.setTimeout(() => {
        prevMessageLengthRef.current = responseMessage.length;
        processingTimerRef.current = null;
      }, DEBOUNCE_TIME);
    }
    
    return () => {
      if (processingTimerRef.current !== null) {
        window.clearTimeout(processingTimerRef.current);
      }
    };
  }, [isStreaming, responseMessage]);

  // Reset cache when streaming stops, but preserve file contents
  useEffect(() => {
    if (!isStreaming) {
      // Don't clear fileContentsRef to preserve file content across streaming state changes
      cachedSegmentsRef.current = null;
      prevMessageLengthRef.current = 0;
      lastProcessTimeRef.current = 0;
      
      if (processingTimerRef.current !== null) {
        window.clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      
      // Log preserved file contents for debugging
      const fileCount = Object.keys(fileContentsRef.current).length;
      if (fileCount > 0) {
        console.log(`Preserved ${fileCount} file contents during streaming transition`);
        Object.entries(fileContentsRef.current).forEach(([fileName, content]) => {
          console.log(`- ${fileName}: ${content.length} characters`);
        });
      }
    }
  }, [isStreaming]);

  return streamingSegments;
}; 