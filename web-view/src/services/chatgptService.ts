// services/chatgptService.ts
import axios from 'axios';

export const getChatGptResponse = async (prompt: string) => {
  const response = await axios.post('/api/chatgpt', { prompt });
  return response.data.response;
};

// import OpenAI from "openai";
// import { getHistory } from '../store/chat-message-store';
// import { LlmPrompt, VsCommands } from '../constants';
// import { executeAnyCommand, getConfiguration, getState, openConfiguration } from './vsCodeService';

// const roleMap = {
//   user: 'user',
//   bot: 'assistant',
//   system: 'system'
// }

// // Access your API key (make sure to set it up in your environment or configuration)
// let openai: OpenAI;

// export const initChatGPT = async () => {
//   let API_KEY = await getConfiguration('chatGptApiKey');
//   openai = new OpenAI({ apiKey: API_KEY });
// }

// export const getChatGPTResponse = async (prompt: string, hiddenContext?: string) => {
//   await initChatGPT();
//   const history = getHistory().map(c => ({ role: roleMap[c.sender], content: c.text })).reverse();

//   let messages = [{ role: roleMap.system, content: LlmPrompt }, ...history, { role: roleMap.user, content: prompt }];
//   if (hiddenContext) {
//     messages.push({ role: roleMap.user, content: hiddenContext });
//   }

//   // openai.chat.completions.create({ messages: [] })

//   // const response = await openai.createChatCompletion({
//   //   model: "gpt-4",
//   //   messages: messages
//   // });

//   // const text = response.data.choices[0].message.content;

//   // Extract JSON text from the text like ```json { "type": "text", "message": "Why don't scientists trust atoms? Because they make up everything! 😂" } ```
//   // const jsonText = text.match(/```json(.*)```/s);
//   // if (jsonText && jsonText[1]) {
//   //   return jsonText[1];
//   // } else {
//   //   return text;
//   // }
// };
