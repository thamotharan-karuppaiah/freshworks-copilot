// services/geminiService.ts
import { getHistory } from '../store/chat-message-store';
import { LlmPrompt, VsCommands } from '../constants';
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

export const getCohereAiResponse = async (prompt: string, hiddenContext?: string) => {
	client = client ? client : await initClient();
	let response = await client.chat({
		message: prompt,
		chatHistory: [{ role: roleMap.system as any, message: LlmPrompt }, ...getHistory().map(c => ({ role: roleMap[c.sender] as any, message: c.text }))]
	});
	// let prompts = [prompt];
	// if (hiddenContext) prompts.push(hiddenContext);
	// const result = await chatSession.sendMessage(prompts);
	// const response = await result.response;
	const text = response.text;
	// extract json text form the text like ```json { "type": "text", "message": "Why don't scientists trust atoms? Because they make up everything! 😂" } ```
	const jsonText = text.match(/```json(.*)```/s);
	if (jsonText && jsonText[1]) {
		return jsonText[1];
	}
	else {
		return text;
	}
};
