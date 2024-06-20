// services/geminiService.ts
import { getHistory, Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage, VsCommands } from '../constants';
import { executeAnyCommand, getConfiguration, getState, openConfiguration } from './vsCodeService';
import { CohereClient } from "cohere-ai"


const roleMap = {
	user: 'USER',
	bot: 'CHATBOT',
	system: 'SYSTEM'
}
// Access your API key (see "Set up your API key" above)

let client: CohereClient;
export const initClient = async () => {
	const API_KEY = await getConfiguration('cohereaiApiKey');
	let client = new CohereClient({ token: API_KEY });
	return client;
}

export const getCohereAiResponse = async (history: Message[], prompt, processingCallback: (streamPart: string) => void) => {
	client = client ? client : await initClient();
	let response = await client.chatStream({
		message: prompt,
		chatHistory: [{ role: roleMap.system as any, message: LlmPrompt() }, ...history.map(c => ({ role: roleMap[c.sender] as any, message: c.text }))]
	});
	let parts = [];
	for await (const item of response) {
		if (item.eventType === "text-generation") {
			processingCallback(item.text);
			parts.push(item.text);
		}
	};
	const text = parts.join('');
	return processMessage(text);
};
