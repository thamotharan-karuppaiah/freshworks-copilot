// services/geminiService.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration } from './vsCodeService';
import { 
  ChatPromptTemplate, 
  MessagesPlaceholder, 
  HumanMessagePromptTemplate 
} from "@langchain/core/prompts";
import { 
  RunnableSequence, 
  RunnablePassthrough 
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { 
  HumanMessage, 
  AIMessage,
  BaseMessage 
} from "@langchain/core/messages";
import { BaseMemory } from "@langchain/core/memory";

class ChatMemory extends BaseMemory {
  private messages: BaseMessage[] = [];
  private readonly memoryKey: string = "history";

  constructor(messages: BaseMessage[] = []) {
    super();
    this.messages = messages;
  }

  get memoryKeys() {
    return [this.memoryKey];
  }

  async loadMemoryVariables(_: Record<string, any>) {
    return {
      [this.memoryKey]: this.messages
    };
  }

  async saveContext(
    { input }: { input: string; }, 
    { output }: { output: string; }
  ): Promise<void> {
    this.messages.push(new HumanMessage(input));
    this.messages.push(new AIMessage(output));
  }

  clear(): void {
    this.messages = [];
  }
}

let model: ChatGoogleGenerativeAI;
let memory: ChatMemory;

const initializeModel = async () => {
  const API_KEY = await getConfiguration('geminiApiKey');
  
  model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-flash",
    maxOutputTokens: 30000,
    apiKey: API_KEY,
    maxRetries: 3,
    streaming: true
  });

  return model;
};

const createPromptTemplate = () => {
  return ChatPromptTemplate.fromMessages([
    ["system", LlmPrompt()],
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{input}")
  ]);
};

const convertToLangChainHistory = (messages: Message[]): BaseMessage[] => {
  return messages.map(message => {
    if (message.sender === 'user') {
      return new HumanMessage(message.text);
    } else {
      return new AIMessage(message.text);
    }
  });
};

export const initSChat = async (history: Message[]) => {
  model = await initializeModel();
  memory = new ChatMemory(convertToLangChainHistory(history));
  return model;
};

export const resetChat = async () => {
  if (memory) {
    memory.clear();
  }
  memory = null;
  model = null;
};

export const getGeminiResponse = async (
  history: Message[], 
  prompt: string, 
  processingCallback: (streamPart: string) => void
) => {
  if (!model) {
    await initSChat(history);
  }

  const promptTemplate = createPromptTemplate();
  
  const chain = RunnableSequence.from([
    {
      input: new RunnablePassthrough(),
      history: async () => (await memory.loadMemoryVariables({})).history
    },
    promptTemplate,
    model,
    new StringOutputParser()
  ]);

  let fullResponse = '';
  
  const stream = await chain.stream({
    input: prompt
  });

  for await (const chunk of stream) {
    fullResponse += chunk;
    processingCallback(chunk as string);
  }

  // Update memory with the new interaction
  await memory.saveContext(
    { input: prompt },
    { output: fullResponse }
  );

  return processMessage(fullResponse);
};
