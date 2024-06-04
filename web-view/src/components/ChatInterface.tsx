import React, { useState } from 'react';
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

const ChatInterface: React.FC = () => {
  const { messages, addMessage, clearMessages, deleteMessage, lastKnownFigmaNode, setLastKnownFigmaNode }: ChatStore = useChatStore();
  const [inputText, setInputText] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gemini');


  const processIfPromptIsFigmaURL = async (inputText: string) => {
    let response = await getFigmaResponse(inputText, (message) => addMessage({ sender: Sender.Bot, text: message, presentationonly: true }));
    let { fileInfo, nodeResponse, nodeImages } = response;
    setLastKnownFigmaNode(nodeResponse);
    let hiddenPrompt;
    if (nodeResponse) {
      addMessage({
        sender: Sender.Bot, text: '', figmaResponse: response, imgPath: nodeImages.images[fileInfo.nodeID.replace('-', ':')], presentationonly: true, isImage: true
      });
      hiddenPrompt = `HIDDEN:<${JSON.stringify(nodeResponse)}>`;
      addMessage({ sender: Sender.User, text: hiddenPrompt, hidden: true });
    }
    return hiddenPrompt;
  }

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    setInputText('');
    setLoading(true);

    try {
      let hiddenPrompt;
      if (checktextHasFigmaUrl(inputText)) {
        addMessage({ sender: Sender.User, text: inputText, presentationonly: true });
        hiddenPrompt = await processIfPromptIsFigmaURL(inputText);
        addMessage({ sender: Sender.User, text: hiddenPrompt, hidden: true });
      }
      else {
        addMessage({ sender: Sender.User, text: inputText });
      }

      let botResponse = '';
      switch (model) {
        case 'chatgpt':
          botResponse = await getChatGptResponse(inputText);
          break;
        case 'gemini':
          botResponse = await getGeminiResponse(inputText, hiddenPrompt);
          break;
        case 'copilot':
          botResponse = await getCopilotResponse(inputText, hiddenPrompt);
          break;
        case 'cohereai':
          botResponse = await getCohereAiResponse(inputText, hiddenPrompt);
          break;
          case 'deepai':
            botResponse = await getDeepAiResponse(inputText, hiddenPrompt);
            break;
        default:
          botResponse = 'Invalid model selected';
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

  const handleFigmaUrlSubmit = async () => {
    setLoading(true);
    let response = await getFigmaResponse(figmaUrl, (message) => addMessage({ sender: Sender.Bot, text: message, presentationonly: true }));

    let { fileInfo, nodeResponse, nodeImages } = response;
    setLastKnownFigmaNode(nodeResponse);
    if (nodeResponse) {
      const botMessage = { sender: Sender.Bot, text: '', nodeResponse, fileInfo, nodeImages, imgPath: nodeImages.images[fileInfo.nodeID.replace('-', ':')], presentationonly: true, isImage: true };
      addMessage(botMessage);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between p-4 bg-gray-800 text-white items-center">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="p-2 rounded-lg bg-gray-700 text-white"
            placeholder="Enter Figma URL"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
          />
          <button
            className="bg-blue-500 p-2 rounded"
            onClick={handleFigmaUrlSubmit}
          >
            Submit
          </button>
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
            onClick={clearMessages}
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse overflow-auto flex-1 p-4">
        {loading && (
          <div className="self-start bg-gray-300 text-gray-800 p-2 rounded-lg m-2 animate-pulse">
            Loading...
          </div>
        )}
        <div className="flex flex-col">
          {messages.filter(c => !c.hidden).map((message, index) => (
            <div
              key={message.key}
              className={`p-2 rounded-lg m-2 flex flex-col justify-between transform transition-all duration-500 ${message.sender === 'user'
                ? 'bg-blue-500 text-white self-end fadeIn'
                : 'bg-gray-300 text-gray-800 self-start fadeIn'
                }`}
            >

              {message.isImage ?
                // <img className="max-w-[80%] max-h-[350px]" src={message.imgPath} alt='image' /> 
                <FigmaNodeViewer fileResponse={message.figmaResponse.nodeResponse} image={message.imgPath}></FigmaNodeViewer>
                :

                <LlmResponse data={message.text}></LlmResponse>}
              {/* <button
                className="ml-2 bg-red-500 p-1 rounded text-white"
                onClick={() => deleteMessage(index)}
              >
                Delete
              </button> */}
            </div>
          ))}
        </div>
      </div>

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
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
