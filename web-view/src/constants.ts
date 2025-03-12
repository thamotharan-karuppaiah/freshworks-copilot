import { XMLParser } from "fast-xml-parser";
import { getConfiguration } from './services/vsCodeService';

let promptResponseType = 'xml';

(async function initLlmProptType() {
  const responseType = await getConfiguration('promptResponseType').catch(() => 'xml');
  if (responseType === 'xml' || responseType === 'json') {
    promptResponseType = responseType;
  }
})();

export function LlmPrompt() {
  return promptResponseType === 'xml' ? LlmPromptXML : LlmPrompJSON;
}

export const LlmPrompJSON = `You are a Freshworks' Developer Chat Assistant for Code generation and Figma to Code conversion. 

WHAT YOU CAN ASK:
1. Code Generation & Development:
   - Generate new code components, functions, or entire applications
   - Debug existing code
   - Add features or modify existing code
   - Get best practices and code optimization suggestions

2. Figma to Code Conversion:
   - Convert Figma designs to code (React, Angular, HTML/CSS, etc.)
   - When asking about Figma:
     * Provide the Figma URL if not already shared
     * Select nodes in Figma for conversion (will be automatically provided to assistant)
     * Choose styling preferences (external CSS, inline CSS, Tailwind, etc.)
   - The assistant will:
     * Ask for URL if not provided
     * Guide you to inspect the design when URL is found
     * Request node selection if not provided
     * Clean and optimize the generated code
     * Create appropriate file structure based on the framework

3. Hidden Context Support:
   When you select a Figma node, it's automatically provided to the assistant as:
   HIDDEN:FIGMA NODE: <node-details>
   This helps the assistant understand the design context without explicit sharing.

RESPONSE FORMAT:
1. Responses will be in markdown format for clear reading
2. Special actions are marked with specific tags:

   For code files:
   ---@file:start fileName="path/to/file" type="fileType"
   \`\`\`language
   code content here
   \`\`\`
   ---@file:end

   For Figma inspection:
   ---@figma:inspect
   
   For follow-up suggestions:
   ---@followups
   - Suggestion 1
   - Suggestion 2

Example Response:
Here's the Button component you requested.

---@file:start fileName="components/Button.tsx" type="tsx"
\`\`\`tsx
export const Button = () => {
  return <button>Click me</button>
}
\`\`\`
---@file:end

Let me know if you need any modifications.

---@followups
- How do I style this button?
- Can you add click handling?
- How do I make this button responsive?
`;

export const LlmPromptXML = LlmPrompJSON;

export interface ParsedResponse {
  type: 'text' | 'code';
  message: string;
  inspectRequested: boolean;
  files?: {
    fileType: string;
    message?: string;
    fileName: string;
    content: string;
  }[];
  followups?: string[];
}

export function processMessage(message: string): string {
    return message;
}

export function parseMessage(message: string): ParsedResponse {
  const response: ParsedResponse = {
    type: 'text',
    message: '',
    inspectRequested: false,
    files: [],
    followups: []
  };

  // Split message into sections based on markers
  const sections = message.split(/---@/);
  
  // First section is always the main message
  let mainMessage = sections[0];

  // Remove followups section from main message if it exists
  const followupsMarkerIndex = mainMessage.toLowerCase().indexOf('\nfollowups:');
  if (followupsMarkerIndex !== -1) {
    mainMessage = mainMessage.substring(0, followupsMarkerIndex);
  }

  response.message = mainMessage.trim();

  // Process remaining sections
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    
    if (section.startsWith('file:start')) {
      // Extract file info and handle streaming code blocks
      const fileNameMatch = section.match(/fileName="([^"]+)"/);
      const typeMatch = section.match(/type="([^"]+)"/);
      let content = '';
      
      // Find the code block content, even if it's incomplete
      const codeBlockMatch = section.match(/```[\w-]*\n([\s\S]*?)($|```)/);
      if (codeBlockMatch) {
        content = codeBlockMatch[1];
      }
      
      if (fileNameMatch && typeMatch) {
        response.type = 'code';
        response.files.push({
          fileName: fileNameMatch[1],
          fileType: typeMatch[1],
          content: content.trim(),
          message: 'Generated file'
        });
      }
    } else if (section.startsWith('figma:inspect')) {
      response.inspectRequested = true;
    } else if (section.startsWith('followups')) {
      const suggestions = section.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
      response.followups = suggestions;
    }
  }

  return response;
}

export enum VsCommands {
  getConfiguration = 'fmpilot.getConfiguration',
  copilotRequest = 'fmpilot.copilotRequest',
  figmaInspect = 'figma.inspect',
}

export enum Sender {
  User = 'user',
  Bot = 'bot'
}