import React, { memo, useState, useMemo, useCallback } from 'react';
import { LucideCopy, LucidePlus, LucideFileCode, LucideChevronDown, LucideChevronUp, LucideLoader, LucideEye } from 'lucide-react';
import { FileBlockProps } from '../types';
import { useTheme } from '../hooks/useTheme';
// Only import SyntaxHighlighter when needed (for completed content)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

// Maximum number of lines to show initially
const MAX_INITIAL_LINES = 10;

const FileBlock = memo(({ 
  fileName, 
  content, 
  fileType, 
  complete, 
  copyFile, 
  createFile 
}: Omit<FileBlockProps, 'theme'>) => {
  const { syntaxTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showStreamingContent, setShowStreamingContent] = useState(false);
  
  // Format character count for display
  const formatCharCount = useCallback((count: number) => {
    if (count < 1000) return `${count} chars`;
    return `${(count / 1000).toFixed(1)}K chars`;
  }, []);
  
  // Memoize expensive calculations
  const { lineCount, shouldTruncate, displayContent } = useMemo(() => {
    // Count the number of lines in the code
    const lineCount = content.split('\n').length;
    const shouldTruncate = lineCount > MAX_INITIAL_LINES && complete;
    
    // If truncated, only show the first MAX_INITIAL_LINES lines when complete
    // During streaming, show the last MAX_INITIAL_LINES lines if requested
    let displayContent = content;
    
    if (complete) {
      // For complete content, show first N lines if truncated and not expanded
      if (shouldTruncate && !expanded) {
        displayContent = content.split('\n').slice(0, MAX_INITIAL_LINES).join('\n');
      }
    } else if (showStreamingContent) {
      // For streaming content, show last N lines if requested
      const lines = content.split('\n');
      if (lines.length > MAX_INITIAL_LINES) {
        displayContent = lines.slice(-MAX_INITIAL_LINES).join('\n');
      }
    }
    
    return { lineCount, shouldTruncate, displayContent };
  }, [content, complete, expanded, showStreamingContent]);
  
  // Memoize the header component
  const HeaderComponent = useMemo(() => (
    <div className="p-3 border-b border-primary">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-secondary">
          <LucideFileCode size={14} />
          {fileName}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {complete ? (
            <>
              <button 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
                onClick={() => copyFile({ fileName, content, fileType })}
                title="Copy code to clipboard"
              >
                <LucideCopy size={12} />
                Copy
              </button>
              <button 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs accent-blue text-inverted"
                onClick={() => createFile({ fileName, content, fileType })}
                title="Create file in workspace"
              >
                <LucidePlus size={12} />
                Create
              </button>
            </>
          ) : (
            <div className="text-xs text-tertiary flex items-center gap-1.5">
              <LucideLoader size={12} className="animate-spin" />
              Generating... {content.length > 0 && `(${formatCharCount(content.length)})`}
            </div>
          )}
        </div>
      </div>
    </div>
  ), [fileName, content, fileType, complete, copyFile, createFile, formatCharCount]);
  
  return (
    <div className="bg-secondary border border-primary rounded-xl overflow-hidden my-3">
      {HeaderComponent}
      {complete ? (
        <div className="code-content p-0 bg-code">
          <SyntaxHighlighter
            language={fileType}
            style={syntaxTheme}
            customStyle={{
              margin: 0,
              borderRadius: shouldTruncate && !expanded ? '0' : undefined,
              background: 'var(--bg-code)',
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              border: 'none',
              borderBottom: shouldTruncate && !expanded ? 'none' : undefined
            }}
            showLineNumbers={true}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              color: 'var(--text-tertiary)',
              textAlign: 'right',
              userSelect: 'none'
            }}
          >
            {displayContent}
          </SyntaxHighlighter>
          
          {shouldTruncate && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 px-4 text-xs flex items-center justify-center gap-1 bg-code border-t border-primary hover:bg-tertiary transition-colors"
            >
              {expanded ? (
                <>
                  <LucideChevronUp size={14} />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <LucideChevronDown size={14} />
                  <span>Show {lineCount - MAX_INITIAL_LINES} more lines</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          {showStreamingContent ? (
            <div className="code-content p-0 bg-code">
              <div className="px-4 py-2 text-xs text-tertiary bg-code border-b border-primary flex items-center justify-between">
                <span>Showing last {MAX_INITIAL_LINES} lines ({formatCharCount(content.length)} processed)</span>
                <button 
                  onClick={() => setShowStreamingContent(false)}
                  className="px-2 py-1 rounded hover:bg-tertiary transition-colors"
                >
                  Hide
                </button>
              </div>
              {/* Use a simple pre tag instead of SyntaxHighlighter for streaming content */}
              <pre
                className="p-4 m-0 overflow-auto text-sm font-mono"
                style={{
                  background: 'var(--bg-code)',
                  color: 'var(--text-primary)',
                  opacity: 0.8
                }}
              >
                {displayContent}
              </pre>
            </div>
          ) : (
            <div className="p-6 bg-code flex flex-col items-center justify-center text-tertiary">
              <div className="text-sm mb-2">Generating code... {content.length > 0 && `(${formatCharCount(content.length)})`}</div>
              <div className="text-xs opacity-70 mb-3">The complete code will appear here when ready</div>
              <button 
                onClick={() => setShowStreamingContent(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
              >
                <LucideEye size={14} />
                Show last {MAX_INITIAL_LINES} lines
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default FileBlock; 