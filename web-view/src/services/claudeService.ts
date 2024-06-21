import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../store/chat-message-store';
import { LlmPrompt, processMessage } from '../constants';
import { getConfiguration } from './vsCodeService';


const roleMap = {
  user: 'user',
  bot: 'assistant'
}


export const getClaudeResponse = async (history: Message[], prompt, processingCallback: (streamPart: string) => void) => {

  const anthropic = new Anthropic({
    apiKey: await getConfiguration('claudeApiKey'),
  });

  const stream = await anthropic.messages.stream({
    max_tokens: 1024,
    messages: [...history.map(c => ({ role: roleMap[c.sender] as any, content: c.text })), { role: roleMap.user as any, content: prompt }],
    model: await getConfiguration('claudeModel', true) || 'claude-3-opus-20240229',
    stream: true,
    system: LlmPrompt(),
  }).on('text', (text) => {
    processMessage(text);
  });

  const message = (await stream.finalMessage()).content.map(c => c.type === 'text' ? c.text : '').join('');;
  return processMessage(message)
};
