import { ParsedResponse } from '../../constants';
import { Message } from '../../store/chat-message-store';

export interface LlmResponseProps {
  data: string;
  messageKey?: string;
  isStreaming?: boolean;
}

export interface FileBlockProps {
  fileName: string;
  content: string;
  fileType: string;
  complete: boolean;
  theme: string;
  copyFile: (file: ParsedResponse['files'][0]) => void;
  createFile: (file: ParsedResponse['files'][0]) => void;
}

export interface TextSegmentProps {
  content: string;
  isStreaming: boolean;
}

export interface MarkdownProps {
  children: string;
  isStreaming?: boolean;
}

export interface FigmaInspectButtonProps {
  onClick: () => void;
}

export interface FollowupSuggestionsProps {
  followups: string[];
}

export interface FigmaDesignsPanelProps {
  designs: Message[];
  onSelect: (design: Message) => void;
  onClose: () => void;
}

export interface StreamingSegment {
  type: 'text' | 'file';
  content: string;
  fileName?: string;
  complete?: boolean;
}

export interface StreamingContent {
  type: 'text' | 'figma-text' | 'segments';
  content?: string;
  segments?: StreamingSegment[];
}

export interface LocalStorageHelpers {
  saveContentToLocalStorage: (fileName: string, content: string) => void;
  getContentFromLocalStorage: (fileName: string) => string | null;
  getLocalStorageKey: (fileName: string) => string;
} 