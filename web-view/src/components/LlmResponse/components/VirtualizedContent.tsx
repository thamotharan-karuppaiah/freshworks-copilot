import React, { useEffect, useRef, useState } from 'react';

interface VirtualizedContentProps {
  children: React.ReactNode;
  isVisible?: boolean;
  preRenderPixels?: number;
}

/**
 * A component that only renders its children when they are visible in the viewport
 * This helps improve performance by not rendering content that is off-screen
 */
const VirtualizedContent: React.FC<VirtualizedContentProps> = ({ 
  children, 
  isVisible = false,
  preRenderPixels = 1000 
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // If already visible or explicitly set to visible, no need for intersection observer
    if (shouldRender || isVisible) {
      setShouldRender(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Render when the element is about to become visible
        if (entry.isIntersecting) {
          setShouldRender(true);
          // Once rendered, we can disconnect the observer
          observer.disconnect();
        }
      },
      {
        // Start rendering when element is within 1000px of viewport
        rootMargin: `${preRenderPixels}px`,
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [shouldRender, isVisible, preRenderPixels]);
  
  // Always render a placeholder div to measure
  return (
    <div ref={ref} style={{ minHeight: shouldRender ? 'auto' : '20px' }}>
      {shouldRender ? children : null}
    </div>
  );
};

export default VirtualizedContent; 