import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration, sendCloudverseRequest } from './vsCodeService';

const roleMap = {
  user: 'user',
  bot: 'assistant'
};

async function makeDirectRequest(data: any, processingCallback: (chunk: string) => void): Promise<string> {
  try {
    const response = await fetch(data.url, {
      method: data.method,
      headers: data.headers,
      body: JSON.stringify(data.data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let fullMessage = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      processingCallback(chunk);
      fullMessage += chunk;
    }

    return fullMessage;
  } catch (error) {
    console.error('Error making direct request:', error);
    throw error;
  }
}

export const getLlmResponse = async (
  history: Message[], 
  prompt: string, 
  model: string, 
  processingCallback: (streamPart: string) => void
): Promise<string> => {
  // Format messages for the API
  const messages = [...history.map(c => ({
    role: roleMap[c.sender],
    content: c.text
  })), {
    role: roleMap.user,
    content: prompt
  }];

  // Get API key
  const apiKey = await getConfiguration('cloudverseApiKey');

  // Prepare request data
  const data = {
    url: 'https://cloudverse.freshworkscorp.com/api/v2/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
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
    if (window.acquireVsCodeApi) {
      await sendCloudverseRequest(data, (chunk) => {
        processingCallback(chunk);
        fullMessage += chunk;
      });
      } else {
      fullMessage = await makeDirectRequest(data, processingCallback);
    }
    return processMessage(fullMessage);
  } catch (error) {
    console.error('Error calling Cloudverse API:', error);
    throw error;
  }
}; 