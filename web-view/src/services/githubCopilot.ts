// services/geminiService.ts
import axios from 'axios';
import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import { getHistory } from '../store/chat-message-store';
import { sendCopilotPromptRequest, executeAnyCommand } from './vsCodeService';
import { LlmPrompt, VsCommands } from '../constants';

export const getCopilotResponse = async (prompt: string, hiddenPrompt) => {
	return await executeAnyCommand(VsCommands.copilotRequest, { prompt: prompt, hiddenPrompt: hiddenPrompt, history: [...getHistory(), { sender: 'user', text: LlmPrompt }] }) as string;
};