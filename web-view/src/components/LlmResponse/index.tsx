import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest, executeAnyCommand, sendCreateFilesRequest } from '../../services/vsCodeService';
import { VsCommands, parseMessage } from '../../constants';
import useChatStore, { Message } from '../../store/chat-message-store';
import { LucidePlus } from 'lucide-react';

// Import components
import FileBlock from './components/FileBlock';
import TextSegment from './components/TextSegment';
import FigmaInspectButton from './components/FigmaInspectButton';
import FollowupSuggestions from './components/FollowupSuggestions';
import FigmaDesignsPanel from './components/FigmaDesignsPanel';
import VirtualizedContent from './components/VirtualizedContent';

// Import hooks
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStreamingContent } from './hooks/useStreamingContent';
import { useTheme } from './hooks/useTheme';

// Import styles
import { proseStyles } from './styles';

// Import types
import { LlmResponseProps } from './types';

// Create a memoized streaming indicator component
const StreamingIndicator = React.memo(() => (
  <div className="mt-2">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
  </div>
));

// Create a memoized button component
const CreateAllFilesButton = React.memo(({ files, onClick }: { files: any[], onClick: () => void }) => (
  <div className="mt-4">
    <button 
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
      title='Create all files in the response to your current workspace.'
      onClick={onClick}
    >
      <LucidePlus size={14} />
      Create all files
    </button>
  </div>
));

