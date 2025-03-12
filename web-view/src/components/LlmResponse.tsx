import React, { useMemo, useState, useCallback, memo } from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest, executeAnyCommand, sendCreateFilesRequest } from '../services/vsCodeService';
import { VsCommands, parseMessage, ParsedResponse } from '../constants';
import useChatStore, { Message } from '../store/chat-message-store';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useThemeStore from '../store/theme-store';
import { LucideCopy, LucidePlus, LucideFileCode, LucideX } from 'lucide-react';

const streamingStyles = `
.streaming-code-block {
	transition: background-color 0.3s ease;
}

.streaming-code-block > code {
	opacity: 0.9;
	transition: opacity 0.3s ease;
}

.streaming-code-block span {
	transition: color 0.2s ease;
}
`;

interface Props {
	data: string;
	messageKey?: string;
	isStreaming?: boolean;
}

interface MarkDownItProps {
	children: string;
	isStreaming?: boolean;
}

// Custom syntax highlighting themes
const darkTheme = {
	...oneDark,
	'code[class*="language-"]': {
		...oneDark['code[class*="language-"]'],
		color: '#E5E7EB',
		background: 'transparent',
	},
	'pre[class*="language-"]': {
		...oneDark['pre[class*="language-"]'],
		background: '#0D0D0D',
	},
	comment: {
		color: '#6B7280',
		fontStyle: 'italic'
	},
	punctuation: {
		color: '#94A3B8'
	},
	property: {
		color: '#93C5FD'
	},
	string: {
		color: '#86EFAC'
	},
	keyword: {
		color: '#C084FC'
	},
	function: {
		color: '#93C5FD'
	},
	'class-name': {
		color: '#FDE047'
	},
	variable: {
		color: '#FDA4AF'
	},
	operator: {
		color: '#94A3B8'
	},
	number: {
		color: '#F87171'
	}
};

const lightTheme = {
	...oneLight,
	'code[class*="language-"]': {
		...oneLight['code[class*="language-"]'],
		color: '#111827',
		background: 'transparent',
	},
	'pre[class*="language-"]': {
		...oneLight['pre[class*="language-"]'],
		background: '#F9FAFB',
	},
	comment: {
		color: '#6B7280',
		fontStyle: 'italic'
	},
	punctuation: {
		color: '#64748B'
	},
	property: {
		color: '#2563EB'
	},
	string: {
		color: '#059669'
	},
	keyword: {
		color: '#7C3AED'
	},
	function: {
		color: '#2563EB'
	},
	'class-name': {
		color: '#CA8A04'
	},
	variable: {
		color: '#DC2626'
	},
	operator: {
		color: '#64748B'
	},
	number: {
		color: '#DC2626'
	}
};

function MarkDownIt({ children, isStreaming }: MarkDownItProps) {
	const { theme } = useThemeStore();
	const syntaxTheme = theme === 'light' ? lightTheme : darkTheme;

	return (
		<>
			<style>{streamingStyles}</style>
			<Markdown
				children={children}
				components={{
					code(props) {
						const { children, className, node, ...rest } = props;
						const match = /language-(\w+)/.exec(className || '');
						return match ? (
							<SyntaxHighlighter
								{...rest}
								PreTag="div"
								children={String(children).replace(/\n$/, '')}
								language={match[1]}
								className={isStreaming ? 'streaming-code-block' : ''}
								style={syntaxTheme}
								customStyle={isStreaming ? { 
									background: 'var(--bg-code)',
									transition: 'all 0.3s ease',
									padding: '1rem',
									margin: '0.5rem 0',
									fontSize: '0.875rem',
									lineHeight: '1.5',
									borderRadius: '8px',
									border: '1px solid var(--border-primary)'
								} : {
									background: 'var(--bg-code)',
									padding: '1rem',
									margin: '0.5rem 0',
									fontSize: '0.875rem',
									lineHeight: '1.5',
									borderRadius: '8px',
									border: '1px solid var(--border-primary)'
								}}
								showLineNumbers={true}
								lineNumberStyle={{
									minWidth: '2.5em',
									paddingRight: '1em',
									color: 'var(--text-tertiary)',
									textAlign: 'right',
									userSelect: 'none'
								}}
							/>
						) : (
							<code {...rest} className={`${className} text-[13px] px-1.5 py-0.5 rounded bg-tertiary text-primary`}>
								{children}
							</code>
						);
					}
				}}
			/>
		</>
	);
}

