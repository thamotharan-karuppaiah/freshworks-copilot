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
2. Special actions can be used in any order throughout the response and are marked with specific tags:

   For code files:
   You can describe the file's purpose in markdown before the file block:
   
   This button component provides a reusable UI element with TypeScript props and hover effects.
   ---@file:start fileName="path/to/file" type="fileType"
   code content here (DO NOT use markdown code fence markers like \`\`\` inside file blocks)
   ---@file:end

   For Figma inspection:
   ---@figma:inspect
   
   For follow-up suggestions:
   ---@followups
   - Suggestion 1
   - Suggestion 2

Example Response:
I've created a reusable button component with hover effects.

Here's the main button component that provides a flexible, type-safe interface with support for variants:
---@file:start fileName="components/Button.tsx" type="tsx"
interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ label, onClick, variant = 'primary' }: ButtonProps) => {
  return (
    <button 
      className={\`btn \${variant}\`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
---@file:end

And here are the corresponding styles that handle the button's appearance and animations:
---@file:start fileName="styles/button.css" type="css"
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.2s;
}
.btn.primary {
  background: #0066ff;
  color: white;
}
.btn:hover {
  transform: translateY(-1px);
}
---@file:end

The button component is now ready to use. I've included both the component and its styles.

---@followups
- How do I add loading states?
- Can you show how to use this button in a form?
- How do I add custom animations?
`;

export const LlmPromptXML = LlmPrompJSON;

export interface ParsedResponse {
  type: 'text' | 'code';
  message: string;
  inspectRequested: boolean;
  files?: {
    fileType: string;
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

  // Check and extract figma:inspect markers
  if (message.includes('---@figma:inspect')) {
    console.log('Figma inspect marker found in message');
    response.inspectRequested = true;
  } else {
    console.log('No Figma inspect marker found in message');
  }

  // Extract followups sections
  const followupsMatch = message.match(/---@followups\s+([\s\S]*?)($|---@)/);
  if (followupsMatch) {
    const followupsSection = followupsMatch[1];
    console.log('Found followups section:', followupsSection);
    const suggestions = followupsSection.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());
    
    if (suggestions.length > 0) {
      console.log('Extracted followup suggestions:', suggestions);
      response.followups = suggestions;
    }
  }
  
  // Extract file blocks - modified to not rely on markdown backticks
  const fileBlocks = message.match(/---@file:start[\s\S]*?---@file:end/g) || [];
  if (fileBlocks.length > 0) {
    response.type = 'code';
    
    for (const block of fileBlocks) {
      const fileNameMatch = block.match(/fileName="([^"]+)"/);
      const typeMatch = block.match(/type="([^"]+)"/);
      
      if (fileNameMatch && typeMatch) {
        // Extract the content directly between the file name line and the end marker
        const contentMatch = block.match(/fileName="[^"]+"\s*\n([\s\S]*?)---@file:end/);
        const fileContent = contentMatch ? contentMatch[1].trim() : "";
        
        response.files.push({
          fileName: fileNameMatch[1],
          fileType: typeMatch[1],
          content: fileContent
        });
      }
    }
  }
  
  // Set the message without removing anything
  response.message = message;
  
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