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
import { createComponent } from '../util/figma-html';
import { getLlmResponse } from '../services/cloudverseService';
import { LucideSettings, LucideSend, LucideTrash2, LucideX } from 'lucide-react';

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
  const { messages, addMessage, clearMessages, lastKnownFigmaNode, setLastKnownFigmaNode, removeMessage }: ChatStore = useChatStore();
  const vsCodeMessage = useVsCodeMessageStore((state) => state.message);
  const inputTextRef = useRef<HTMLInputElement>();
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [model, setModel] = useState('anthropic-claude-3-7-sonnet');
  const [followupSuggestions, setfollowupSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!vsCodeMessage) return;
    vsCodeMessage.command === 'figmaNodeSelected' && setLastKnownFigmaNode(vsCodeMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsCodeMessage]);

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
          // hiddenPrompt = `HIDDEN:FIGMA NODE : ${createComponent(lastKnownFigmaNode.selectedNode as any, lastKnownFigmaNode.fileImageFillsResponse?.meta?.images)}`;
          hiddenPrompt = `HIDDEN:FIGMA NODE : ${JSON.stringify(lastKnownFigmaNode.selectedNode)}`;
          let userHidePrompt = { sender: Sender.User, text: hiddenPrompt, hidden: true };
          addMessage(userHidePrompt);
          history = [...history, userHidePrompt];
        }
      }

      const botResponse = await getLlmResponse(history, message, model, (stream) => {
        setStreamingText((prev) => prev + stream);
      });

      try {
        let followUpResponse = parseMessage(botResponse).followups || [];
        setfollowupSuggestions(followUpResponse);
      } catch {
        setfollowupSuggestions([]);
      }

      const botMessage = { sender: Sender.Bot, text: botResponse };
      addMessage(botMessage);
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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-2 border-b border-[var(--vscode-panel-border)]">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-sm font-medium text-[var(--vscode-editor-foreground)]">Freshworks Copilot</h1>
              </div>
            </div>
            <div className="relative">
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
            </div>
          </div>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-all"
            onClick={() => { clearMessages(); setLastKnownFigmaNode(null); setfollowupSuggestions([]); }}
            title="Clear chat history"
          >
            <LucideTrash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.filter(c => !c.hidden).length === 0 ? (
            <EmptyState />
          ) : (
            messages.filter(c => !c.hidden || c.presentationonly).map((message, index) => (
              <div
                key={message.key}
                className={`group flex items-start ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                } ${index > 0 ? 'mt-3' : ''}`}
              >
                <div className={`flex items-start gap-3 max-w-[85%] ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user' 
                      ? 'bg-[#1268FB] text-white' 
                      : 'bg-[var(--vscode-activityBarBadge-background)]'
                  }`}>
                    {message.sender === 'user' ? (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[var(--vscode-button-foreground)]">
                        <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                        <path d="M8 9C5.33333 9 0 10.3333 0 13V14C0 15.1046 0.895431 16 2 16H14C15.1046 16 16 15.1046 16 14V13C16 10.3333 10.6667 9 8 9Z" fill="currentColor"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[var(--vscode-activityBarBadge-foreground)]">
                        <path d="M8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 8H11M5 5.5H11M5 10.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Message content */}
                  <div className={`relative group rounded-lg px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-[#1268FB] text-white shadow-sm'
                      : 'bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] shadow-sm'
                  }`}>
                    <button
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
                      onClick={() => handleDeleteMessage(message)}
                    >
                      <LucideX className="w-3 h-3" />
                    </button>
                    {message.isImage ? (
                      <FigmaNodeViewer
                        fileResponse={message.figmaResponse.nodeResponse}
                        fileImageFillsResponse={message.figmaResponse.fileImageFillsResponse}
                        image={message.imgPath}
                      />
                    ) : (
                      <LlmResponse data={message.text} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {loading && (
          <div className="max-w-3xl mx-auto mt-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-[var(--vscode-activityBarBadge-background)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[var(--vscode-activityBarBadge-foreground)]">
                  <path d="M8 1.5C11.5899 1.5 14.5 4.41015 14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 8H11M5 5.5H11M5 10.5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex-1 max-w-[85%] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] rounded-lg px-4 py-3 shadow-sm">
                <LoadingText startTime={1} />
                {streamingText && (
                  <div className="mt-1 text-xs text-[var(--vscode-descriptionForeground)]">
                    {streamingText.length} characters generated
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up suggestions */}
      {followupSuggestions?.length > 0 && (
        <div className="sticky bottom-0 z-10 px-4 py-2 border-t border-[var(--vscode-panel-border)]">
          <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1">
            {followupSuggestions?.map((suggestion, index) => (
              <button
                key={index}
                className="px-3 py-1 bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] text-[var(--vscode-button-secondaryForeground)] rounded text-xs whitespace-nowrap transition-colors"
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-[var(--vscode-panel-border)]">
        <div className="max-w-3xl mx-auto">
          {lastKnownFigmaNode && lastKnownFigmaNode.selectedNode ? (
            <div className="flex items-center gap-2">
              <input
                disabled={true}
                ref={inputTextRef}
                type="text"
                className="flex-1 px-3 py-1.5 rounded bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] text-sm"
                value={'Selected node: ' + lastKnownFigmaNode.selectedNode.name}
              />
              <button
                onClick={() => { sendMessage(`Submitted the node: ${lastKnownFigmaNode.selectedNode.name}`); setLastKnownFigmaNode(null) }}
                className="px-3 py-1.5 bg-[#1268FB] text-white rounded text-sm hover:bg-[#0051D6] transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => setLastKnownFigmaNode(null)}
                className="p-1.5 hover:bg-[var(--vscode-toolbar-hoverBackground)] rounded transition-colors"
              >
                <LucideX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  ref={inputTextRef}
                  className="w-full px-3 py-1.5 rounded bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border border-[var(--vscode-input-border)] text-sm focus:outline-none focus:border-[var(--vscode-focusBorder)] placeholder-[var(--vscode-input-placeholderForeground)]"
                  placeholder="Type a message..."
                  onChange={(e) => inputTextRef.current.value = e.target.value}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage();
                  }}
                />
              </div>
              <button
                className="px-3 py-1.5 bg-[#1268FB] text-white rounded text-sm hover:bg-[#0051D6] transition-colors flex items-center gap-1.5"
                onClick={() => sendMessage()}
              >
                <LucideSend className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
