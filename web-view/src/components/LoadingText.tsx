import React, { useEffect, useState } from 'react';

const secondTimeoutMessages = [
  'Crafting a response...',
  'Searching the knowledge vault...',
];

const thirdTimeoutMessages = [
  'Hold on a sec, brewing some magic...',
  'Just a moment, gathering more info...',
  'This might take a bit longer...',
];

const LoadingText = ({ startTime }) => {
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');

  useEffect(() => {
    const timeout2 = setTimeout(() => {
      setLoadingMessage(secondTimeoutMessages[Math.floor(Math.random() * secondTimeoutMessages.length)]);
    }, 5000); // Update with random message from second set after 5 seconds

    const timeout3 = setTimeout(() => {
      setLoadingMessage(thirdTimeoutMessages[Math.floor(Math.random() * thirdTimeoutMessages.length)]);
    }, 10000); // Update with random message from third set after 10 seconds

    const cleanup = () => {
      // clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };

    // Cleanup function to clear timeouts on unmount
    return cleanup;
  }, [startTime]); // Dependency array ensures effect runs only on initial render

  return (
    <>{loadingMessage}</>
  );
};

export default LoadingText;
