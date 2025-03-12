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
import { LucideSend, LucideTrash2, LucideX, LucidePlus, LucideMessageSquare, LucideEdit2, LucideSun, LucideMoon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import useThemeStore from '../store/theme-store';

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
  const [currentMessageKey, setCurrentMessageKey] = useState<string | null>(null);
  const { theme, toggleTheme } = useThemeStore();

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

  const handleStopStreaming = () => {
    setLoading(false);
    if (currentMessageKey) {
      updateMessage(currentMessageKey, streamingText, false);
    }
  };

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
      setCurrentMessageKey(messageKey);
      const botMessage = { sender: Sender.Bot, text: '', key: messageKey, isStreaming: true };
      addMessage(botMessage);

      await getLlmResponse(history, message, model, (stream) => {
        accumulatedText += stream;
        setStreamingText(accumulatedText);
        updateMessage(messageKey, accumulatedText, true);
      });

      // Update final message and set streaming to false
      updateMessage(messageKey, accumulatedText, false);
      setCurrentMessageKey(null);

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
      setCurrentMessageKey(null);
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

  // Add theme-based color utility
  const getThemeColor = (darkColor: string, lightColor: string) => {
    return theme === 'dark' ? darkColor : lightColor;
  };

  const InputArea = () => (
    <div className="px-4 py-2">
      <div>
        {lastKnownFigmaNode && lastKnownFigmaNode.selectedNode ? (
          <div className="flex flex-col gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
              theme === 'dark'
                ? 'bg-[#18181B] text-gray-100 border-[#27272A]'
                : 'bg-gray-50 text-gray-900 border-gray-200'
            }`}>
              <div className="flex-1 flex items-center gap-2 text-sm">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Selected node:</span>
                <span className="font-medium">{lastKnownFigmaNode.selectedNode.name}</span>
              </div>
              <button
                onClick={() => setLastKnownFigmaNode(null)}
                className={`p-1 rounded transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-[#27272A] text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title="Clear selected node"
              >
                <LucideX size={14} />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                ref={inputTextRef}
                rows={1}
                className={`flex-1 px-3 py-2 rounded text-sm focus:outline-none resize-none min-h-[48px] max-h-[120px] overflow-y-auto ${
                  theme === 'dark'
                    ? 'bg-[#18181B] text-gray-100 border-[#27272A] focus:border-[#4F46E5] placeholder-gray-500'
                    : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-[#6366F1] placeholder-gray-400'
                }`}
                placeholder="Type your message about this Figma node..."
                onInput={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (loading) {
                      handleStopStreaming();
                    } else {
                      const message = inputTextRef.current.value.trim();
                      sendMessage(message ? `${message} (Selected node: ${lastKnownFigmaNode.selectedNode.name})` : `Submitted the node: ${lastKnownFigmaNode.selectedNode.name}`);
                      setLastKnownFigmaNode(null);
                    }
                  }
                }}
              />
              <button
                className={`px-3 py-2 rounded text-sm transition-colors flex items-center gap-1.5 h-[48px] ${
                  loading ? 'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]' : 'bg-[#1268FB] text-white hover:bg-[#0051D6]'
                }`}
                onClick={() => loading ? handleStopStreaming() : sendMessage()}
              >
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/>
                    </svg>
                    <span>Stop generating</span>
                  </>
                ) : (
                  <>
                    <LucideSend size={14} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <textarea
              ref={inputTextRef}
              rows={1}
              className={`flex-1 px-3 py-2 rounded text-sm focus:outline-none resize-none min-h-[48px] max-h-[120px] overflow-y-auto ${
                theme === 'dark'
                  ? 'bg-[#18181B] text-gray-100 border-[#27272A] focus:border-[#4F46E5] placeholder-gray-500'
                  : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-[#6366F1] placeholder-gray-400'
              }`}
              placeholder="Type your message..."
              onInput={handleTextareaInput}
              onChange={(e) => inputTextRef.current.value = e.target.value}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (loading) {
                    handleStopStreaming();
                  } else {
                    sendMessage();
                  }
                }
              }}
            />
            <button
              className={`px-3 py-2 rounded text-sm transition-colors flex items-center gap-1.5 h-[48px] ${
                loading ? 'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]' : 'bg-[#1268FB] text-white hover:bg-[#0051D6]'
              }`}
              onClick={() => loading ? handleStopStreaming() : sendMessage()}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor"/>
                  </svg>
                  <span>Stop generating</span>
                </>
              ) : (
                <>
                  <LucideSend size={14} />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen relative ${
      theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white'
    }`}>
      {/* Header area with explicit background */}
      <div className={`absolute top-0 left-0 right-0 h-12 ${
        theme === 'dark' 
          ? 'bg-[#0A0A0A] border-[#27272A]' 
          : 'bg-white border-gray-200'
      } border-b z-10`}>
        {/* Chat list button */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
          <button
            ref={chatListButtonRef}
            className={`flex items-center justify-center w-8 h-8 ${
              theme === 'dark'
                ? 'hover:bg-[#27272A] text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-all`}
            onClick={() => setIsChatListOpen(!isChatListOpen)}
            title="Chat history"
          >
            <LucideMessageSquare size={16} />
          </button>
          <button
            className={`flex items-center justify-center w-8 h-8 ${
              theme === 'dark'
                ? 'hover:bg-[#27272A] text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-all ${
              isCreatingChat ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              if (isCreatingChat) return;
              setIsCreatingChat(true);
              createNewChat();
              setIsChatListOpen(false);
              setTimeout(() => setIsCreatingChat(false), 500);
            }}
            disabled={isCreatingChat}
            title="New chat"
          >
            <LucidePlus size={16} />
          </button>
        </div>

        {/* Theme switcher */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            className={`flex items-center justify-center w-8 h-8 ${
              theme === 'dark'
                ? 'hover:bg-[#27272A] text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-all`}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <LucideSun size={16} /> : <LucideMoon size={16} />}
          </button>
        </div>

        {/* Controls in top-right corner */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          <select
            className={`appearance-none ${
              theme === 'dark'
                ? 'bg-[#18181B] text-gray-200 border-[#27272A] hover:bg-[#27272A]'
                : 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100'
            } text-xs px-3 py-1.5 rounded-lg border focus:outline-none focus:border-[#6366F1] cursor-pointer`}
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
            className={`flex items-center justify-center w-8 h-8 ${
              theme === 'dark'
                ? 'hover:bg-[#27272A] text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            } rounded-lg transition-all`}
            onClick={() => { clearMessages(); setLastKnownFigmaNode(null); setfollowupSuggestions([]); }}
            title="Clear chat history"
          >
            <LucideTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Chat list panel */}
      {isChatListOpen && (
        <div 
          ref={chatListRef}
          className={`absolute top-12 left-2 z-30 w-64 ${
            theme === 'dark'
              ? 'bg-[#18181B] border-[#27272A]'
              : 'bg-white border-gray-200'
          } border rounded-xl shadow-lg overflow-hidden`}
        >
          <div className="max-h-96 overflow-y-auto">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-2 ${
                  chat.id === (currentChatId || chats[0].id)
                    ? theme === 'dark'
                      ? 'bg-[#27272A] text-gray-100 border-l-[#6366F1]'
                      : 'bg-gray-100 text-gray-900 border-l-[#6366F1]'
                    : theme === 'dark'
                      ? 'border-l-transparent hover:border-l-[#6366F1] text-gray-300'
                      : 'border-l-transparent hover:border-l-[#6366F1] text-gray-600'
                } cursor-pointer border-l-2 hover:bg-${theme === 'dark' ? '[#27272A]' : 'gray-100'}`}
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
                      className="w-full px-2 py-1 bg-[#0D0D0D] text-gray-100 border border-[#27272A] rounded text-xs focus:outline-none focus:border-[#6366F1]"
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
                      <div className="text-xs text-gray-500">
                        {formatDate(chat.lastUpdatedAt)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 hover:bg-[#3F3F46] rounded transition-colors text-gray-400 hover:text-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChatId(chat.id);
                    }}
                    title="Rename chat"
                  >
                    <LucideEdit2 size={12} />
                  </button>
                  <button
                    className="p-1 hover:bg-[#3F3F46] rounded transition-colors text-gray-400 hover:text-gray-200"
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

      {!hasMessages && (
        <>
          <div className="mt-12" />
          <div>
            <InputArea />
            <EmptyState />
          </div>
        </>
      )}

      {/* Chat messages area */}
      <div className={`flex-1 overflow-auto px-6 py-4 ${hasMessages ? 'mt-12' : ''} ${
        theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white'
      }`}>
        {visibleMessages.map((message, index) => (
          <div
            key={message.key}
            className={`relative flex items-start gap-4 ${
              message.sender === Sender.User ? 'flex-row-reverse' : 'flex-row'
            } ${index > 0 ? 'mt-8' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              message.sender === Sender.User 
                ? 'bg-gradient-to-br from-[#6366F1] to-[#4F46E5]' 
                : 'bg-gradient-to-br from-[#18181B] to-[#27272A] border border-[#27272A]'
            }`}>
              {message.sender === Sender.User ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                  <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                  <path d="M8 9C5.33333 9 0 10.3333 0 13V14C0 15.1046 0.895431 16 2 16H14C15.1046 16 16 15.1046 16 14V13C16 10.3333 10.6667 9 8 9Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                  <path d="M8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 8H11M5 5.5H11M5 10.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>

            {/* Message content */}
            <div className={`group relative flex-1 max-w-[80%] ${
              message.sender === Sender.User ? 'items-end' : 'items-start'
            }`}>
              <div className={`relative rounded-2xl px-5 pb-3.5 pt-2 ${
                message.sender === Sender.User
                  ? 'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white'
                  : theme === 'dark'
                    ? 'bg-[#18181B] text-gray-100 border border-[#27272A]'
                    : 'bg-gray-50 text-gray-900 border border-gray-200'
              }`}>
                {/* Delete button */}
                <div className={`absolute -top-2 ${message.sender === Sender.User ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <button
                    className={`p-1.5 rounded-full shadow-lg ${
                      message.sender === Sender.User
                        ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                        : 'bg-[#27272A] text-white hover:bg-[#3F3F46] border border-[#3F3F46]'
                    }`}
                    onClick={() => handleDeleteMessage(message)}
                  >
                    <LucideX size={12} />
                  </button>
                </div>

                {/* Message content */}
                {message.isImage ? (
                  <FigmaNodeViewer
                    fileResponse={message.figmaResponse.nodeResponse}
                    fileImageFillsResponse={message.figmaResponse.fileImageFillsResponse}
                    image={message.imgPath}
                  />
                ) : (
                  <div className="min-w-0">
                    <LlmResponse 
                      data={message.text} 
                      messageKey={message.key}
                      isStreaming={message.isStreaming}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up suggestions */}
      {followupSuggestions?.length > 0 && (
        <div className={`sticky bottom-0 z-10 px-4 py-2 border-t ${
          theme === 'dark' 
            ? 'border-[#27272A] bg-[#0A0A0A]' 
            : 'border-gray-200 bg-white'
        }`}>
          <div className="mx-auto flex gap-2 overflow-x-auto pb-1">
            {followupSuggestions?.map((suggestion, index) => (
              <button
                key={index}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#27272A] text-gray-200 hover:bg-[#3F3F46]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area container */}
      {hasMessages && (
        <div className={`sticky bottom-0 z-10 border-t ${
          theme === 'dark' 
            ? 'border-[#27272A] bg-[#0A0A0A]' 
            : 'border-gray-200 bg-white'
        }`}>
          <InputArea />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
