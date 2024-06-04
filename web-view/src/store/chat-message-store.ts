// store.ts
import { FileImageResponse, FileNodesResponse } from 'figma-js';
import { create, useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { FigmaFileInfo } from '../util/figma';
import { Sender } from "../constants"
import { resetChat } from '../services/geminiService';

interface Message {
	key?: number;
	sender: Sender;
	text: string;
	animation?: string;
	presentationonly?: boolean;
	hidden?: boolean;
	isImage?: boolean,
	imgPath?: string,
	figmaResponse?: {
		nodeResponse: FileNodesResponse,
		fileInfo: FigmaFileInfo,
		nodeImages: FileImageResponse,
	}
}

export interface ChatStore {
	messages: Message[];
	addMessage: (message: Message) => void;
	clearMessages: () => void;
	deleteMessage: (index: number) => void;
	lastKnownFigmaNode: any;
	setLastKnownFigmaNode: (node: any) => void;
}

const useChatStore = create<ChatStore | any>(
	persist(
		(set) => ({
			messages: [],
			addMessage: (message) =>
				set((state) => ({ messages: [...state.messages, { ...message, key: Math.random() }] })),
			clearMessages: () => {
				resetChat(); // reset gemini chat
				return set({ messages: [] })
			},
			deleteMessage: (index) =>
				set((state) => ({
					messages: state.messages.filter((_, i) => i !== index),
				})),
			lastKnownFigmaNode: null,
			setLastKnownFigmaNode: (node) => set({ lastKnownFigmaNode: node }),
		}),
		{
			name: 'chat-storage', // unique name
		}
	)
);

export const getHistory = (excludePresenation = true): Message[] => {
	let history = useChatStore.getState().messages.filter((message: Message) => excludePresenation ? !message.presentationonly : true);
	return history;
}

export default useChatStore;
