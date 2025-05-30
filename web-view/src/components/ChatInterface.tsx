import React, { useEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';
import useChatStore, { ChatStore, getHistory } from '../store/chat-message-store';
import { getChatGptResponse } from '../services/chatgptService';
import { getGeminiResponse } from '../services/geminiService';
import { getCopilotResponse } from '../services/githubCopilot';
import { getFigmaResponse } from '../services/figmaApiService';
import { getCohereAiResponse } from '../services/coherAiService';
import { checktextHasFigmaUrl, extractFileNodeId } from '../util/figma';
import FigmaNodeViewer from './FigmaNode';
import LlmResponse from './LlmResponse';
import { Sender, parseMessage } from '../constants';
import { getDeepAiResponse } from '../services/deepAiService';
import EmptyState from './EmptyState';
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import LoadingText from './LoadingText';
import { createComponent } from '../util/figma-html';
import { getClaudeResponse } from '../services/claudeService';

const ChatInterface: React.FC = () => {
  const { messages, addMessage, clearMessages, lastKnownFigmaNode, setLastKnownFigmaNode, removeMessage }: ChatStore = useChatStore(); // Added removeMessage
  const vsCodeMessage = useVsCodeMessageStore((state) => state.message);
  const inputTextRef = useRef<HTMLInputElement>();
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [model, setModel] = useState('gemini');
  const [followupSuggestions, setfollowupSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!vsCodeMessage) return;
    vsCodeMessage.command === 'figmaNodeSelected' && setLastKnownFigmaNode(vsCodeMessage);
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
      }
      else {
        if (lastKnownFigmaNode) {
          hiddenPrompt = `HIDDEN:FIGMA NODE : ${createComponent(lastKnownFigmaNode.selectedNode as any, lastKnownFigmaNode.fileImageFillsResponse?.meta?.images)}`;
          let userHidePrompt = { sender: Sender.User, text: hiddenPrompt, hidden: true };
          addMessage(userHidePrompt);
          history = [...history, userHidePrompt];
        }
      }

      let botResponse = '';
      switch (model) {
        case 'chatgpt':
          botResponse = await getChatGptResponse(history, message);
          break;
        case 'gemini':
          botResponse = await getGeminiResponse(history, message, (stream) => {
            setStreamingText((prev) => prev + stream);
          });
          break;
        case 'copilot':
          botResponse = await getCopilotResponse(history, message);
          break;
        case 'cohereai':
          botResponse = await getCohereAiResponse(history, message, (stream) => {
            setStreamingText((prev) => prev + stream);
          });
          break;
        case 'claude':
          botResponse = await getClaudeResponse(history, message, (stream) => {
            setStreamingText((prev) => prev + stream);
          });
          break;
        case 'deepai':
          botResponse = await getDeepAiResponse(history, message);
          break;
        default:
          botResponse = 'Invalid model selected';
      }

      try {
        let followUpResponse = parseMessage(botResponse).followups || [];
        setfollowupSuggestions(followUpResponse)
      }
      catch {
        setfollowupSuggestions([]) // do nothing
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
      <div className="flex justify-between p-4 bg-gray-800 text-white items-center">
        <div className="flex items-center space-x-2">
          <span>Freshworks Copilot</span>
        </div>
        <div className="flex items-center space-x-2">
          <select
            className="bg-gray-700 p-2 rounded"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gemini">Gemini</option>
            <option value="copilot">Copilot</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="cohereai">CohereAi</option>
            <option style={({ display: 'none' })} value="claude">Claude</option>
            <option value="deepai">DeepAi</option>
          </select>
          <button
            className="bg-red-500 p-2 rounded"
            onClick={() => { clearMessages(); setLastKnownFigmaNode(null); setfollowupSuggestions([]); }}
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse overflow-auto flex-1 p-4">
        {loading && (
          <div className="self-start bg-gray-300 text-gray-800 p-2 rounded-lg m-2 animate-pulse">
            <LoadingText startTime={1}></LoadingText> {streamingText && ` (Received: ${streamingText.length} characters)`}
          </div>
        )}
        <div className="flex flex-col">
          {messages.filter(c => !c.hidden).length === 0 ? (
            <EmptyState />
          ) : (
            messages.filter(c => !c.hidden || c.presentationonly).map((message, index) => (
              <div
                key={message.key}
                className={`chat-message relative max-w-full p-2 rounded-lg m-2 flex flex-col justify-between transform transition-all duration-500 ${message.sender === 'user'
                  ? 'bg-blue-500 text-white self-end fadeIn'
                  : 'bg-gray-300 text-gray-800 self-start fadeIn'
                  }`}
              >
                <div className='delete-chat-container'>
                  <a
                    className="delete-chat cursor-pointer"
                    onClick={() => handleDeleteMessage(message)}
                  >
                    &#x2715;
                  </a>
                </div>
                {message.isImage ?
                  <FigmaNodeViewer fileResponse={message.figmaResponse.nodeResponse} fileImageFillsResponse={message.figmaResponse.fileImageFillsResponse} image={message.imgPath}></FigmaNodeViewer>
                  :
                  <LlmResponse data={message.text}></LlmResponse>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Follow-up suggestions section */}
      <div className={`p-4 text-xs bg-gray-800 flex flex-nowrap slide-up overflow-x-auto ${followupSuggestions?.length > 0 ? '' : `hidden`}`}>
        {followupSuggestions?.map((suggestion, index) => (
          <button
            key={index}
            className="m-1 p-2 bg-blue-500 text-white rounded-lg whitespace-nowrap"
            onClick={() => sendMessage(suggestion)}
          >
            {suggestion + ''}
          </button>
        ))}
      </div>
      {lastKnownFigmaNode && lastKnownFigmaNode.selectedNode
        ? (
          <div className="p-4 bg-gray-800 flex items-center">
            <input
              disabled={true}
              ref={inputTextRef}
              type="text"
              className="flex-1 p-2 rounded-lg bg-[#f5deb3] text-black"
              value={'You selected the node : ' + lastKnownFigmaNode.selectedNode.name}
            />
            <button onClick={() => { sendMessage(`Submitted the node: ${lastKnownFigmaNode.selectedNode.name}`); setLastKnownFigmaNode(null) }} className="ml-2 p-2 bg-blue-500 text-white rounded-lg flex items-center justify-center">Submit</button>
            <button onClick={() => setLastKnownFigmaNode(null)} className="ml-2 p-2 bg-gray-500 text-white rounded-lg flex items-center justify-center">Close</button>
          </div>
        ) : (
          <div className="p-4 bg-gray-800 flex items-center">
            <input
              type="text"
              ref={inputTextRef}
              className="flex-1 p-2 rounded-lg text-black"
              placeholder="Type a message..."
              onChange={(e) => inputTextRef.current.value = e.target.value}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button
              className="ml-2 p-2 bg-blue-500 text-white rounded-lg flex items-center justify-center"
              onClick={() => sendMessage()}
            >
              Send
            </button>
          </div>
        )
      }
    </div>
  );
};

export default ChatInterface;
