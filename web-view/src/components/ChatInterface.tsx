import React, { useEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import useChatStore, { ChatStore, getHistory, clearAllStorage } from '../store/chat-message-store';
import { getFigmaResponse } from '../services/figmaApiService';
import { checktextHasFigmaUrl } from '../util/figma';
import FigmaNodeViewer from './FigmaNode';
import LlmResponse from './LlmResponse';
import { Sender, parseMessage } from '../constants';
import EmptyState from './EmptyState';
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import LoadingText from './LoadingText';
import { getLlmResponse } from '../services/cloudverseService';
import { LucideSend, LucideTrash2, LucideX, LucidePlus, LucideMessageSquare, LucideEdit2, LucideSun, LucideMoon, LucideDatabase, LucideSquare, LucideUser, LucideBot, LucideMoreVertical } from 'lucide-react';
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
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const currentChat = chats.find(chat => chat.id === (currentChatId || chats[0].id));
  const messages = currentChat?.messages || [];
  const visibleMessages = messages.filter(msg => !msg.hidden || msg.presentationonly);
  const hasMessages = visibleMessages.length > 0;

  // Make sendMessage available globally for LlmResponse to use
  React.useEffect(() => {
    // Expose the sendMessage function to the window object
    (window as any).sendMessage = sendMessage;
    
    // Clean up when component unmounts
    return () => {
      delete (window as any).sendMessage;
    };
  }, []);

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

  // Add click outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((isSettingsOpen && 
          settingsMenuRef.current && 
          !settingsMenuRef.current.contains(event.target as Node) &&
          !settingsButtonRef.current?.contains(event.target as Node)) ||
          (isChatListOpen && 
          chatListRef.current && 
          !chatListRef.current.contains(event.target as Node) &&
          !chatListButtonRef.current?.contains(event.target as Node))) {
        setIsSettingsOpen(false);
        setIsChatListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, isChatListOpen]);

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

  const handleClearAllStorage = () => {
    if (window.confirm('Are you sure you want to clear all storage? This will remove all chat history and cannot be undone.')) {
      clearAllStorage();
      window.location.reload(); // Reload to refresh the UI state
    }
  };

  const InputArea = () => (
    <div className="px-4 py-2">
      <div>
        {lastKnownFigmaNode && lastKnownFigmaNode.selectedNode ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary bg-secondary text-primary">
              <div className="flex-1 flex items-center gap-2 text-sm">
                <span className="text-secondary">Selected node:</span>
                <span className="font-medium">{lastKnownFigmaNode.selectedNode.name}</span>
              </div>
              <button
                onClick={() => setLastKnownFigmaNode(null)}
                className="p-1 rounded transition-colors hover:bg-tertiary text-secondary hover:text-primary"
                title="Clear selected node"
              >
                <LucideX size={14} />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <textarea
                ref={inputTextRef}
                rows={1}
                className="flex-1 px-3 py-2 rounded text-sm focus:outline-none resize-none min-h-[48px] max-h-[120px] overflow-y-auto bg-secondary text-primary border-primary focus:border-accent placeholder-tertiary"
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
                  loading ? 'bg-tertiary text-primary' : 'accent-blue text-inverted hover:accent-blue-hover'
                }`}
                onClick={() => loading ? handleStopStreaming() : sendMessage()}
              >
                {loading ? (
                  <>
                    <LucideSquare size={16} />
                    Stop
                  </>
                ) : (
                  <>
                    <LucideSend size={16} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <textarea
              ref={inputTextRef}
              rows={1}
              className="flex-1 px-3 py-2 rounded text-sm focus:outline-none resize-none min-h-[48px] max-h-[120px] overflow-y-auto bg-secondary text-primary border border-primary focus:border-accent placeholder-tertiary"
              placeholder="Type your message..."
              onInput={handleTextareaInput}
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
                loading ? 'bg-tertiary text-primary' : 'accent-blue text-inverted hover:accent-blue-hover'
              }`}
              onClick={() => loading ? handleStopStreaming() : sendMessage()}
            >
              {loading ? (
                <>
                  <LucideSquare size={16} />
                  Stop
                </>
              ) : (
                <>
                  <LucideSend size={16} />
                  Send
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen relative bg-primary">
      {/* Header area with explicit background */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-primary border-b border-primary z-10">
        {/* Chat list button */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
          <button
            ref={chatListButtonRef}
            className="flex items-center justify-center w-8 h-8 hover:bg-tertiary text-secondary hover:text-primary rounded-lg transition-all"
            onClick={() => setIsChatListOpen(!isChatListOpen)}
            title="Chat history"
          >
            <LucideMessageSquare size={16} />
          </button>
          <button
            className={`flex items-center justify-center w-8 h-8 hover:bg-tertiary text-secondary hover:text-primary rounded-lg transition-all ${
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

        {/* App Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <h1 className="text-sm font-semibold text-primary">Freshworks Copilot</h1>
        </div>

        {/* Controls in top-right corner */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          <select
            className="appearance-none bg-secondary text-primary border-primary hover:bg-tertiary text-xs px-3 py-1.5 rounded-lg border focus:outline-none focus:border-accent cursor-pointer"
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
          
          {/* Settings dropdown button */}
          <div className="relative">
            <button
              ref={settingsButtonRef}
              className="flex items-center justify-center w-8 h-8 hover:bg-tertiary text-secondary hover:text-primary rounded-lg transition-all"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Settings"
            >
              <LucideMoreVertical size={16} />
            </button>
            
            {/* Settings dropdown menu */}
            {isSettingsOpen && (
              <div 
                ref={settingsMenuRef}
                className="absolute top-full right-0 mt-1 w-48 bg-secondary border-primary border rounded-lg shadow-md overflow-hidden z-50"
              >
                <div className="p-1">
                  <div className="text-xs font-medium px-3 py-2 text-tertiary">Theme</div>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-start hover:bg-tertiary ${theme === 'default' ? 'bg-highlight text-primary' : 'text-secondary'}`}
                    onClick={() => { setTheme('default'); setIsSettingsOpen(false); }}
                  >
                    <LucideSquare size={14} />
                    <span>Default (VS Code)</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-start hover:bg-tertiary ${theme === 'light' ? 'bg-highlight text-primary' : 'text-secondary'}`}
                    onClick={() => { setTheme('light'); setIsSettingsOpen(false); }}
                  >
                    <LucideSun size={14} />
                    <span>Light</span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-start hover:bg-tertiary ${theme === 'dark' ? 'bg-highlight text-primary' : 'text-secondary'}`}
                    onClick={() => { setTheme('dark'); setIsSettingsOpen(false); }}
                  >
                    <LucideMoon size={14} />
                    <span>Dark</span>
                  </button>
                  
                  <div className="my-1 border-t border-primary"></div>
                  
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-start hover:bg-tertiary text-secondary"
                    onClick={() => { clearMessages(); setLastKnownFigmaNode(null); setfollowupSuggestions([]); setIsSettingsOpen(false); }}
                  >
                    <LucideTrash2 size={14} />
                    <span>Clear chat history</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-start hover:bg-tertiary text-secondary"
                    onClick={() => { handleClearAllStorage(); setIsSettingsOpen(false); }}
                  >
                    <LucideDatabase size={14} />
                    <span>Clear all storage data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat list panel */}
      {isChatListOpen && (
        <div 
          ref={chatListRef}
          className="absolute top-12 left-2 z-30 w-64 bg-secondary border-primary border rounded-xl shadow-md overflow-hidden"
        >
          <div className="max-h-96 overflow-y-auto">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-2 ${
                  chat.id === (currentChatId || chats[0].id)
                    ? "bg-tertiary text-primary border-l-accent"
                    : "border-l-transparent hover:border-l-accent text-secondary"
                } cursor-pointer border-l-2 hover:bg-tertiary`}
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
                      className="w-full px-2 py-1 bg-primary text-primary border border-primary rounded text-xs focus:outline-none focus:border-accent"
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
                      <div className="text-xs text-tertiary">
                        {formatDate(chat.lastUpdatedAt)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 hover:bg-tertiary rounded transition-colors text-secondary hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChatId(chat.id);
                    }}
                    title="Rename chat"
                  >
                    <LucideEdit2 size={12} />
                  </button>
                  <button
                    className="p-1 hover:bg-tertiary rounded transition-colors text-secondary hover:text-primary"
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
      <div className={`flex-1 overflow-auto px-6 py-4 bg-primary ${hasMessages ? 'mt-12' : ''}`}>
        {visibleMessages.map((message, index) => (
          <div
            key={message.key}
            className={`relative flex items-start gap-4 ${
              message.sender === Sender.User ? 'flex-row-reverse' : 'flex-row'
            } ${index > 0 ? 'mt-8' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 avatar-icon ${
              message.sender === Sender.User 
                ? 'avatar-user-gradient' 
                : 'avatar-bot-gradient border border-avatar-bot'
            }`}>
              {message.sender === Sender.User ? (
                <LucideUser size={16} />
              ) : (
                <LucideBot size={16} />
              )}
            </div>

            {/* Message content */}
            <div className={`group relative flex-1 max-w-[80%] ${
              message.sender === Sender.User ? 'items-end' : 'items-start'
            }`}>
              <div className={`relative rounded-2xl px-5 pb-3.5 pt-2 ${
                message.sender === Sender.User
                  ? 'user-message-gradient border border-primary'
                  : 'bg-secondary text-primary border border-primary'
              }`}>
                {/* Delete button */}
                <div className={`absolute -top-2 ${message.sender === Sender.User ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <button
                    className={`p-1.5 rounded-full shadow-lg ${
                      message.sender === Sender.User
                        ? 'delete-user-button'
                        : 'delete-bot-button border'
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

      {/* Input area container */}
      {hasMessages && (
        <div className="sticky bottom-0 z-10 border-t border-primary bg-primary">
          <InputArea />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;