const LlmResponse: React.FC<LlmResponseProps> = ({ data, messageKey, isStreaming }) => {
  const { chats, currentChatId, updateMessage } = useChatStore();
  const { theme } = useTheme();
  const currentChat = chats.find(chat => chat.id === (currentChatId || chats[0].id));
  const messages = currentChat?.messages || [];
  const [availableFigmaDesigns, setAvailableFigmaDesigns] = useState<Message[]>([]);
  const [localIsStreaming, setLocalIsStreaming] = useState(isStreaming);
  const [preservedStreamingContent, setPreservedStreamingContent] = useState<{[key: string]: string}>({});

  // Custom hooks
  const { 
    getLocalStorageKey, 
    saveContentToLocalStorage, 
    getContentFromLocalStorage 
  } = useLocalStorage(messageKey);

  // Update local streaming state when prop changes
  useEffect(() => {
    setLocalIsStreaming(isStreaming);
  }, [isStreaming]);

  // Update the message in the store if we're streaming - with increased debounce time
  useEffect(() => {
    if (localIsStreaming && messageKey) {
      // Debounce updates to reduce render frequency
      const timeoutId = setTimeout(() => {
        updateMessage(messageKey, data);
      }, 250); // Increased debounce time from 100ms to 250ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [data, messageKey, localIsStreaming, updateMessage]);

  // Memoize the parsed message to avoid re-parsing on every render
  const message = useMemo(() => parseMessage(data), [data]);
  const { type, message: responseMessage, inspectRequested, files, followups } = message;

  // Get streaming content with debounced updates
  const streamingSegments = useStreamingContent(responseMessage, localIsStreaming);

  // Memoize callback functions to prevent recreation on each render
  const createFile = useCallback(async (file: { fileName: string, content: string, fileType: string }) => {
    try {
      await sendCreateFileRequest(file.fileName, file.content);
    } catch (error) {
      console.error('Error creating file:', error);
    }
  }, []);

  const createAllFiles = useCallback(async () => {
    if (!files || files.length === 0) return;
    
    try {
      await sendCreateFilesRequest(files);
    } catch (error) {
      console.error('Error creating files:', error);
    }
  }, [files]);

  const copyFile = useCallback((file: { fileName: string, content: string, fileType: string }) => {
    sendCopyCliboardRequest(file.content);
  }, []);

  const onInspectFigma = useCallback(() => {
    let figmaDesigns = messages.filter((msg) => msg.hidden && msg.figmaResponse);
    if (figmaDesigns.length > 1) {
      setAvailableFigmaDesigns(figmaDesigns);
    } else if (figmaDesigns.length === 1) {
      openInspector(figmaDesigns[0]);
    }
  }, [messages]);

  const openInspector = useCallback((figmaDesign: Message) => {
    executeAnyCommand(VsCommands.figmaInspect, { 
      fileResponse: figmaDesign.figmaResponse.nodeResponse, 
      image: figmaDesign.imgPath, 
      fileImageFillsResponse: figmaDesign.figmaResponse.fileImageFillsResponse 
    });
  }, []);

  const closeAvailableFigmaDesigns = useCallback(() => {
    setAvailableFigmaDesigns([]);
  }, []);

  // Function to clean up markdown code fence markers that appear during streaming
  const cleanupCodeFenceMarkers = useCallback((content: string): string => {
    // Since we now instruct the LLM not to use backticks in file blocks,
    // this function is just a safeguard in case the instruction is ignored
    return content.replace(/```[\w-]*\n?|```/g, '');
  }, []);

  // Process a message when streaming completes to ensure all file content is preserved
  const processCompletedStreamingMessage = useCallback((rawMessage: string): string => {
    console.log('Processing completed streaming message');
    
    // Find all file blocks in the message
    const fileBlocks: {
      fileName: string,
      content: string,
      startIndex: number,
      endIndex: number
    }[] = [];
    
    // Extract files from the message
    const fileStartRegex = /---@file:start[\s\S]*?fileName="([^"]+)"/g;
    let match;
    let tempMessage = rawMessage;
    
    while ((match = fileStartRegex.exec(tempMessage)) !== null) {
      const fileName = match[1];
      const startIndex = match.index;
      
      // Find the corresponding end marker
      const blockStartStr = tempMessage.substring(startIndex);
      const endMarkerPos = blockStartStr.indexOf('---@file:end');
      
      if (endMarkerPos !== -1) {
        const endIndex = startIndex + endMarkerPos + '---@file:end'.length;
        const fileBlock = tempMessage.substring(startIndex, endIndex);
        
        // Extract content
        const contentMatch = fileBlock.match(/fileName="[^"]+"\s*\n([\s\S]*?)---@file:end/);
        let content = contentMatch ? contentMatch[1].trim() : "";
        
        // Use preserved content if available and better
        if (preservedStreamingContent[fileName] && 
          (content.length === 0 || preservedStreamingContent[fileName].length > content.length)) {
          content = preservedStreamingContent[fileName];
        }
        
        // If still empty, check localStorage
        if (content.length === 0) {
          const localStorageContent = getContentFromLocalStorage(fileName);
          if (localStorageContent) {
            console.log(`Using localStorage content for ${fileName}: ${localStorageContent.length} chars`);
            content = localStorageContent;
          }
        }
        
        // If we have content now, save to localStorage to ensure it's preserved
        if (content.length > 0) {
          saveContentToLocalStorage(fileName, content);
        }
        
        // Add to our collection
        fileBlocks.push({
          fileName,
          content,
          startIndex,
          endIndex
        });
      }
    }
    
    // Build an updated message with the best content for each file
    let updatedMessage = rawMessage;
    
    // Process blocks in reverse order to maintain correct indices
    fileBlocks.sort((a, b) => b.startIndex - a.startIndex).forEach(block => {
      // Extract the beginning part of the file block up to the filename declaration
      const blockHeader = updatedMessage.substring(
        block.startIndex, 
        block.startIndex + updatedMessage.substring(block.startIndex).indexOf('\n') + 1
      );
      
      // Create a new file block with the best content
      const newBlock = `${blockHeader}${block.content}\n---@file:end`;
      
      // Replace the old block with the new one
      const beforeBlock = updatedMessage.substring(0, block.startIndex);
      const afterBlock = updatedMessage.substring(block.endIndex);
      updatedMessage = beforeBlock + newBlock + afterBlock;
    });
    
    return updatedMessage;
  }, [preservedStreamingContent, getContentFromLocalStorage, saveContentToLocalStorage]);

  // Save streaming content when available - with increased debouncing
  useEffect(() => {
    if (localIsStreaming && streamingSegments?.type === 'segments') {
      const fileSegments = streamingSegments.segments?.filter(s => s.type === 'file') || [];
      
      // Only save non-empty content
      if (fileSegments.length > 0) {
        const newContent: {[key: string]: string} = {};
        let hasContent = false;
        
        fileSegments.forEach(segment => {
          if (segment.content && segment.content.length > 0 && segment.content !== "/* Content being streamed... */") {
            newContent[segment.fileName!] = segment.content;
            hasContent = true;
            
            // Also save to localStorage as backup - but debounce this operation
            const fileName = segment.fileName!;
            const content = segment.content;
            
            // Use a debounced save to localStorage to reduce I/O operations
            const timeoutKey = `save_${fileName}`;
            // @ts-ignore - using window for debounce storage
            if (window._saveTimeouts && window._saveTimeouts[timeoutKey]) {
              // @ts-ignore
              clearTimeout(window._saveTimeouts[timeoutKey]);
            }
            
            // @ts-ignore
            if (!window._saveTimeouts) window._saveTimeouts = {};
            // @ts-ignore
            window._saveTimeouts[timeoutKey] = setTimeout(() => {
              saveContentToLocalStorage(fileName, content);
              // @ts-ignore
              delete window._saveTimeouts[timeoutKey];
            }, 1000); // Increased debounce time from 500ms to 1000ms
          }
        });
        
        if (hasContent) {
          // Debounce state updates to reduce re-renders
          const timeoutKey = 'update_preserved_content';
          // @ts-ignore
          if (window._contentUpdateTimeout) {
            // @ts-ignore
            clearTimeout(window._contentUpdateTimeout);
          }
          
          // @ts-ignore
          window._contentUpdateTimeout = setTimeout(() => {
            setPreservedStreamingContent(prev => ({...prev, ...newContent}));
            // @ts-ignore
            window._contentUpdateTimeout = null;
          }, 300);
        }
      }
    }
    
    // Cleanup timeouts on unmount
    return () => {
      // @ts-ignore
      if (window._saveTimeouts) {
        // @ts-ignore
        Object.values(window._saveTimeouts).forEach((timeout: any) => clearTimeout(timeout));
      }
      // @ts-ignore
      if (window._contentUpdateTimeout) {
        // @ts-ignore
        clearTimeout(window._contentUpdateTimeout);
      }
    };
  }, [localIsStreaming, streamingSegments, saveContentToLocalStorage]);

  // Ensure message state is preserved when streaming completes
  useEffect(() => {
    // When streaming completes, ensure we have the latest message content
    if (!isStreaming && localIsStreaming) {
      console.log('Streaming completed, updating UI with final content');
      
      // Log preserved content
      const preservedFileCount = Object.keys(preservedStreamingContent).length;
      if (preservedFileCount > 0) {
        console.log(`Using preserved content for ${preservedFileCount} files:`);
        Object.entries(preservedStreamingContent).forEach(([fileName, content]) => {
          console.log(`- ${fileName}: ${content.length} characters`);
        });
        
        // Update the message in the store with preserved content
        if (messageKey) {
          // Process the message to ensure all file content is preserved
          const updatedMessageData = processCompletedStreamingMessage(data);
          
          // Update the message in the store to ensure persistence
          updateMessage(messageKey, updatedMessageData, false);
          console.log('Updated message in store with preserved content');
        }
      }
      
      // Wait a moment for any final message updates to be processed
      setTimeout(() => {
        setLocalIsStreaming(false);
        
        // Log what files we have to help with debugging
        if (files && files.length > 0) {
          console.log(`Streaming completed with ${files.length} parsed files`);
          files.forEach(file => {
            console.log(`- ${file.fileName}: ${file.content.length} characters`);
          });
        }
      }, 100);  // Small delay to ensure we get the final message
    }
  }, [isStreaming, localIsStreaming, files, preservedStreamingContent, data, messageKey, updateMessage, processCompletedStreamingMessage]);

  // Memoize the file blocks map for completed messages to avoid recreation during streaming
  const fileComponentsMap = useMemo(() => {
    if (!files || files.length === 0) return {};
    
    console.log('Building file components map with', files.length, 'files');
    
    const map: { [key: string]: JSX.Element } = {};
    files.forEach((file) => {
      const fileType = file.fileName.split('.').pop() || "txt";
      
      // Try to use either file content or preserved streaming content, whichever is available
      let actualContent = file.content;
      
      // If the parsed content is empty but we have preserved content from streaming, use that
      if ((!actualContent || actualContent.length === 0) && preservedStreamingContent[file.fileName]) {
        console.log(`Using preserved streaming content for ${file.fileName} (${preservedStreamingContent[file.fileName].length} chars)`);
        actualContent = preservedStreamingContent[file.fileName];
      }
      
      // Add a failsafe to prevent completely empty content
      if (!actualContent || actualContent.length === 0) {
        console.warn(`File ${file.fileName} has no content, trying to extract from raw message`);
        
        // Try to extract content from the raw message as a last resort
        const fileStartMarker = `---@file:start language="${fileType}" fileName="${file.fileName}"`;
        const fileEndMarker = '---@file:end';
        
        if (data.includes(fileStartMarker) && data.includes(fileEndMarker)) {
          const startIndex = data.indexOf(fileStartMarker) + fileStartMarker.length;
          const endIndex = data.indexOf(fileEndMarker, startIndex);
          
          if (startIndex > 0 && endIndex > startIndex) {
            // Extract content between markers and trim whitespace
            const extractedContent = data.substring(startIndex, endIndex).trim();
            
            // Remove the first line if it's empty (newline after marker)
            const lines = extractedContent.split('\n');
            const contentWithoutFirstLine = lines.length > 1 && lines[0].trim() === '' 
              ? lines.slice(1).join('\n') 
              : extractedContent;
            
            actualContent = contentWithoutFirstLine;
            console.log(`Extracted fallback content for ${file.fileName}: ${actualContent.length} chars`);
          }
        }
        
        // If still empty, try localStorage as last resort
        if (!actualContent || actualContent.length === 0) {
          const localStorageContent = getContentFromLocalStorage(file.fileName);
          if (localStorageContent) {
            console.log(`Retrieved content for ${file.fileName} from localStorage: ${localStorageContent.length} chars`);
            actualContent = localStorageContent;
          }
        }
      }
      
      const contentLength = actualContent ? actualContent.length : 0;
      
      // Only create components for files with content
      if (contentLength > 0) {
        console.log(`Creating component for ${file.fileName} with ${contentLength} characters`);
        map[file.fileName] = (
          <FileBlock
            fileName={file.fileName}
            content={actualContent}
            fileType={fileType}
            complete={true}
            copyFile={copyFile}
            createFile={createFile}
          />
        );
      } else {
        console.warn(`File ${file.fileName} has no content, skipping component creation`);
      }
    });
    return map;
  }, [files, preservedStreamingContent, copyFile, createFile, data, getContentFromLocalStorage]);

  // Helper function to process message with complete blocks
  const processMessageWithCompleteBlocks = useCallback((message: string, fileComponentsMap: { [key: string]: JSX.Element }) => {
    // Split the message by file blocks
    const segments = message.split(/(---@file:start[\s\S]*?---@file:end)/g);
    
    // Process each segment
    return (
      <>
        {segments.map((segment, index) => {
          if (segment.startsWith('---@file:start')) {
            // Extract the file name
            const fileNameMatch = segment.match(/fileName="([^"]+)"/);
            if (fileNameMatch && fileNameMatch[1]) {
              const fileName = fileNameMatch[1];
              // Use the pre-rendered file component if available
              if (fileComponentsMap[fileName]) {
                return <React.Fragment key={`file-${index}`}>{fileComponentsMap[fileName]}</React.Fragment>;
              } else {
                // If we don't have this file in our map yet, extract content with the same method used in constants.ts
                const fileType = fileName.split('.').pop() || "txt";
                // Ensure content extraction is consistent with the approach in parseMessage
                const fileContentMatch = segment.match(/fileName="[^"]+"\s*\n([\s\S]*?)---@file:end/);
                const fileContent = fileContentMatch ? fileContentMatch[1].trim() : "";
                
                return (
                  <FileBlock
                    key={`file-${index}`}
                    fileName={fileName}
                    content={fileContent}
                    fileType={fileType}
                    complete={true}
                    copyFile={copyFile}
                    createFile={createFile}
                  />
                );
              }
            }
            return null;
          } else if (segment.trim()) {
            // Split by figma inspect marker and insert button at marker locations
            if (segment.includes('<!-- FIGMA_INSPECT_MARKER -->')) {
              const figmaParts = segment.split('<!-- FIGMA_INSPECT_MARKER -->');
              return (
                <React.Fragment key={`text-${index}`}>
                  {figmaParts.map((part, i) => (
                    <React.Fragment key={`figma-part-${i}`}>
                      {part && <TextSegment content={part} isStreaming={localIsStreaming} />}
                      {i < figmaParts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            }
            // Regular text content
            return <TextSegment key={`text-${index}`} content={segment} isStreaming={localIsStreaming} />;
          }
          return null;
        })}
      </>
    );
  }, [copyFile, createFile, localIsStreaming, onInspectFigma]);

  // Render the streaming segments in a memoized way
  const renderStreamingSegments = useMemo(() => {
    if (!streamingSegments) return null;
    
    if (streamingSegments.type === 'text' && streamingSegments.content) {
      return <TextSegment content={streamingSegments.content} isStreaming={localIsStreaming} />;
    }
    
    if (streamingSegments.type === 'figma-text' && streamingSegments.content) {
      const parts = streamingSegments.content.split('<!-- FIGMA_INSPECT_MARKER -->');
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={`figma-part-${i}`}>
              {part && <TextSegment content={part} isStreaming={localIsStreaming} />}
              {i < parts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
            </React.Fragment>
          ))}
        </>
      );
    }
    
    if (streamingSegments.type === 'segments' && streamingSegments.segments) {
      return (
        <>
          {streamingSegments.segments.map((segment, index) => {
            if (segment.type === 'text') {
              if (segment.content.includes('<!-- FIGMA_INSPECT_MARKER -->')) {
                const parts = segment.content.split('<!-- FIGMA_INSPECT_MARKER -->');
                return (
                  <React.Fragment key={`text-${index}`}>
                    {parts.map((part, i) => (
                      <React.Fragment key={`figma-part-${i}`}>
                        {part && <TextSegment content={part} isStreaming={localIsStreaming} />}
                        {i < parts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              }
              
              return <TextSegment key={`text-${index}`} content={segment.content} isStreaming={localIsStreaming} />;
            }
            
            if (segment.type === 'file' && segment.fileName) {
              const fileType = segment.fileName.split('.').pop() || "txt";
              
              return (
                <FileBlock
                  key={`file-${index}`}
                  fileName={segment.fileName}
                  content={segment.content}
                  fileType={fileType}
                  complete={segment.complete || false}
                  copyFile={copyFile}
                  createFile={createFile}
                />
              );
            }
            
            return null;
          })}
        </>
      );
    }
    
    return null;
  }, [streamingSegments, localIsStreaming, copyFile, createFile, onInspectFigma]);

  // Split message into sections and render files inline
  const renderMessageWithInlineFiles = useCallback(() => {
    // Handle streaming case specially with memoized segments
    if (localIsStreaming) {
      return renderStreamingSegments;
    }

    // Clean up the message
    let cleanedMessage = responseMessage;
    cleanedMessage = cleanedMessage.replace(/---@figma:inspect/g, '<!-- FIGMA_INSPECT_MARKER -->');
    cleanedMessage = cleanedMessage.replace(/---@followups[\s\S]*?$/g, '');
    
    // Check if the message contains file blocks
    const hasFileBlocks = cleanedMessage.includes('---@file:start');
    
    if (hasFileBlocks) {
      // Process all blocks in the completed message
      return processMessageWithCompleteBlocks(cleanedMessage, fileComponentsMap);
    }

    // Handle Figma inspect markers
    if (inspectRequested) {
      const parts = responseMessage.split(/---@figma:inspect/);
      return (
        <>
          {parts.map((part, index) => (
            <React.Fragment key={`figma-part-${index}`}>
              {part && <TextSegment content={part.replace(/---@followups[\s\S]*?$/g, '')} isStreaming={localIsStreaming} />}
              {index < parts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
            </React.Fragment>
          ))}
        </>
      );
    }
    
    // Regular message with no special markers
    return <TextSegment content={responseMessage.replace(/---@followups[\s\S]*?$/g, '')} isStreaming={localIsStreaming} />;
  }, [localIsStreaming, responseMessage, inspectRequested, renderStreamingSegments, fileComponentsMap, processMessageWithCompleteBlocks, onInspectFigma]);

  // Wrap the rendered content in a memo to prevent unnecessary rerenders
  const renderedContent = useMemo(() => renderMessageWithInlineFiles(), [renderMessageWithInlineFiles]);

  return (
    <div className="space-y-2">
      {/* Main message content with inline files */}
      <div className="prose prose-sm max-w-none leading-relaxed text-[13px] relative">
        <style>{proseStyles}</style>
        {/* Use virtualization for non-streaming content to improve performance */}
        {localIsStreaming ? (
          renderedContent
        ) : (
          <VirtualizedContent isVisible={true}>
            {renderedContent}
          </VirtualizedContent>
        )}
        {localIsStreaming && <StreamingIndicator />}
      </div>

      {/* Create all files button - shown only when needed */}
      {type === 'code' && files && files.length > 1 && (
        <CreateAllFilesButton files={files} onClick={createAllFiles} />
      )}

      {/* Follow-up suggestions */}
      {followups && followups.length > 0 && (
        <VirtualizedContent preRenderPixels={500}>
          <FollowupSuggestions followups={followups} />
        </VirtualizedContent>
      )}

      {/* Figma designs panel */}
      {availableFigmaDesigns.length > 0 && (
        <FigmaDesignsPanel 
          designs={availableFigmaDesigns} 
          onSelect={openInspector} 
          onClose={closeAvailableFigmaDesigns} 
        />
      )}
    </div>
  );
};

export default React.memo(LlmResponse); 