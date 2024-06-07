import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="self-start bg-gray-200 text-gray-800 p-4 rounded-lg m-2">
      <p className="mb-2">Welcome to the chat interface! Here are some things you can try:</p>
      <ul className="list-disc list-inside">
        <li>Type a message to ask a question or get help with coding.</li>
        <li>Select a model (e.g., Gemini, Copilot) to get responses from different AI models.</li>
        <li>Enter a Figma URL to convert Figma designs to code.</li>
        <li>Try prompts like "Convert this Figma design to React code" or "Explain this Python function".</li>
      </ul>
    </div>
  );
};

export default EmptyState;
