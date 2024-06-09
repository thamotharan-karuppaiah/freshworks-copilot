// services/deepaiService.ts
import { processMessage } from '../constants';
import { Message } from '../store/chat-message-store';
import { getConfiguration } from './vsCodeService';
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
	return processMessage(text);
};
