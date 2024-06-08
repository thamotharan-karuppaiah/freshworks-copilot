import OpenAI from "openai";
import { Message, getHistory } from '../store/chat-message-store';
import { LlmPrompt, VsCommands } from '../constants';
import { executeAnyCommand, getConfiguration, getState, openConfiguration } from './vsCodeService';
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources";

const roleMap = {
  user: 'user',
  bot: 'assistant',
  system: 'system'
}

// Access your API key (make sure to set it up in your environment or configuration)
let openai: OpenAI;
let model;

export const initChatGPT = async () => {
  let API_KEY = await getConfiguration('chatGptApiKey');
  let endpoint = await getConfiguration('chatGptEndpoint');
  model = await getConfiguration('chatGptModel');
  openai = new OpenAI({ apiKey: API_KEY, baseURL: endpoint, dangerouslyAllowBrowser: true });
}

export const getChatGptResponse = async (history: Message[], prompt) => {
  await initChatGPT();
  const messageHistory = history.map(c => ({ role: roleMap[c.sender], content: c.text })) as any;
  let messages = [{ role: roleMap.system, content: LlmPrompt }, ...messageHistory, { role: roleMap.user, content: prompt }];
  let chatCompletionParams: ChatCompletionCreateParamsNonStreaming = { messages: messages, model: model };

  let result = await openai.chat.completions.create(chatCompletionParams);;
  let text = result.choices[0].message.content;

  // Extract JSON text from the text like ```json { "type": "text", "message": "Why don't scientists trust atoms? Because they make up everything! 😂" } ```
  const jsonText = text.match(/```json(.*)```/s);
  if (jsonText && jsonText[1]) {
    return jsonText[1];
  } else {
    return text;
  }
};