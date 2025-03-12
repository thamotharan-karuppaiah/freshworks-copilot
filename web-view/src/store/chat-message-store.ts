// store.ts
import { FileImageResponse, FileNodesResponse, FileImageFillsResponse } from 'figma-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FigmaFileInfo } from '../util/figma';
import { Sender } from "../constants"
import { v4 as uuidv4 } from 'uuid';

export interface Message {
	key?: string;
	sender: string;
	text: string;
	animation?: string;
	presentationonly?: boolean;
	hidden?: boolean;
	isImage?: boolean;
	isStreaming?: boolean;
	imgPath?: string;
	figmaResponse?: {
		nodeResponse: FileNodesResponse;
		fileInfo: FigmaFileInfo;
		nodeImages: FileImageResponse;
		fileImageFillsResponse: FileImageFillsResponse;
	}
}

export interface Chat {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	lastUpdatedAt: number;
}

export interface ChatStore {
	chats: Chat[];
	currentChatId: string | null;
	lastKnownFigmaNode: any;
	addMessage: (message: Message) => void;
	removeMessage: (message: Message) => void;
	clearMessages: () => void;
	setLastKnownFigmaNode: (node: any) => void;
	createNewChat: () => void;
	switchChat: (chatId: string) => void;
	updateChatTitle: (chatId: string, title: string) => void;
	updateMessage: (messageKey: string, text: string, isStreaming?: boolean) => void;
	deleteChat: (chatId: string) => void;
}

const DEFAULT_CHAT_TITLE = 'New Chat';

const createChat = (): Chat => ({
	id: uuidv4(),
	title: DEFAULT_CHAT_TITLE,
	messages: [],
	createdAt: Date.now(),
	lastUpdatedAt: Date.now(),
});

const useChatStore = create<ChatStore>(
	persist(
		(set, get) => ({
			chats: [createChat()],
			currentChatId: null,
			lastKnownFigmaNode: null,

			addMessage: (message: Message) =>
				set((state) => {
					const currentChat = state.chats.find(chat => chat.id === (state.currentChatId || state.chats[0].id));
					if (!currentChat) {
						// If no current chat exists, create a new one
						const newChat = createChat();
						return {
							...state,
							chats: [{
								...newChat,
								messages: [{ ...message }],
								lastUpdatedAt: Date.now()
							}, ...state.chats],
							currentChatId: newChat.id
						};
					}

					// Update chat title if it's the first user message
					let updatedTitle = currentChat.title;
					if (currentChat.title === DEFAULT_CHAT_TITLE && message.sender === Sender.User && !message.hidden) {
						updatedTitle = message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '');
					}

					const updatedChats = state.chats.map(chat => 
						chat.id === currentChat.id 
							? {
									...chat,
									title: updatedTitle,
									messages: [...chat.messages, { ...message }],
									lastUpdatedAt: Date.now()
								}
							: chat
					);

					return { ...state, chats: updatedChats };
				}),

			clearMessages: () =>
				set((state) => {
					const newChat = createChat();
					return {
						...state,
						chats: [newChat, ...state.chats],
						currentChatId: newChat.id
					};
				}),

			removeMessage: (message: Message) =>
				set((state) => {
					const currentChat = state.chats.find(chat => chat.id === (state.currentChatId || state.chats[0].id));
					if (!currentChat) return state;

					const updatedChats = state.chats.map(chat => 
						chat.id === currentChat.id 
							? {
									...chat,
									messages: chat.messages.filter(m => m.key !== message.key),
									lastUpdatedAt: Date.now()
								}
							: chat
					);

					// Remove chat if it has no messages
					const finalChats = updatedChats.filter(chat => 
						chat.id === currentChat.id ? chat.messages.length > 0 : true
					);

					// If we removed the current chat, switch to the first available chat
					const newCurrentChatId = finalChats.length > 0 
						? (finalChats.find(c => c.id === currentChat.id) ? currentChat.id : finalChats[0].id)
						: createChat().id;

					return {
						...state,
						chats: finalChats.length > 0 ? finalChats : [createChat()],
						currentChatId: newCurrentChatId
					};
				}),

			setLastKnownFigmaNode: (node: any) => set({ lastKnownFigmaNode: node }),

			createNewChat: () =>
				set((state) => {
					const newChat = createChat();
					return {
						...state,
						chats: [newChat, ...state.chats.filter(chat => chat.messages.length > 0)], // Only keep chats with messages
						currentChatId: newChat.id
					};
				}),

			switchChat: (chatId: string) =>
				set({ currentChatId: chatId }),

			updateChatTitle: (chatId: string, title: string) =>
				set((state) => ({
					chats: state.chats.map(chat => 
						chat.id === chatId 
							? { ...chat, title: title.trim() || DEFAULT_CHAT_TITLE }
							: chat
					)
				})),

			updateMessage: (messageKey: string, text: string, isStreaming?: boolean) =>
				set((state) => {
					const currentChat = state.chats.find(chat => chat.id === (state.currentChatId || state.chats[0].id));
					if (!currentChat) return state;

					const updatedChats = state.chats.map(chat => 
						chat.id === currentChat.id 
							? {
									...chat,
									messages: chat.messages.map(msg => 
										msg.key === messageKey 
											? { ...msg, text, isStreaming: isStreaming ?? msg.isStreaming }
											: msg
									),
									lastUpdatedAt: Date.now()
								}
							: chat
					);

					return { ...state, chats: updatedChats };
				}),

			deleteChat: (chatId: string) =>
				set((state) => {
					const updatedChats = state.chats.filter(chat => chat.id !== chatId);
					const needNewChat = updatedChats.length === 0;
					
					if (needNewChat) {
						const newChat = createChat();
						return {
							...state,
							chats: [newChat],
							currentChatId: newChat.id
						};
					}

					return {
						...state,
						chats: updatedChats,
						currentChatId: state.currentChatId === chatId ? updatedChats[0].id : state.currentChatId
					};
				}),
		}),
		{
			name: 'chat-storage',
		}
	) as any
);

export const getHistory = () => {
	const store = useChatStore.getState();
	const currentChat = store.chats.find(chat => chat.id === store.currentChatId);
	return currentChat?.messages || [];
};

export default useChatStore;
