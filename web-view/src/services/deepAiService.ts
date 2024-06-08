// services/deepaiService.ts
import { getHistory, Message } from '../store/chat-message-store';
import { LlmPrompt, VsCommands } from '../constants';
import { executeAnyCommand, getConfiguration, getState, openConfiguration } from './vsCodeService';
import axios from 'axios';
import * as deepAi from 'deepai';

const roleMap = {
	user: 'USER',
	bot: 'CHATBOT',
	system: 'SYSTEM'
}

let deepAiClient: typeof deepAi;

export const initDeepAiClient = async () => {
	const API_KEY = await getConfiguration('deepaiApiKey');
	deepAi.setApiKey(API_KEY);
	return deepAiClient = deepAi;
}

export const getDeepAiResponse = async (history: Message[], prompt) => {
	deepAiClient = deepAiClient ? deepAiClient : await initDeepAiClient();

	let result = await deepAiClient.callStandardApi('text-generator', { text: prompt })

	const text = result.data.output;

	// extract json text from the text like ```json { "type": "text", "message": "Why don't scientists trust atoms? Because they make up everything! 😂" } ```
	const jsonText = text.match(/```json(.*)```/s);
	if (jsonText && jsonText[1]) {
		return jsonText[1];
	} else {
		return text;
	}
};
