import React, { useMemo, useState } from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest, executeAnyCommand, sendCreateFilesRequest } from '../services/vsCodeService';
import { VsCommands, parseMessage, ParsedResponse } from '../constants';
import useChatStore, { Message } from '../store/chat-message-store';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useThemeStore from '../store/theme-store';

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
	const syntaxTheme = theme === 'dark' ? darkTheme : lightTheme;

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
									background: theme === 'dark' ? '#0D0D0D' : '#F9FAFB',
									transition: 'all 0.3s ease',
									padding: '1rem',
									margin: '0.5rem 0',
									fontSize: '0.875rem',
									lineHeight: '1.5',
									borderRadius: '8px',
									border: `1px solid ${theme === 'dark' ? '#27272A' : '#E5E7EB'}`
								} : {
									background: theme === 'dark' ? '#0D0D0D' : '#F9FAFB',
									padding: '1rem',
									margin: '0.5rem 0',
									fontSize: '0.875rem',
									lineHeight: '1.5',
									borderRadius: '8px',
									border: `1px solid ${theme === 'dark' ? '#27272A' : '#E5E7EB'}`
								}}
								showLineNumbers={true}
								lineNumberStyle={{
									minWidth: '2.5em',
									paddingRight: '1em',
									color: theme === 'dark' ? '#4B5563' : '#9CA3AF',
									textAlign: 'right',
									userSelect: 'none'
								}}
							/>
						) : (
							<code {...rest} className={`${className} text-[13px] px-1.5 py-0.5 rounded ${
								theme === 'dark' 
									? 'bg-[#27272A] text-gray-100' 
									: 'bg-gray-100 text-gray-900'
							}`}>
								{children}
							</code>
						);
					}
				}}
			/>
		</>
	);
}

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

	const message = useMemo(() => parseMessage(data), [data]);

	const { type, message: responseMessage, inspectRequested, files, followups } = message;

	const createFile = async (file: ParsedResponse['files'][0]) => {
		try {
			await sendCreateFileRequest(file.fileName, file.content);
		} catch (error) {
			console.error('Error creating file:', error);
		}
	};

	const createAllFiles = async () => {
		if (!files || files.length === 0) return;
		
		try {
			await sendCreateFilesRequest(files);
		} catch (error) {
			console.error('Error creating files:', error);
		}
	};

	const copyFile = (file: ParsedResponse['files'][0]) => {
		sendCopyCliboardRequest(file.content);
	};

	const onInspectFigma = () => {
		let figmaDesigns = messages.filter((msg) => msg.hidden && msg.figmaResponse);
		if (figmaDesigns.length > 1) {
			setAvailableFigmaDesigns(figmaDesigns);
		} else if (figmaDesigns.length === 1) {
			openIspector(figmaDesigns[0]);
		}
	};

	const openIspector = (figmaDesign: Message) => {
		executeAnyCommand(VsCommands.figmaInspect, { 
			fileResponse: figmaDesign.figmaResponse.nodeResponse, 
			image: figmaDesign.imgPath, 
			fileImageFillsResponse: figmaDesign.figmaResponse.fileImageFillsResponse 
		});
	};

	const closeAvailableFigmaDesigns = () => {
		setAvailableFigmaDesigns([]);
	};

	const handleStopStreaming = () => {
		setLocalIsStreaming(false);
		if (messageKey) {
			updateMessage(messageKey, data, false);
		}
	};

	return (
		<div className="space-y-2">
			{/* Main message content */}
			<div className="prose prose-sm max-w-none leading-relaxed text-[13px] relative">
				<style>
					{`
						.prose p {
							margin: 0.5rem 0;
							line-height: 1.5;
							color: ${theme === 'dark' ? 'inherit' : '#111827'};
						}
						.prose ul, .prose ol {
							margin: 0.5rem 0;
							padding-left: 1.25rem;
							color: ${theme === 'dark' ? 'inherit' : '#111827'};
						}
						.prose li {
							margin: 0.25rem 0;
							padding-left: 0.25rem;
						}
						.prose h1, .prose h2, .prose h3, .prose h4 {
							margin: 1rem 0 0.5rem 0;
							line-height: 1.3;
							color: ${theme === 'dark' ? 'inherit' : '#111827'};
							font-weight: 600;
						}
						.prose pre {
							margin: 0.75rem 0;
							background: ${theme === 'dark' ? '#0D0D0D' : '#F9FAFB'};
							border: 1px solid ${theme === 'dark' ? '#27272A' : '#E5E7EB'};
							border-radius: 8px;
							padding: 1rem;
							overflow-x: auto;
						}
						.prose code {
							font-size: 0.875rem;
							padding: 0.2rem 0.4rem;
							border-radius: 4px;
							background: ${theme === 'dark' ? '#27272A' : '#F1F5F9'};
							color: ${theme === 'dark' ? '#E5E7EB' : '#111827'};
							font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
						}
						.prose pre code {
							background: transparent;
							padding: 0;
							color: ${theme === 'dark' ? '#E5E7EB' : '#111827'};
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
				<MarkDownIt isStreaming={localIsStreaming}>{responseMessage}</MarkDownIt>
				{localIsStreaming && (
					<div className="mt-2">
						<div className={`animate-spin rounded-full h-4 w-4 border-2 ${
							theme === 'dark' 
								? 'border-blue-500 border-t-transparent' 
								: 'border-blue-600 border-t-transparent'
						}`} />
					</div>
				)}
			</div>

			{/* Inspect button */}
			{inspectRequested && (
				<button 
					className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs hover:bg-[#1D4ED8] transition-colors" 
					onClick={onInspectFigma}
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
						<path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					Inspect
				</button>
			)}

			{/* Code files section */}
			{type === 'code' && files && files.length > 0 && (
				<div className="space-y-3">
					{files.length > 1 && (
						<button
							className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] text-white rounded-lg text-xs hover:bg-[#4F46E5] transition-colors"
							title='Create all files in the response to your current workspace.'
							onClick={createAllFiles}
						>
							<svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 2V14M14 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							Create all files
						</button>
					)}
					{files.map((file, index) => (
						<div key={index} className="bg-[#18181B] border border-[#27272A] rounded-xl overflow-hidden">
							<div className="p-3 border-b border-[#27272A]">
								<div className="text-xs mb-2 text-gray-300">{file.message || `File: ${file.fileName}`}</div>
								<div className="flex items-center gap-3 text-xs">
									<div className="flex items-center gap-1.5 text-gray-400">
										<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M4 1.5C2.89543 1.5 2 2.39543 2 3.5V12.5C2 13.6046 2.89543 14.5 4 14.5H12C13.1046 14.5 14 13.6046 14 12.5V6.5L9 1.5H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M9 1.5V6.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										{file.fileName}
									</div>
									<div className="flex items-center gap-2 ml-auto">
										<button 
											className="inline-flex items-center gap-1 text-gray-400 hover:text-[#6366F1] transition-colors"
											onClick={() => copyFile(file)}
										>
											<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M6 4.5V3.5C6 2.67157 6.67157 2 7.5 2H12.5C13.3284 2 14 2.67157 14 3.5V8.5C14 9.32843 13.3284 10 12.5 10H11.5M3.5 6H8.5C9.32843 6 10 6.67157 10 7.5V12.5C10 13.3284 9.32843 14 8.5 14H3.5C2.67157 14 2 13.3284 2 12.5V7.5C2 6.67157 2.67157 6 3.5 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											Copy
										</button>
										<button 
											className="inline-flex items-center gap-1 text-gray-400 hover:text-[#6366F1] transition-colors"
											onClick={() => createFile(file)}
										>
											<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M8 3.5V12.5M12.5 8H3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											Create
										</button>
									</div>
								</div>
							</div>
							<div className="p-3 bg-[#0D0D0D]">
								<MarkDownIt isStreaming={localIsStreaming}>{`\`\`\`${file.fileType}\n${file.content}\n\`\`\``}</MarkDownIt>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Follow-up suggestions */}
			{/* {followups && followups.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{followups.map((suggestion, index) => (
						<button
							key={index}
							className="px-3 py-1.5 bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] text-[var(--vscode-button-secondaryForeground)] rounded text-xs whitespace-nowrap transition-colors"
							onClick={() => {
								const textarea = document.querySelector('textarea');
								if (textarea) {
									textarea.value = suggestion;
									textarea.dispatchEvent(new Event('input', { bubbles: true }));
								}
							}}
						>
							{suggestion}
						</button>
					))}
				</div>
			)} */}
		</div>
	);
};

export default LlmResponse;
