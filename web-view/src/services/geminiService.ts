// services/geminiService.ts
import { ChatSession, GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration } from './vsCodeService';


const roleMap = {
  user: 'user',
  bot: 'model'
}
// Access your API key (see "Set up your API key" above)

let model: GenerativeModel;
let chatSession: ChatSession;
export const initSChat = async (history: Message[]) => {
  let API_KEY = await getConfiguration('geminiApiKey');
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: LlmPrompt,
  });
  chatSession = model.startChat({
    history: history.map(c => ({ role: roleMap[c.sender], parts: [{ text: c.text }] })),
    generationConfig: {
      candidateCount: 1
    },
  });
  return chatSession;
}

export const resetChat = async () => {
  chatSession = null;
}

export const getGeminiResponse = async (history: Message[], prompt) => {
  let chatSession = await initSChat(history);
  const result = await chatSession.sendMessage(prompt);
  const response = await result.response;
  const text = response.text();
  return processMessage(text)
};
