// services/geminiService.ts
import { ChatSession, GenerativeModel, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration } from './vsCodeService';


const roleMap = {
  user: 'user',
  bot: 'model'
}
// Access your API key (see "Set up your API key" above)
let safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];
let model: GenerativeModel;
let chatSession: ChatSession;
export const initSChat = async (history: Message[]) => {
  let API_KEY = await getConfiguration('geminiApiKey');
  const genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: LlmPrompt(),
  });
  chatSession = model.startChat({
    history: history.map(c => ({ role: roleMap[c.sender], parts: [{ text: c.text }] })),
    safetySettings: safetySettings,
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 30000
    },
  });
  return chatSession;
}

export const resetChat = async () => {
  chatSession = null;
}

export const getGeminiResponse = async (history: Message[], prompt, processingCallback: (streamPart: string) => void) => {
  let chatSession = await initSChat(history);
  const result = await chatSession.sendMessageStream(prompt);
  let parts = [];
  for await (const item of result.stream) {
    let value = item?.candidates?.[0].content?.parts?.[0]?.text || '';
    processingCallback(value);
  }
  const response = await result.response;
  const text = response.text();
  return processMessage(text)
};
