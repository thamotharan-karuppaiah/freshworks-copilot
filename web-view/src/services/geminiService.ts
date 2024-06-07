// services/geminiService.ts
import { ChatSession, GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { getHistory } from '../store/chat-message-store';
import { LlmPrompt, VsCommands } from '../constants';
import { executeAnyCommand, getConfiguration, getState, openConfiguration } from './vsCodeService';


const roleMap = {
  user: 'user',
  bot: 'model'
}
// Access your API key (see "Set up your API key" above)

let model: GenerativeModel;
let chatSession: ChatSession;
export const initSChat = async () => {
  let API_KEY = await getConfiguration('geminiApiKey');
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: LlmPrompt
  });
  chatSession = model.startChat({
    history: getHistory().map(c => ({ role: roleMap[c.sender], parts: [{ text: c.text }] })),
    generationConfig: {
      candidateCount: 1
    },
  });
  return chatSession;
}

export const resetChat = async () => {
  chatSession = null;
}

export const getGeminiResponse = async (prompt: string, hiddenContext?: string) => {
  chatSession = chatSession ? chatSession : await initSChat();
  let prompts = [prompt];
  if (hiddenContext) prompts.push(hiddenContext);
  const result = await chatSession.sendMessage(prompts);
  const response = await result.response;
  const text = response.text();
  // extract json text form the text like ```json { "type": "text", "message": "Why don't scientists trust atoms? Because they make up everything! 😂" } ```
  const jsonText = text.match(/```json(.*)```/s);
  if (jsonText && jsonText[1]) {
    return jsonText[1];
  }
  else {
    return text;
  }
};
