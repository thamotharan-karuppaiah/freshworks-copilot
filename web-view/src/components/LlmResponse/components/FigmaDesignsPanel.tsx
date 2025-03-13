import React, { memo } from 'react';
import { LucideX } from 'lucide-react';
import { FigmaDesignsPanelProps } from '../types';

const FigmaDesignsPanel = memo(({ designs, onSelect, onClose }: FigmaDesignsPanelProps) => {
  if (designs.length === 0) return null;
  
  return (
    <div className="mt-4 p-3 bg-secondary border border-primary rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-primary">Select a Figma design to inspect</div>
        <button 
          className="p-1 hover:bg-tertiary text-secondary hover:text-primary rounded transition-colors"
          onClick={onClose}
        >
          <LucideX size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {designs.map((design, index) => (
          <button 
            key={index}
            className="px-3 py-2 text-sm text-left bg-tertiary hover:bg-accent hover:text-inverted text-secondary rounded transition-colors"
            onClick={() => {
              onSelect(design);
              onClose();
            }}
          >
            Figma Design {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
});

export default FigmaDesignsPanel; 