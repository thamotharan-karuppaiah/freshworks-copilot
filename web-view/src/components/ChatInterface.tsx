import React, { useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import useChatStore, { ChatStore } from '../store/chat-message-store';
import { getChatGptResponse } from '../services/chatgptService';
import { getGeminiResponse } from '../services/geminiService';
import { getOtherModelResponse } from '../services/otherModelService';
import { getCopilotResponse } from '../services/githubCopilot';
import { getFigmaResponse } from '../services/figmaApiService';
import { getCohereAiResponse } from '../services/coherAiService';
import { checktextHasFigmaUrl, extractFileNodeId, getNodeResponse } from '../util/figma';
import FigmaNodeViewer from './FigmaNode';
import LlmResponse from './LlmResponse';
import { Sender } from '../constants';
import { getDeepAiResponse } from '../services/deepAiService';
import EmptyState from './EmptyState';
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import LoadingText from './LoadingText';
import { createComponent } from '../util/figma-html';

const ChatInterface: React.FC = () => {
  const { messages, addMessage, clearMessages, lastKnownFigmaNode, setLastKnownFigmaNode }: ChatStore = useChatStore();
  const vsCodeMessage = useVsCodeMessageStore((state) => state.message);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gemini');
  const [followupSuggestions, setfollowupSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!vsCodeMessage) return;
    vsCodeMessage.command === 'figmaNodeSelected' && setLastKnownFigmaNode(vsCodeMessage.selectedNode);
  }, [vsCodeMessage]);

  const processIfPromptIsFigmaURL = async (inputText: string) => {
    let response = await getFigmaResponse(inputText, (message) => addMessage({ sender: Sender.Bot, text: message, presentationonly: true }));
    let { fileInfo, nodeResponse, nodeImages } = response;
    // let hiddenPrompt;
    if (nodeResponse) {
      addMessage({
        sender: Sender.Bot, text: '', figmaResponse: response, imgPath: nodeImages.images[fileInfo.nodeID.replace('-', ':')], presentationonly: true, isImage: true, hidden: true
      });
    }
  }

  const sendMessage = async (messageText?: string) => {
    setfollowupSuggestions([]);
    const message = messageText || inputText;
    if (message.trim() === '') return;

    setInputText('');
    setLoading(true);

    try {
      let hiddenPrompt;
      if (checktextHasFigmaUrl(message)) {
        addMessage({ sender: Sender.User, text: message });
        await processIfPromptIsFigmaURL(message);
      }
      else {
        addMessage({ sender: Sender.User, text: message });
        if (lastKnownFigmaNode) {
          hiddenPrompt = `HIDDEN:FIGMA HTML : ${createComponent(lastKnownFigmaNode as any, {}, {}, {})}`;
        }
      }

      let botResponse = '';
      switch (model) {
        case 'chatgpt':
          botResponse = await getChatGptResponse(message);
          break;
        case 'gemini':
          botResponse = await getGeminiResponse(message, hiddenPrompt);
          break;
        case 'copilot':
          botResponse = await getCopilotResponse(message, hiddenPrompt);
          break;
        case 'cohereai':
          botResponse = await getCohereAiResponse(message, hiddenPrompt);
          break;
        case 'deepai':
          botResponse = await getDeepAiResponse(message, hiddenPrompt);
          break;
        default:
          botResponse = 'Invalid model selected';
      }

      try {
        let followUpResponse = JSON.parse(botResponse).followups || [];
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
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between p-4 bg-gray-800 text-white items-center">
        <div className="flex items-center space-x-2">
          <span>Freshworks Copilot  {lastKnownFigmaNode && `: FIGMA MODE`}</span>
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
            <LoadingText startTime={1}></LoadingText>
          </div>
        )}
        <div className="flex flex-col">
          {messages.filter(c => !c.hidden).length === 0 ? (
            <EmptyState />
          ) : (
            messages.filter(c => !c.hidden || c.presentationonly).map((message, index) => (
              <div
                key={message.key}
                className={`max-w-full p-2 rounded-lg m-2 flex flex-col justify-between transform transition-all duration-500 ${message.sender === 'user'
                  ? 'bg-blue-500 text-white self-end fadeIn'
                  : 'bg-gray-300 text-gray-800 self-start fadeIn'
                  }`}
              >
                {message.isImage ?
                  <FigmaNodeViewer fileResponse={message.figmaResponse.nodeResponse} image={message.imgPath}></FigmaNodeViewer>
                  :
                  <LlmResponse data={message.text}></LlmResponse>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Follow-up suggestions section */}
      {followupSuggestions.length > 0 && (
        <div className="p-4 bg-gray-800 flex flex-wrap">
          {followupSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="m-1 p-2 bg-blue-500 text-white rounded-lg"
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {lastKnownFigmaNode && (
        <div className="flex items-center p-4 bg-gray-200 justify-between">
          <span>Selected Node: <b>{lastKnownFigmaNode.name}</b></span>
          <div className="flex space-x-2">
            <button onClick={() => sendMessage(`Submitted the node: ${lastKnownFigmaNode.name}`)} className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Submit</button>
            <button onClick={() => setLastKnownFigmaNode(null)} className="px-2 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Close</button>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-800 flex items-center">
        <input
          type="text"
          className="flex-1 p-2 rounded-lg"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <button
          className="ml-2 p-2 bg-blue-500 text-white rounded-lg flex items-center justify-center"
          onClick={() => sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
