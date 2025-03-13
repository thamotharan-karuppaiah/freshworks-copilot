import React, { useMemo, useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import { MarkdownProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { streamingStyles } from '../styles';
import { LucideChevronDown, LucideChevronUp, LucideLoader, LucideEye } from 'lucide-react';
// Only import SyntaxHighlighter when needed (for completed content)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

// Maximum number of lines to show initially
const MAX_INITIAL_LINES = 10;

// Create a memoized code renderer component to prevent unnecessary re-renders
const CodeRenderer = React.memo(({ 
  node, 
  inline, 
  className, 
  children, 
  syntaxTheme, 
  isStreaming, 
  ...props 
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const [showStreamingContent, setShowStreamingContent] = useState(false);
  
  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);
  
  // Toggle streaming content visibility
  const toggleStreamingContent = useCallback(() => {
    setShowStreamingContent(prev => !prev);
  }, []);
  
  // Format character count for display
  const formatCharCount = useCallback((count: number) => {
    if (count < 1000) return `${count} chars`;
    return `${(count / 1000).toFixed(1)}K chars`;
  }, []);
  
  // Extract language from className
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const content = inline ? String(children) : String(children).replace(/\n$/, '');
  
  // For inline code, just render it directly
  if (inline) {
    return (
      <code {...props} className={`${className} text-[13px] px-1.5 py-0.5 rounded bg-tertiary text-primary`}>
        {children}
      </code>
    );
  }
  
  // For code blocks (not inline), apply truncation
  if (match) {
    // Count the number of lines in the code
    const lineCount = content.split('\n').length;
    const shouldTruncate = lineCount > MAX_INITIAL_LINES;
    
    // Determine what content to display
    let displayContent = content;
    if (isStreaming && showStreamingContent) {
      // Show last 10 lines during streaming if requested
      const lines = content.split('\n');
      displayContent = lines.length > MAX_INITIAL_LINES 
        ? lines.slice(-MAX_INITIAL_LINES).join('\n')
        : content;
    } else if (!isStreaming && shouldTruncate && !expanded) {
      // If not streaming and truncated, show first 10 lines
      displayContent = content.split('\n').slice(0, MAX_INITIAL_LINES).join('\n');
    }
    
    // If streaming, show a placeholder or last 10 lines based on user preference
    if (isStreaming) {
      if (showStreamingContent) {
        // Show last 10 lines during streaming if requested - use simple pre tag for performance
        return (
          <div className="code-block-container">
            <div className="px-4 py-2 text-xs text-tertiary bg-code border-b border-primary flex items-center justify-between rounded-t-lg">
              <span>Showing last {MAX_INITIAL_LINES} lines ({formatCharCount(content.length)} processed)</span>
              <button 
                onClick={toggleStreamingContent}
                className="px-2 py-1 rounded hover:bg-tertiary transition-colors"
              >
                Hide
              </button>
            </div>
            <pre
              className="p-4 m-0 overflow-auto text-sm font-mono rounded-b-lg border border-primary border-t-0"
              style={{
                background: 'var(--bg-code)',
                color: 'var(--text-primary)',
                opacity: 0.8
              }}
            >
              {displayContent}
            </pre>
          </div>
        );
      }
      
      // Streaming placeholder
      return (
        <div className="code-block-container">
          <div 
            className="bg-code border border-primary rounded-lg p-4 my-2 text-tertiary"
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <LucideLoader size={14} className="animate-spin" />
              <span>Generating {language} code... {content.length > 0 && `(${formatCharCount(content.length)})`}</span>
            </div>
            <div className="text-xs opacity-70 mb-3">The complete code will appear here when ready</div>
            <button 
              onClick={toggleStreamingContent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
            >
              <LucideEye size={14} />
              Show last {MAX_INITIAL_LINES} lines
            </button>
          </div>
        </div>
      );
    }
    
    // For completed content, use syntax highlighting
    return (
      <div className="code-block-container">
        <SyntaxHighlighter
          {...props}
          PreTag="div"
          children={displayContent}
          language={language}
          style={syntaxTheme}
          customStyle={{ 
            background: 'var(--bg-code)',
            padding: '1rem',
            margin: '0.5rem 0',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            borderRadius: shouldTruncate && !expanded ? '8px 8px 0 0' : '8px',
            border: '1px solid var(--border-primary)',
            borderBottom: shouldTruncate && !expanded ? 'none' : '1px solid var(--border-primary)'
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: 'var(--text-tertiary)',
            textAlign: 'right',
            userSelect: 'none'
          }}
        />
        {shouldTruncate && (
          <button 
            onClick={toggleExpanded}
            className="w-full py-2 px-4 text-xs flex items-center justify-center gap-1 bg-code border border-primary border-t-0 rounded-b-lg hover:bg-tertiary transition-colors"
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
    );
  }
  
  // Fallback for any other case
  return (
    <code {...props} className={`${className} text-[13px] px-1.5 py-0.5 rounded bg-tertiary text-primary`}>
      {children}
    </code>
  );
});

// Simplified MarkdownRenderer component with performance optimizations
const MarkdownRenderer = React.memo(({ children, isStreaming }: MarkdownProps) => {
  const { syntaxTheme } = useTheme();
  
  // Format character count for display
  const formatCharCount = useCallback((count: number) => {
    if (count < 1000) return `${count} chars`;
    return `${(count / 1000).toFixed(1)}K chars`;
  }, []);
  
  // Skip rendering markdown during streaming if content is very large
  const contentLength = typeof children === 'string' ? children.length : 0;
  const isLargeContent = contentLength > 10000;
  
  // Memoize the components configuration to prevent recreation on each render
  const components = useMemo(() => ({
    code(props: any) {
      return <CodeRenderer {...props} syntaxTheme={syntaxTheme} isStreaming={isStreaming} />;
    }
  }), [syntaxTheme, isStreaming]);
  
  // For very large streaming content, show a simplified view
  if (isStreaming && isLargeContent) {
    return (
      <div className="p-4 border border-primary rounded-lg bg-secondary my-2">
        <div className="flex items-center gap-2 mb-2">
          <LucideLoader size={14} className="animate-spin" />
          <span className="text-tertiary">Processing large content... ({formatCharCount(contentLength)})</span>
        </div>
        <div className="text-xs text-tertiary opacity-70">
          Content will be displayed when complete or smaller in size
        </div>
      </div>
    );
  }

  // Only re-render if the content or streaming state changes
  return (
    <>
      <style>{streamingStyles}</style>
      <Markdown components={components}>
        {children}
      </Markdown>
    </>
  );
});

export default MarkdownRenderer; 