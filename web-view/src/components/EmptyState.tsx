import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 mt-8">
      <div className="w-12 h-12 mb-4 rounded-full bg-[var(--vscode-activityBarBadge-background)] flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--vscode-activityBarBadge-foreground)]">
          <path d="M8 12H16M8 8H16M8 16H13M19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-base font-medium mb-2">Start a New Conversation</h3>
      <p className="text-sm text-[var(--vscode-descriptionForeground)] max-w-sm">
        Type your message above to begin. You can ask questions about your code, request explanations, or get help with development tasks.
      </p>
    </div>
  );
};

export default EmptyState;
