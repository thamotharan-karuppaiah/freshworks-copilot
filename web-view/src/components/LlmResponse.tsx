import React, { useMemo, useState } from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest, executeAnyCommand, sendCreateFilesRequest } from '../services/vsCodeService';
import { VsCommands, parseMessage, ParsedResponse } from '../constants';
import useChatStore, { Message } from '../store/chat-message-store';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

function MarkDownIt({ children, isStreaming }: MarkDownItProps) {
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
								// style={dark}
								className={isStreaming ? 'streaming-code-block' : ''}
								customStyle={isStreaming ? { 
									background: 'var(--vscode-editor-background)',
									transition: 'all 0.3s ease'
								} : {}}
								showLineNumbers={true}
							/>
						) : (
							<code {...rest} className={className}>
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
	const currentChat = chats.find(chat => chat.id === (currentChatId || chats[0].id));
	const messages = currentChat?.messages || [];
	let [availableFigmaDesigns, setAvailableFigmaDesigns] = useState<Message[]>([]);

	// Update the message in the store if we're streaming
	React.useEffect(() => {
		if (isStreaming && messageKey) {
			updateMessage(messageKey, data);
		}
	}, [data, messageKey, isStreaming, updateMessage]);

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

	return (
		<div className="space-y-3">
			{/* Main message content */}
			<div className="prose prose-sm max-w-none prose-pre:my-0 prose-p:my-3 prose-headings:my-3 prose-ul:my-3 prose-ol:my-3 whitespace-pre-wrap">
				<MarkDownIt isStreaming={isStreaming}>{responseMessage}</MarkDownIt>
			</div>

			{/* Inspect button */}
			{inspectRequested && (
				<button 
					className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded text-xs hover:bg-[var(--vscode-button-hoverBackground)] transition-colors" 
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
							className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded text-xs hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
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
						<div key={index} className="bg-[var(--vscode-chat-background)] border border-[var(--vscode-panel-border)] rounded overflow-hidden">
							<div className="p-3 border-b border-[var(--vscode-panel-border)]">
								<div className="text-xs mb-2">{file.message || `File: ${file.fileName}`}</div>
								<div className="flex items-center gap-3 text-xs">
									<div className="flex items-center gap-1.5 text-[var(--vscode-descriptionForeground)]">
										<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M4 1.5C2.89543 1.5 2 2.39543 2 3.5V12.5C2 13.6046 2.89543 14.5 4 14.5H12C13.1046 14.5 14 13.6046 14 12.5V6.5L9 1.5H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											<path d="M9 1.5V6.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
										{file.fileName}
									</div>
									<div className="flex items-center gap-2 ml-auto">
										<button 
											className="inline-flex items-center gap-1 hover:text-[var(--vscode-textLink-foreground)] transition-colors"
											onClick={() => copyFile(file)}
										>
											<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M6 4.5V3.5C6 2.67157 6.67157 2 7.5 2H12.5C13.3284 2 14 2.67157 14 3.5V8.5C14 9.32843 13.3284 10 12.5 10H11.5M3.5 6H8.5C9.32843 6 10 6.67157 10 7.5V12.5C10 13.3284 9.32843 14 8.5 14H3.5C2.67157 14 2 13.3284 2 12.5V7.5C2 6.67157 2.67157 6 3.5 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
											</svg>
											Copy
										</button>
										<button 
											className="inline-flex items-center gap-1 hover:text-[var(--vscode-textLink-foreground)] transition-colors"
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
							<div className="p-3 bg-[var(--vscode-editor-background)]">
								<MarkDownIt isStreaming={isStreaming}>{`\`\`\`${file.fileType}\n${file.content}\n\`\`\``}</MarkDownIt>
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
