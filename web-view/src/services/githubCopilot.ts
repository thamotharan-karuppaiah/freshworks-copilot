// services/geminiService.ts
import { Message } from '../store/chat-message-store';
import { executeAnyCommand } from './vsCodeService';
import { LlmPrompt, VsCommands, processMessage } from '../constants';

export const getCopilotResponse = async (history: Message[], prompt) => {
	let message =  await executeAnyCommand(VsCommands.copilotRequest, { prompt: prompt, hiddenPrompt: '', history: [{ sender: 'user', text: LlmPrompt() }, ...history] }) as string;
	return processMessage(message);
};