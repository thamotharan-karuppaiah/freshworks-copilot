import React, { memo } from 'react';
import { FollowupSuggestionsProps } from '../types';

const FollowupSuggestions = memo(({ followups }: FollowupSuggestionsProps) => {
  if (!followups || followups.length === 0) return null;
  
  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-tertiary mb-2">Follow-up questions</div>
      <div className="flex flex-wrap gap-2">
        {followups.map((suggestion, idx) => (
          <button
            key={idx}
            className="px-3 py-1.5 rounded-lg text-xs bg-tertiary text-secondary hover:text-primary transition-colors"
            onClick={() => {
              // Use sendMessage function from the window object
              const sendMessage = (window as any).sendMessage;
              if (typeof sendMessage === 'function') {
                sendMessage(suggestion);
              } else {
                console.log("Cannot send followup, sendMessage function not available");
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(suggestion)
                  .then(() => {
                    console.log('Suggestion copied to clipboard:', suggestion);
                    alert('The message has been copied to clipboard as the send function is not available.');
                  })
                  .catch(err => {
                    console.error('Could not copy suggestion:', err);
                  });
              }
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
});

export default FollowupSuggestions; 