// Extracted FileBlock component to prevent unnecessary re-renders
const FileBlock = memo(({ 
	fileName, 
	content, 
	fileType, 
	complete, 
	theme, 
	copyFile, 
	createFile 
}: {
	fileName: string;
	content: string;
	fileType: string;
	complete: boolean;
	theme: string;
	copyFile: (file: ParsedResponse['files'][0]) => void;
	createFile: (file: ParsedResponse['files'][0]) => void;
}) => {
	const syntaxTheme = theme === 'light' ? lightTheme : darkTheme;
	
	return (
		<div className="bg-secondary border border-primary rounded-xl overflow-hidden my-3">
			<div className="p-3 border-b border-primary">
				<div className="flex items-center gap-3 text-xs">
					<div className="flex items-center gap-1.5 text-secondary">
						<LucideFileCode size={14} />
						{fileName}
					</div>
					<div className="flex items-center gap-2 ml-auto">
						{complete ? (
							<>
								<button 
									className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
									onClick={() => copyFile({ fileName, content, fileType })}
									title="Copy code to clipboard"
								>
									<LucideCopy size={12} />
									Copy
								</button>
								<button 
									className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs accent-blue text-inverted"
									onClick={() => createFile({ fileName, content, fileType })}
									title="Create file in workspace"
								>
									<LucidePlus size={12} />
									Create
								</button>
							</>
						) : (
							<div className="text-xs text-tertiary">Streaming...</div>
						)}
					</div>
				</div>
			</div>
			<div className="code-content p-0 bg-code">
				<SyntaxHighlighter
					language={fileType}
					style={syntaxTheme}
					customStyle={{
						margin: 0,
						borderRadius: '0',
						background: 'var(--bg-code)',
						padding: '1rem',
						fontSize: '0.875rem',
						lineHeight: '1.5',
						border: 'none'
					}}
					showLineNumbers={true}
					lineNumberStyle={{
						minWidth: '2.5em',
						paddingRight: '1em',
						color: 'var(--text-tertiary)',
						textAlign: 'right',
						userSelect: 'none'
					}}
				>
					{content}
				</SyntaxHighlighter>
			</div>
		</div>
	);
});

// Extracted TextSegment component for text content
const TextSegment = memo(({ 
	content, 
	isStreaming 
}: { 
	content: string; 
	isStreaming: boolean; 
}) => {
	return content ? <MarkDownIt isStreaming={isStreaming}>{content}</MarkDownIt> : null;
});

// Extracted FigmaInspectButton for consistent rendering
const FigmaInspectButton = memo(({ 
	onClick 
}: { 
	onClick: () => void; 
}) => (
	<div className="my-2">
		<button 
			className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs accent-blue hover:accent-blue-hover" 
			onClick={onClick}
		>
			<LucideFileCode size={16} />
			Inspect
		</button>
	</div>
));

