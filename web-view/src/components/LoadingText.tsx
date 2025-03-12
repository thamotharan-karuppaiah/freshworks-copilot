import React, { useEffect, useState } from 'react';

const secondTimeoutMessages = [
  'Analyzing context...',
  'Processing request...',
  'Gathering information...',
];

const thirdTimeoutMessages = [
  'Generating detailed response...',
  'Finalizing solution...',
  'Almost there...',
  'Polishing response...',
];

const LoadingText: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Dots animation
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // Message updates
    const timeout2 = setTimeout(() => {
      setLoadingMessage(secondTimeoutMessages[Math.floor(Math.random() * secondTimeoutMessages.length)]);
    }, 5000);

    const timeout3 = setTimeout(() => {
      setLoadingMessage(thirdTimeoutMessages[Math.floor(Math.random() * thirdTimeoutMessages.length)]);
    }, 10000);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded">
      <div className="relative w-3 h-3">
        <div className="absolute inset-0 border border-accent rounded-full animate-spin"></div>
      </div>
      <span className="text-xs text-primary">
        {loadingMessage}{dots}
      </span>
    </div>
  );
};

export default LoadingText;
