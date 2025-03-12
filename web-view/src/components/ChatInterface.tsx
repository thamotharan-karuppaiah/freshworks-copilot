import React, { useEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import useChatStore, { ChatStore, getHistory } from '../store/chat-message-store';
import { getFigmaResponse } from '../services/figmaApiService';
import { checktextHasFigmaUrl } from '../util/figma';
import FigmaNodeViewer from './FigmaNode';
import LlmResponse from './LlmResponse';
import { Sender, parseMessage } from '../constants';
import EmptyState from './EmptyState';
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import LoadingText from './LoadingText';
import { getLlmResponse } from '../services/cloudverseService';
import { LucideSend, LucideTrash2, LucideX, LucidePlus, LucideMessageSquare, LucideEdit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const MODEL_GROUPS = {
  Anthropic: [
    { id: 'anthropic-claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', badge: 'New' },
    { id: 'anthropic-claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'anthropic-claude-3-5-sonnet-v2', name: 'Claude 3.5 Sonnet v2', badge: 'New' }
  ],
  Azure: [
    { id: 'Azure-Deepseek-R1', name: 'Deepseek R1', badge: 'New' },
    { id: 'Azure-o3-mini', name: 'O3 Mini', badge: 'New' },
    { id: 'Azure-01', name: 'Azure 01' },
    { id: 'Azure-01-mini', name: 'Azure 01 Mini' },
    { id: 'Azure-01-preview', name: 'Azure 01 Preview' },
    { id: 'Azure-GPT-4o', name: 'GPT-4' },
    { id: 'Azure-GPT-4o-mini', name: 'GPT-4 Mini' },
    { id: 'Azure-GPT-35-Turbo-0125', name: 'GPT-3.5 Turbo' }
  ],
  Other: [
    { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B' },
    { id: 'Llama-3.1-70B', name: 'Llama 3.1 70B' },
    { id: 'Cloudverse-Web-Search', name: 'Web Search', badge: 'Pro' }
  ]
};

const ChatInterface: React.FC = () => {
  const { 
    chats, 
    currentChatId, 
    addMessage, 
    clearMessages, 
    lastKnownFigmaNode, 
    setLastKnownFigmaNode, 
    removeMessage,
    createNewChat,
    switchChat,
    updateChatTitle,
    deleteChat,
    updateMessage
  }: ChatStore = useChatStore();
  
  const vsCodeMessage = useVsCodeMessageStore((state) => state.message);
  const inputTextRef = useRef<HTMLTextAreaElement>();
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [model, setModel] = useState('anthropic-claude-3-7-sonnet');
  const [followupSuggestions, setfollowupSuggestions] = useState<string[]>([]);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const chatListButtonRef = useRef<HTMLButtonElement>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const currentChat = chats.find(chat => chat.id === (currentChatId || chats[0].id));
  const messages = currentChat?.messages || [];
  const visibleMessages = messages.filter(msg => !msg.hidden || msg.presentationonly);
  const hasMessages = visibleMessages.length > 0;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  useEffect(() => {
    if (!vsCodeMessage) return;
    vsCodeMessage.command === 'figmaNodeSelected' && setLastKnownFigmaNode(vsCodeMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsCodeMessage]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isChatListOpen && 
          chatListRef.current && 
          !chatListRef.current.contains(event.target as Node) &&
          !chatListButtonRef.current?.contains(event.target as Node)) {
        setIsChatListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatListOpen]);

  const processIfPromptIsFigmaURL = async (inputText: string) => {
    let response = await getFigmaResponse(inputText, (message) => addMessage({ sender: Sender.Bot, text: message, presentationonly: true }));
    let { fileInfo, nodeResponse, nodeImages } = response;
    if (nodeResponse) {
      addMessage({
        sender: Sender.Bot, text: '',
        figmaResponse: response,
        imgPath: nodeImages.images?.[fileInfo.nodeID.replace('-', ':')],
        presentationonly: true,
        isImage: true,
        hidden: true
      });
    }
  }

  const sendMessage = async (messageText?: string) => {
    setfollowupSuggestions([]);
    const message = messageText || inputTextRef.current.value;
    if (message.trim() === '') return;

    inputTextRef.current.value = '';
    setLoading(true);
    setStreamingText('');
    try {
      let history = getHistory();
      let userPrompt = { sender: Sender.User, text: message };
      let hiddenPrompt = '';
      addMessage(userPrompt);
      
      if (checktextHasFigmaUrl(message)) {
        await processIfPromptIsFigmaURL(message);
      } else {
        if (lastKnownFigmaNode) {
          hiddenPrompt = `HIDDEN:FIGMA NODE : ${JSON.stringify(lastKnownFigmaNode.selectedNode)}`;
          let userHidePrompt = { sender: Sender.User, text: hiddenPrompt, hidden: true };
          addMessage(userHidePrompt);
          history = [...history, userHidePrompt];
        }
      }

      let accumulatedText = '';
      const messageKey = uuidv4();
      const botMessage = { sender: Sender.Bot, text: '', key: messageKey, isStreaming: true };
      addMessage(botMessage);

      await getLlmResponse(history, message, model, (stream) => {
        accumulatedText += stream;
        setStreamingText(accumulatedText);
        updateMessage(messageKey, accumulatedText, true);
      });

      // Update final message and set streaming to false
      updateMessage(messageKey, accumulatedText, false);

      // Parse the final response for followups
      try {
        let followUpResponse = parseMessage(accumulatedText).followups || [];
        setfollowupSuggestions(followUpResponse);
      } catch {
        setfollowupSuggestions([]);
      }

    } catch (error) {
      const errorMessage = { sender: Sender.Bot, text: error.message ?? 'Error fetching response from the model.', presentationonly: true };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const handleDeleteMessage = (message) => {
    removeMessage(message); // Assuming removeMessage takes the index of the message to remove
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // Increased to 120px (approximately 5 lines)
    textarea.style.height = `${newHeight}px`;
  };

  const InputArea = () => (
    <div className="px-4 py-2 border-b border-[var(--vscode-panel-border)]">
      <div>
        {lastKnownFigmaNode && lastKnownFigmaNode.selectedNode ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)]">
              <div className="flex-1 flex items-center gap-2 text-sm text-[var(--vscode-input-foreground)]">
                <span className="text-[var(--vscode-descriptionForeground)]">Selected node:</span>
                <span className="font-medium">{lastKnownFigmaNode.selectedNode.name}</span>
              </div>
              <button
                onClick={() => setLastKnownFigmaNode(null)}
                className="p-1 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-colors"
                title="Clear selected node"
              >
                <LucideX size={14} />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                ref={inputTextRef}
                rows={1}
                className="flex-1 px-3 py-2 rounded bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] text-sm focus:outline-none focus:border-[var(--vscode-focusBorder)] placeholder-[var(--vscode-input-placeholderForeground)] resize-none min-h-[48px] max-h-[120px] overflow-y-auto"
                placeholder="Type your message about this Figma node..."
                onInput={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const message = inputTextRef.current.value.trim();
                    sendMessage(message ? `${message} (Selected node: ${lastKnownFigmaNode.selectedNode.name})` : `Submitted the node: ${lastKnownFigmaNode.selectedNode.name}`);
                    setLastKnownFigmaNode(null);
                  }
                }}
              />
              <button
                className="px-3 py-2 bg-[#1268FB] text-white rounded text-sm hover:bg-[#0051D6] transition-colors flex items-center gap-1.5"
                onClick={() => sendMessage()}
              >
                <LucideSend size={14} />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <textarea
              ref={inputTextRef}
              rows={1}
              className="flex-1 px-3 py-2 rounded bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] text-sm focus:outline-none focus:border-[var(--vscode-focusBorder)] placeholder-[var(--vscode-input-placeholderForeground)] resize-none min-h-[48px] max-h-[120px] overflow-y-auto"
              placeholder="Type a message..."
              onInput={handleTextareaInput}
              onChange={(e) => inputTextRef.current.value = e.target.value}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              className="px-3 py-2 bg-[#1268FB] text-white rounded text-sm hover:bg-[#0051D6] transition-colors flex items-center gap-1.5 h-[48px]"
              onClick={() => sendMessage()}
            >
              <LucideSend size={14} />
              <span>Send</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen relative">
      {/* Chat list button */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <button
          ref={chatListButtonRef}
          className="flex items-center justify-center w-8 h-8 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-all"
          onClick={() => setIsChatListOpen(!isChatListOpen)}
          title="Chat history"
        >
          <LucideMessageSquare size={16} />
        </button>
        <button
          className={`flex items-center justify-center w-8 h-8 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-all ${
            isCreatingChat ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => {
            if (isCreatingChat) return;
            setIsCreatingChat(true);
            createNewChat();
            setIsChatListOpen(false);
            // Reset the creating state after a short delay
            setTimeout(() => setIsCreatingChat(false), 500);
          }}
          disabled={isCreatingChat}
          title="New chat"
        >
          <LucidePlus size={16} />
        </button>
      </div>

      {/* Chat list panel */}
      {isChatListOpen && (
        <div 
          ref={chatListRef}
          className="absolute top-12 left-2 z-30 w-64 bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-dropdown-border)] rounded-md shadow-lg overflow-hidden"
        >
          <div className="max-h-96 overflow-y-auto">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-2 hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer border-l-2 ${
                  chat.id === (currentChatId || chats[0].id) 
                    ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)] border-l-[var(--vscode-textLink-foreground)]' 
                    : 'border-l-transparent hover:border-l-[var(--vscode-textLink-foreground)] text-[var(--vscode-foreground)]'
                }`}
              >
                <div 
                  className="flex-1 min-w-0"
                  onClick={() => {
                    switchChat(chat.id);
                    setIsChatListOpen(false);
                  }}
                >
                  {editingChatId === chat.id ? (
                    <input
                      type="text"
                      className="w-full px-1 py-0.5 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] rounded text-xs"
                      value={chat.title}
                      onChange={(e) => updateChatTitle(chat.id, e.target.value)}
                      onBlur={() => setEditingChatId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingChatId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div>
                      <div className="text-sm truncate font-medium">{chat.title}</div>
                      <div className="text-xs opacity-60">
                        {formatDate(chat.lastUpdatedAt)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChatId(chat.id);
                    }}
                    title="Rename chat"
                  >
                    <LucideEdit2 size={12} />
                  </button>
                  <button
                    className="p-1 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    title="Delete chat"
                  >
                    <LucideTrash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls in top-right corner */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <select
          className="appearance-none bg-[var(--vscode-dropdown-background)] text-xs px-2 py-1 rounded border border-[var(--vscode-dropdown-border)] text-[var(--vscode-dropdown-foreground)] hover:bg-[var(--vscode-dropdown-listBackground)] focus:outline-none"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {Object.entries(MODEL_GROUPS).map(([groupName, models]) => (
            <optgroup key={groupName} label={groupName}>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.badge && `(${model.badge})`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          className="flex items-center justify-center w-6 h-6 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-all"
          onClick={() => { clearMessages(); setLastKnownFigmaNode(null); setfollowupSuggestions([]); }}
          title="Clear chat history"
        >
          <LucideTrash2 size={14} />
        </button>
      </div>

      {!hasMessages && (
        <>
          <div className="mt-12" /> {/* Increased spacing for better alignment with controls */}
          <div> {/* Added container for consistent width */}
            <InputArea />
            <EmptyState />
          </div>
        </>
      )}

      {/* Chat messages area */}
      <div className={`flex-1 overflow-auto px-4 py-2 ${hasMessages ? 'mt-12' : ''}`}>
        {visibleMessages.map((message, index) => (
          <div
            key={message.key}
            className={`group flex items-start ${
              message.sender === Sender.User ? 'justify-end' : 'justify-start'
            } ${index > 0 ? 'mt-3' : ''}`}
          >
            <div className={`flex items-start gap-3 max-w-[85%] ${
              message.sender === Sender.User ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                message.sender === Sender.User 
                  ? 'bg-[#1268FB] text-white' 
                  : 'bg-[var(--vscode-activityBarBadge-background)]'
              }`}>
                {message.sender === Sender.User ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--vscode-button-foreground)]">
                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                    <path d="M8 9C5.33333 9 0 10.3333 0 13V14C0 15.1046 0.895431 16 2 16H14C15.1046 16 16 15.1046 16 14V13C16 10.3333 10.6667 9 8 9Z" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--vscode-activityBarBadge-foreground)]">
                    <path d="M8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 8H11M5 5.5H11M5 10.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>

              {/* Message content */}
              <div className={`relative group rounded-lg px-4 py-3 max-w-full ${
                message.sender === Sender.User
                  ? 'bg-[#1268FB] text-white shadow-sm'
                  : 'bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] shadow-sm'
              }`}>
                <button
                  className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full ${
                    message.sender === Sender.User
                      ? 'bg-white/90 hover:bg-white text-[#1268FB] hover:text-[#0051D6]'
                      : 'bg-[var(--vscode-editor-background)] hover:bg-[var(--vscode-toolbar-hoverBackground)] text-[var(--vscode-foreground)]'
                  }`}
                  onClick={() => handleDeleteMessage(message)}
                >
                  <LucideX size={14} />
                </button>
                {message.isImage ? (
                  <FigmaNodeViewer
                    fileResponse={message.figmaResponse.nodeResponse}
                    fileImageFillsResponse={message.figmaResponse.fileImageFillsResponse}
                    image={message.imgPath}
                  />
                ) : (
                  <>
                    <LlmResponse 
                      data={message.text} 
                      messageKey={message.key}
                      isStreaming={message.isStreaming}
                    />
                    {message.isStreaming && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--vscode-textLink-foreground)] border-t-transparent" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up suggestions */}
      {followupSuggestions?.length > 0 && (
        <div className="sticky bottom-0 z-10 px-4 py-2 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]"> {/* Added background color and increased padding */}
          <div className="mx-auto flex gap-2 overflow-x-auto pb-1"> {/* Added max-width container */}
            {followupSuggestions?.map((suggestion, index) => (
              <button
                key={index}
                className="px-3 py-1.5 bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] text-[var(--vscode-button-secondaryForeground)] rounded text-xs whitespace-nowrap transition-colors"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area at bottom when there are messages */}
      {hasMessages && (
        <div className="sticky bottom-0 z-10 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]"> {/* Added background color */}
          <InputArea />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
