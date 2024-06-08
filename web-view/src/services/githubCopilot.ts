// services/geminiService.ts
import axios from 'axios';
import { ChatSession, GoogleGenerativeAI } from "@google/generative-ai";
import useVsCodeMessageStore from '../store/vsCodeMessageStore';
import { Message } from '../store/chat-message-store';
import { sendCopilotPromptRequest, executeAnyCommand } from './vsCodeService';
import { LlmPrompt, VsCommands } from '../constants';

export const getCopilotResponse = async (history: Message[], prompt) => {
	return await executeAnyCommand(VsCommands.copilotRequest, { prompt: prompt, hiddenPrompt: '', history: [{ sender: 'user', text: LlmPrompt }, ...history] }) as string;
};