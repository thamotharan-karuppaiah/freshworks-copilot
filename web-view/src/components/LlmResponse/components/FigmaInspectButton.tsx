import React, { memo } from 'react';
import { LucideFileCode } from 'lucide-react';
import { FigmaInspectButtonProps } from '../types';

const FigmaInspectButton = memo(({ onClick }: FigmaInspectButtonProps) => (
  <div className="my-2">
    <button 
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs accent-blue hover:accent-blue-hover" 
      onClick={onClick}
    >
      <LucideFileCode size={16} />
      Inspect
    </button>
  </div>
));

export default FigmaInspectButton; 