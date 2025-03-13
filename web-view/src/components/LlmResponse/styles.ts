export const streamingStyles = `
.streaming-code-block {
  transition: background-color 0.3s ease;
}

.streaming-code-block > code {
  opacity: 0.9;
  transition: opacity 0.3s ease;
}

.streaming-code-block span {
  transition: color 0.2s ease;
}
`;

export const proseStyles = `
.prose p {
  margin: 0.5rem 0;
  line-height: 1.5;
  color: var(--text-primary);
}
.prose ul, .prose ol {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  color: var(--text-primary);
}
.prose li {
  margin: 0.25rem 0;
  padding-left: 0.25rem;
}
.prose h1, .prose h2, .prose h3, .prose h4 {
  margin: 1rem 0 0.5rem 0;
  line-height: 1.3;
  color: var(--text-primary);
  font-weight: 600;
}
.prose pre {
  margin: 0.75rem 0;
  background: var(--bg-code);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}
.prose code {
  font-size: 0.875rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.prose pre code {
  background: transparent;
  padding: 0;
  color: var(--text-primary);
  border: none;
  font-size: 0.875rem;
  line-height: 1.5;
}
.prose > *:first-child {
  margin-top: 0;
}
.prose > *:last-child {
  margin-bottom: 0;
}
`; 