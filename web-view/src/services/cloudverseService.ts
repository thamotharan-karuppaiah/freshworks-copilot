import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration, sendCloudverseRequest } from './vsCodeService';

const roleMap = {
  user: 'user',
  bot: 'assistant'
};

export const getLlmResponse = async (history: Message[], prompt: string, model: string, processingCallback: (streamPart: string) => void): Promise<string> => {
  // Format messages for the API
  const messages = [...history.map(c => ({
    role: roleMap[c.sender],
    content: c.text
  })), {
    role: roleMap.user,
    content: prompt
  }];

  // Prepare request data
  const data = {
    url: 'https://cloudverse.freshworkscorp.com/api/v2/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getConfiguration('cloudverseApiKey')}`
    },
    data: {
      model: model,
      messages: messages,
      stream: true,
      systemInstructions: LlmPrompt()
    }
  };

  try {
    let fullMessage = '';
    await sendCloudverseRequest(data, (chunk) => {
      processingCallback(chunk);
      fullMessage += chunk;
    });
    return processMessage(fullMessage);
  } catch (error) {
    console.error('Error calling Cloudverse API:', error);
    throw error;
  }
}; 