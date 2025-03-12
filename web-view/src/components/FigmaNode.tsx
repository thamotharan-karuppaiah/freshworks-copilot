import React from 'react';
import * as figmaJs from 'figma-js';
import { FwIcon } from "@freshworks/crayons/react";
import { FigspecFrameViewer } from "@figspec/react";
import { executeAnyCommand } from '../services/vsCodeService';
import { VsCommands } from '../constants';
import { LucideFileText, LucideX, LucideMaximize2 } from 'lucide-react';

const FigmaNodeViewer: React.FC<{ fileResponse: figmaJs.FileNodesResponse, image: string, fileImageFillsResponse: figmaJs.FileImageFillsResponse }> = ({ fileResponse, image, fileImageFillsResponse }) => {
	
	const onNodeSelect = (e: any) => {
		debugger;
	};

	const inspect = () => {
		executeAnyCommand(VsCommands.figmaInspect, { fileResponse: fileResponse, image: image, fileImageFillsResponse });
	};

	return (
		<div className="mt-3 overflow-hidden rounded border border-primary bg-secondary">
			<div className="flex items-center justify-between px-3 py-2 border-b border-primary bg-secondary">
				<div className="flex items-center gap-2">
					<div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-secondary to-tertiary text-secondary">
						<LucideFileText size={20} />
					</div>
					<div>
						<div className="text-sm font-medium text-primary">{fileResponse.name}</div>
						<div className="text-xs text-tertiary">Figma File</div>
					</div>
					<button 
						className="ml-auto p-2 rounded-lg transition-colors text-secondary hover:text-primary hover:bg-tertiary"
						onClick={inspect}
						title="Inspect in Figma"
					>
						<LucideMaximize2 size={16} />
					</button>
				</div>
			</div>
			<div className="p-3">
				<div className="relative aspect-video w-full overflow-hidden rounded border border-primary bg-secondary">
					<img
						src={image}
						alt={fileResponse.name}
						className="w-full h-full object-contain"
					/>
				</div>
			</div>
		</div>
	);
};

export default FigmaNodeViewer;
