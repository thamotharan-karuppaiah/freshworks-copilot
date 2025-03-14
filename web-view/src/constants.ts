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

  if (!message || typeof message !== 'string') {
    console.log('Invalid message received:', message);
    response.message = message || '';
    return response;
  }

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
  
  // Quick check if we have any file blocks at all
  const hasFileStart = message.includes('---@file:start');
  const hasFileEnd = message.includes('---@file:end');
  
  // Determine if we're likely in a streaming state
  const isLikelyStreaming = hasFileStart && !hasFileEnd;
  
  // If we have start markers but no end markers, we're likely still streaming
  // In this case, we'll skip file extraction to avoid parsing incomplete blocks
  if (isLikelyStreaming) {
    console.log('Found file:start markers but no file:end markers - likely still streaming');
    response.message = message;
    return response;
  }
  
  // Find all file blocks by iterating through the message
  let startIndex = 0;
  let hasFileBlocks = false;
  let fileBlockCount = 0;
  let incompleteBlockCount = 0;
  
  try {
    while (true) {
      // Find the next file:start marker
      const fileStartIndex = message.indexOf('---@file:start', startIndex);
      if (fileStartIndex === -1) break; // No more file blocks
      
      // Set the response type to code if we found at least one file block
      if (!hasFileBlocks) {
        response.type = 'code';
        hasFileBlocks = true;
      }
      
      // Find the end marker for this file block
      const fileEndIndex = message.indexOf('---@file:end', fileStartIndex);
      if (fileEndIndex === -1) {
        incompleteBlockCount++;
        console.log(`Skipping incomplete file block #${incompleteBlockCount} at position ${fileStartIndex}`);
        startIndex = fileStartIndex + 1; // Move past this incomplete block
        continue;
      }
      
      // Extract the complete block
      const completeBlock = message.substring(fileStartIndex, fileEndIndex + '---@file:end'.length);
      
      // Extract file name and type
      const fileNameMatch = completeBlock.match(/fileName="([^"]+)"/);
      const typeMatch = completeBlock.match(/type="([^"]+)"/);
      
      if (fileNameMatch && typeMatch) {
        const fileName = fileNameMatch[1];
        const fileType = typeMatch[1];
        
        // Try to extract content using multiple methods
        let fileContent = "";
        let extractionMethod = "";
        
        // Method 1: Find content between fileName line and end marker
        try {
          // Find the position after the fileName attribute
          const fileNamePos = completeBlock.indexOf(`fileName="${fileName}"`);
          if (fileNamePos !== -1) {
            // Find the first newline after fileName declaration
            const firstNewlinePos = completeBlock.indexOf('\n', fileNamePos);
            if (firstNewlinePos !== -1) {
              // Extract content from after the newline to before the end marker
              const contentStartPos = firstNewlinePos + 1;
              const contentEndPos = completeBlock.lastIndexOf('---@file:end');
              
              if (contentStartPos < contentEndPos) {
                fileContent = completeBlock.substring(contentStartPos, contentEndPos).trim();
                extractionMethod = "primary";
              }
            }
          }
        } catch (e) {
          console.log(`Primary extraction method failed for ${fileName}: ${e.message}`);
        }
        
        // Method 2: Use regex if method 1 failed
        if (!fileContent) {
          try {
            const contentMatch = completeBlock.match(/fileName="[^"]+"\s*\n([\s\S]*?)---@file:end/);
            if (contentMatch && contentMatch[1]) {
              fileContent = contentMatch[1].trim();
              extractionMethod = "regex";
            }
          } catch (e) {
            console.log(`Regex extraction method failed for ${fileName}: ${e.message}`);
          }
        }
        
        // Method 3: Split by lines if methods 1 and 2 failed
        if (!fileContent) {
          try {
            const lines = completeBlock.split('\n');
            // Find the line with fileName
            const fileNameLineIndex = lines.findIndex(line => line.includes(`fileName="${fileName}"`));
            if (fileNameLineIndex !== -1 && fileNameLineIndex < lines.length - 1) {
              // Take all lines after the fileName line up to the line with end marker
              const endMarkerLineIndex = lines.findIndex(line => line.includes('---@file:end'));
              if (endMarkerLineIndex > fileNameLineIndex) {
                fileContent = lines.slice(fileNameLineIndex + 1, endMarkerLineIndex).join('\n').trim();
                extractionMethod = "line-by-line";
              }
            }
          } catch (e) {
            console.log(`Line-by-line extraction method failed for ${fileName}: ${e.message}`);
          }
        }
        
        // If we have content, add the file to the response
        if (fileContent) {
          fileBlockCount++;
          
          response.files.push({
            fileName,
            fileType,
            content: fileContent
          });
          
          console.log(`Extracted file ${fileBlockCount}: ${fileName} (${fileContent.length} chars) using ${extractionMethod} method`);
        } else {
          console.log(`Failed to extract content for ${fileName} using all methods`);
        }
      } else {
        console.log('Missing fileName or type in file block');
      }
      
      // Move past this block for the next iteration
      startIndex = fileEndIndex + '---@file:end'.length;
    }
    
    if (fileBlockCount > 0) {
      console.log(`Successfully extracted ${fileBlockCount} file blocks`);
      if (incompleteBlockCount > 0) {
        console.log(`Skipped ${incompleteBlockCount} incomplete file blocks`);
      }
    } else if (hasFileStart) {
      console.log('Found file:start markers but could not extract any complete file blocks');
      if (incompleteBlockCount > 0) {
        console.log(`Found ${incompleteBlockCount} incomplete file blocks - likely still streaming`);
      }
    }
  } catch (error) {
    console.error('Error parsing file blocks:', error);
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