const LlmResponse: React.FC<Props> = ({ data, messageKey, isStreaming }) => {
	const { chats, currentChatId, updateMessage } = useChatStore();
	const { theme } = useThemeStore();
	const currentChat = chats.find(chat => chat.id === (currentChatId || chats[0].id));
	const messages = currentChat?.messages || [];
	let [availableFigmaDesigns, setAvailableFigmaDesigns] = useState<Message[]>([]);
	const [localIsStreaming, setLocalIsStreaming] = useState(isStreaming);

	// Update local streaming state when prop changes
	React.useEffect(() => {
		setLocalIsStreaming(isStreaming);
	}, [isStreaming]);

	// Update the message in the store if we're streaming
	React.useEffect(() => {
		if (localIsStreaming && messageKey) {
			updateMessage(messageKey, data);
		}
	}, [data, messageKey, localIsStreaming, updateMessage]);

	// Memoize the parsed message to avoid re-parsing on every render
	const message = useMemo(() => parseMessage(data), [data]);
	const { type, message: responseMessage, inspectRequested, files, followups } = message;

	// Memoize callback functions to prevent recreation on each render
	const createFile = useCallback(async (file: ParsedResponse['files'][0]) => {
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

	const copyFile = useCallback((file: ParsedResponse['files'][0]) => {
		sendCopyCliboardRequest(file.content);
	}, []);

	const onInspectFigma = useCallback(() => {
		let figmaDesigns = messages.filter((msg) => msg.hidden && msg.figmaResponse);
		if (figmaDesigns.length > 1) {
			setAvailableFigmaDesigns(figmaDesigns);
		} else if (figmaDesigns.length === 1) {
			openIspector(figmaDesigns[0]);
		}
	}, [messages]);

	const openIspector = useCallback((figmaDesign: Message) => {
		executeAnyCommand(VsCommands.figmaInspect, { 
			fileResponse: figmaDesign.figmaResponse.nodeResponse, 
			image: figmaDesign.imgPath, 
			fileImageFillsResponse: figmaDesign.figmaResponse.fileImageFillsResponse 
		});
	}, []);

	const closeAvailableFigmaDesigns = useCallback(() => {
		setAvailableFigmaDesigns([]);
	}, []);

	const handleStopStreaming = useCallback(() => {
		setLocalIsStreaming(false);
		if (messageKey) {
			updateMessage(messageKey, data, false);
		}
	}, [messageKey, data, updateMessage]);

	// Function to clean up markdown code fence markers that appear during streaming
	const cleanupCodeFenceMarkers = useCallback((content: string): string => {
		// Since we now instruct the LLM not to use backticks in file blocks,
		// this function is just a safeguard in case the instruction is ignored
		return content.replace(/```[\w-]*\n?|```/g, '');
	}, []);

	// Memoize the streaming message segments to prevent re-processing on each render
	const streamingSegments = useMemo(() => {
		if (!localIsStreaming) return null;
		
		// Debug the raw message during streaming
		console.log("Raw streaming message length:", responseMessage.length);
		console.log("First 100 chars:", responseMessage.substring(0, 100).replace(/\n/g, "\\n"));
		
		// Clean up the message
		let cleanedMessage = responseMessage.replace(/---@figma:inspect/g, '<!-- FIGMA_INSPECT_MARKER -->');
		cleanedMessage = cleanedMessage.replace(/---@followups[\s\S]*?$/g, '');

		// Find all file start positions
		const fileStarts: { index: number, fileName: string, complete: boolean }[] = [];
		const fileStartRegex = /---@file:start[\s\S]*?fileName="([^"]+)"/g;
		let match;
		
		while ((match = fileStartRegex.exec(cleanedMessage)) !== null) {
			const fileName = match[1];
			const blockContent = cleanedMessage.substring(match.index);
			const isComplete = blockContent.includes('---@file:end');
			
			fileStarts.push({
				index: match.index,
				fileName: fileName,
				complete: isComplete
			});
			
			console.log(`Found file block: ${fileName} (complete: ${isComplete})`);
		}
		
		// If no file blocks, return early with simple processing
		if (fileStarts.length === 0) {
			console.log("No file blocks found in streaming message");
			if (cleanedMessage.includes('<!-- FIGMA_INSPECT_MARKER -->')) {
				return { type: 'figma-text', content: cleanedMessage };
			}
			return { type: 'text', content: cleanedMessage };
		}
		
		// If we have file blocks, build segments
		const segments: any[] = [];
		
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
			let fileEndMarkerPos;
			
			if (fileStart.complete) {
				const blockContent = cleanedMessage.substring(fileStart.index);
				fileEndMarkerPos = blockContent.indexOf('---@file:end');
				endIndex = fileStart.index + fileEndMarkerPos + '---@file:end'.length;
			} else {
				endIndex = cleanedMessage.length;
				fileEndMarkerPos = -1;
			}
			
			// Extract file content - using the same extraction method as in parseMessage
			// to ensure consistency between streaming and completed views
			const fileBlockContent = cleanedMessage.substring(fileStart.index, endIndex);
			
			// Debug the file block content
			console.log(`File block content for ${fileStart.fileName} (${fileBlockContent.length} chars):`);
			console.log(fileBlockContent.substring(0, Math.min(100, fileBlockContent.length)).replace(/\n/g, "\\n"));
			
			// The critical part: extract content consistently using the same approach
			// as constants.ts parseMessage function
			let fileContent = "";
			
			// First try to extract content using the standard pattern
			const contentMatch = fileBlockContent.match(/fileName="[^"]+"\s*\n([\s\S]*?)(?:---@file:end|$)/);
			
			if (contentMatch && contentMatch[1]) {
				fileContent = contentMatch[1].trim();
				// Apply cleanup only if needed (should be rare now with updated prompt)
				fileContent = cleanupCodeFenceMarkers(fileContent);
				
				console.log(`Extracted content for ${fileStart.fileName}: ${fileContent.length} chars`);
				console.log(`First 100 chars: ${fileContent.substring(0, Math.min(100, fileContent.length)).replace(/\n/g, "\\n")}`);
			} else {
				// Fallback to a simpler extraction method if the regex doesn't match
				console.warn(`Regex didn't match for ${fileStart.fileName}, trying fallback extraction`);
				
				// Find the first newline after fileName declaration
				const fileNamePos = fileBlockContent.indexOf(`fileName="${fileStart.fileName}"`);
				if (fileNamePos !== -1) {
					const firstNewlinePos = fileBlockContent.indexOf('\n', fileNamePos);
					
					if (firstNewlinePos !== -1) {
						// Take everything after the newline
						let extractedContent;
						
						if (fileEndMarkerPos !== -1) {
							// If we have an end marker, extract up to that
							extractedContent = fileBlockContent.substring(
								firstNewlinePos + 1, 
								fileBlockContent.indexOf('---@file:end')
							);
						} else {
							// If no end marker, take everything after the newline
							extractedContent = fileBlockContent.substring(firstNewlinePos + 1);
						}
						
						fileContent = extractedContent.trim();
						fileContent = cleanupCodeFenceMarkers(fileContent);
						
						console.log(`Fallback extraction for ${fileStart.fileName}: ${fileContent.length} chars`);
						console.log(`First 100 chars: ${fileContent.substring(0, Math.min(100, fileContent.length)).replace(/\n/g, "\\n")}`);
					}
				}
			}
			
			// If we still don't have content, try an even more aggressive approach
			if (!fileContent && fileBlockContent.includes('\n')) {
				console.warn(`Still no content for ${fileStart.fileName}, trying aggressive extraction`);
				
				// Split by newlines and take everything after the first line (which contains fileName)
				const lines = fileBlockContent.split('\n');
				if (lines.length > 1) {
					let extractedContent;
					
					if (fileStart.complete) {
						// If complete, find the line with ---@file:end and exclude it
						const endMarkerLineIndex = lines.findIndex(line => line.includes('---@file:end'));
						if (endMarkerLineIndex > 1) {
							extractedContent = lines.slice(1, endMarkerLineIndex).join('\n');
						}
					} else {
						// If incomplete, take all lines after the first
						extractedContent = lines.slice(1).join('\n');
					}
					
					if (extractedContent) {
						fileContent = extractedContent.trim();
						fileContent = cleanupCodeFenceMarkers(fileContent);
						
						console.log(`Aggressive extraction for ${fileStart.fileName}: ${fileContent.length} chars`);
					}
				}
			}
			
			// Add this file block to segments
			segments.push({
				type: 'file',
				fileName: fileStart.fileName,
				content: fileContent || "/* Content being streamed... */",
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
		
		return { type: 'segments', segments };
	}, [responseMessage, localIsStreaming, cleanupCodeFenceMarkers]);

	// When streaming completes, store the content we've successfully extracted
	// to ensure we don't lose it when isStreaming changes to false
	const [preservedStreamingContent, setPreservedStreamingContent] = useState<{[key: string]: string}>({});

	// Create a key for localStorage
	const getLocalStorageKey = useCallback((fileName: string) => {
		return `fw_copilot_file_${messageKey || 'latest'}_${fileName}`;
	}, [messageKey]);

	// Save content to localStorage
	const saveContentToLocalStorage = useCallback((fileName: string, content: string) => {
		if (!content || content.length === 0) return;
		try {
			localStorage.setItem(getLocalStorageKey(fileName), content);
		} catch (err) {
			console.error('Failed to save file content to localStorage:', err);
		}
	}, [getLocalStorageKey]);

	// Get content from localStorage
	const getContentFromLocalStorage = useCallback((fileName: string) => {
		try {
			return localStorage.getItem(getLocalStorageKey(fileName));
		} catch (err) {
			console.error('Failed to get file content from localStorage:', err);
			return null;
		}
	}, [getLocalStorageKey]);

	// Save streaming content when available
	React.useEffect(() => {
		if (localIsStreaming && streamingSegments?.type === 'segments') {
			const fileSegments = streamingSegments.segments.filter(s => s.type === 'file');
			
			// Only save non-empty content
			if (fileSegments.length > 0) {
				const newContent: {[key: string]: string} = {};
				let hasContent = false;
				
				fileSegments.forEach(segment => {
					if (segment.content && segment.content.length > 0 && segment.content !== "/* Content being streamed... */") {
						newContent[segment.fileName] = segment.content;
						hasContent = true;
						
						// Also save to localStorage as backup
						saveContentToLocalStorage(segment.fileName, segment.content);
					}
				});
				
				if (hasContent) {
					console.log("Saving streaming content for", Object.keys(newContent).length, "files");
					setPreservedStreamingContent(prev => ({...prev, ...newContent}));
				}
			}
		}
	}, [localIsStreaming, streamingSegments, saveContentToLocalStorage]);

	// Process a message when streaming completes to ensure all file content is preserved
	const processCompletedStreamingMessage = useCallback((rawMessage: string) => {
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

	// Ensure message state is preserved when streaming completes
	React.useEffect(() => {
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
			
			const contentLength = actualContent.length;
			
			// Only create components for files with content
			if (contentLength > 0) {
				console.log(`Creating component for ${file.fileName} with ${contentLength} characters`);
				map[file.fileName] = (
					<FileBlock
						fileName={file.fileName}
						content={actualContent}
						fileType={fileType}
						complete={true}
						theme={theme}
						copyFile={copyFile}
						createFile={createFile}
					/>
				);
			} else {
				console.warn(`File ${file.fileName} has no content, skipping component creation`);
			}
		});
		return map;
	}, [files, preservedStreamingContent, theme, copyFile, createFile, data, getContentFromLocalStorage]);

	// Function to render a file block (now using the memo'd component)
	const renderFileBlock = useCallback((file: ParsedResponse['files'][0]) => {
		const fileType = file.fileName.split('.').pop() || "txt";
		return (
			<FileBlock
				fileName={file.fileName}
				content={file.content}
				fileType={fileType}
				complete={true}
				theme={theme}
				copyFile={copyFile}
				createFile={createFile}
			/>
		);
	}, [theme, copyFile, createFile]);

	// Render the streaming segments in a memoized way
	const renderStreamingSegments = useMemo(() => {
		if (!streamingSegments) return null;
		
		if (streamingSegments.type === 'text') {
			return <MarkDownIt isStreaming={localIsStreaming}>{streamingSegments.content}</MarkDownIt>;
		}
		
		if (streamingSegments.type === 'figma-text') {
			const parts = streamingSegments.content.split('<!-- FIGMA_INSPECT_MARKER -->');
			return (
				<>
					{parts.map((part, i) => (
						<React.Fragment key={`figma-part-${i}`}>
							{part && <MarkDownIt isStreaming={localIsStreaming}>{part}</MarkDownIt>}
							{i < parts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
						</React.Fragment>
					))}
				</>
			);
		}
		
		if (streamingSegments.type === 'segments') {
			return (
				<>
					{streamingSegments.segments.map((segment: any, index: number) => {
						if (segment.type === 'text') {
							if (segment.content.includes('<!-- FIGMA_INSPECT_MARKER -->')) {
								const parts = segment.content.split('<!-- FIGMA_INSPECT_MARKER -->');
								return (
									<React.Fragment key={`text-${index}`}>
										{parts.map((part: string, i: number) => (
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
						
						if (segment.type === 'file') {
							const fileType = segment.fileName.split('.').pop() || "txt";
							
							return (
								<FileBlock
									key={`file-${index}`}
									fileName={segment.fileName}
									content={segment.content}
									fileType={fileType}
									complete={segment.complete}
									theme={theme}
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
	}, [streamingSegments, localIsStreaming, theme, copyFile, createFile, onInspectFigma]);

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
										theme={theme}
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
	}, [theme, copyFile, createFile, localIsStreaming, onInspectFigma]);

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
							{part && <MarkDownIt isStreaming={localIsStreaming}>{part.replace(/---@followups[\s\S]*?$/g, '')}</MarkDownIt>}
							{index < parts.length - 1 && <FigmaInspectButton onClick={onInspectFigma} />}
						</React.Fragment>
					))}
				</>
			);
		}
		
		// Regular message with no special markers
		return <MarkDownIt isStreaming={localIsStreaming}>{responseMessage.replace(/---@followups[\s\S]*?$/g, '')}</MarkDownIt>;
	}, [localIsStreaming, responseMessage, inspectRequested, renderStreamingSegments, fileComponentsMap, processMessageWithCompleteBlocks, onInspectFigma]);

	// Wrap the rendered content in a memo to prevent unnecessary rerenders
	const renderedContent = useMemo(() => renderMessageWithInlineFiles(), [renderMessageWithInlineFiles]);

	// Similarly, memoize the followup buttons
	const followupButtons = useMemo(() => {
		if (!followups || followups.length === 0) return null;
		
		return (
			<div className="mt-4">
				<div className="text-xs font-medium text-tertiary mb-2">Follow-up questions</div>
				<div className="flex flex-wrap gap-2">
					{followups.map((suggestion, idx) => (
						<button
							key={idx}
							className="px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
							onClick={() => {
								// Use sendMessage function from the window object
								const sendMessage = (window as any).sendMessage;
								if (typeof sendMessage === 'function') {
									sendMessage(suggestion);
								} else {
									console.log("Cannot send followup, sendMessage function not available");
									// Fallback: copy to clipboard
									navigator.clipboard.writeText(suggestion)
										.then(() => {
											console.log('Suggestion copied to clipboard:', suggestion);
											alert('The message has been copied to clipboard as the send function is not available.');
										})
										.catch(err => {
											console.error('Could not copy suggestion:', err);
										});
								}
							}}
						>
							{suggestion}
						</button>
					))}
				</div>
			</div>
		);
	}, [followups]);

	// Same for Figma designs panel
	const figmaDesignsPanel = useMemo(() => {
		if (availableFigmaDesigns.length === 0) return null;
		
		return (
			<div className="mt-4 p-3 bg-secondary border border-primary rounded-lg">
				<div className="flex items-center justify-between mb-2">
					<div className="text-sm font-medium text-primary">Select a Figma design to inspect</div>
					<button 
						className="p-1 hover:bg-tertiary text-secondary hover:text-primary rounded transition-colors"
						onClick={closeAvailableFigmaDesigns}
					>
						<LucideX size={14} />
					</button>
				</div>
				<div className="flex flex-col gap-2">
					{availableFigmaDesigns.map((design, index) => (
						<button 
							key={index}
							className="px-3 py-2 text-sm text-left bg-tertiary hover:bg-accent hover:text-inverted text-secondary rounded transition-colors"
							onClick={() => {
								openIspector(design);
								closeAvailableFigmaDesigns();
							}}
						>
							Figma Design {index + 1}
						</button>
					))}
				</div>
			</div>
		);
	}, [availableFigmaDesigns, closeAvailableFigmaDesigns, openIspector]);

	// Render the component with memoized sections
	return (
		<div className="space-y-2">
			{/* Main message content with inline files */}
			<div className="prose prose-sm max-w-none leading-relaxed text-[13px] relative">
				<style>
					{`
						.prose p {
							margin: 0.5rem 0;
							line-height: 1.5;
							color: var(--text-primary);
						}
						.prose ul, .prose ol {
							margin: 0.5rem 0;
							padding-left: 1.25rem;
							color: var(--text-primary);
						}
						.prose li {
							margin: 0.25rem 0;
							padding-left: 0.25rem;
						}
						.prose h1, .prose h2, .prose h3, .prose h4 {
							margin: 1rem 0 0.5rem 0;
							line-height: 1.3;
							color: var(--text-primary);
							font-weight: 600;
						}
						.prose pre {
							margin: 0.75rem 0;
							background: var(--bg-code);
							border: 1px solid var(--border-primary);
							border-radius: 8px;
							padding: 1rem;
							overflow-x: auto;
						}
						.prose code {
							font-size: 0.875rem;
							padding: 0.2rem 0.4rem;
							border-radius: 4px;
							background: var(--bg-tertiary);
							color: var(--text-primary);
							font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
						}
						.prose pre code {
							background: transparent;
							padding: 0;
							color: var(--text-primary);
							border: none;
							font-size: 0.875rem;
							line-height: 1.5;
						}
						.prose > *:first-child {
							margin-top: 0;
						}
						.prose > *:last-child {
							margin-bottom: 0;
						}
					`}
				</style>
				{renderedContent}
				{localIsStreaming && (
					<div className="mt-2">
						<div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
					</div>
				)}
			</div>

			{/* Create all files button - shown only when needed */}
			{type === 'code' && files && files.length > 1 && (
				<div className="mt-4">
				<button 
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
							title='Create all files in the response to your current workspace.'
							onClick={createAllFiles}
						>
						<LucidePlus size={14} />
							Create all files
						</button>
				</div>
			)}

			{/* Memoized follow-up suggestions */}
			{followupButtons}

			{/* Memoized Figma designs panel */}
			{figmaDesignsPanel}
		</div>
	);
};

export default React.memo(LlmResponse);
