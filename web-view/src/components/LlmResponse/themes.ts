import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom syntax highlighting themes
export const darkTheme = {
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    color: '#E5E7EB',
    background: 'transparent',
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0D0D0D',
  },
  comment: {
    color: '#6B7280',
    fontStyle: 'italic'
  },
  punctuation: {
    color: '#94A3B8'
  },
  property: {
    color: '#93C5FD'
  },
  string: {
    color: '#86EFAC'
  },
  keyword: {
    color: '#C084FC'
  },
  function: {
    color: '#93C5FD'
  },
  'class-name': {
    color: '#FDE047'
  },
  variable: {
    color: '#FDA4AF'
  },
  operator: {
    color: '#94A3B8'
  },
  number: {
    color: '#F87171'
  }
};

export const lightTheme = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    color: '#111827',
    background: 'transparent',
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: '#F9FAFB',
  },
  comment: {
    color: '#6B7280',
    fontStyle: 'italic'
  },
  punctuation: {
    color: '#64748B'
  },
  property: {
    color: '#2563EB'
  },
  string: {
    color: '#059669'
  },
  keyword: {
    color: '#7C3AED'
  },
  function: {
    color: '#2563EB'
  },
  'class-name': {
    color: '#CA8A04'
  },
  variable: {
    color: '#DC2626'
  },
  operator: {
    color: '#64748B'
  },
  number: {
    color: '#DC2626'
  }
}; 