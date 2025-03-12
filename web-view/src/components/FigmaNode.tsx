import React from 'react';
import * as figmaJs from 'figma-js';
import { FwIcon } from "@freshworks/crayons/react";
import { FigspecFrameViewer } from "@figspec/react";
import { executeAnyCommand } from '../services/vsCodeService';
import { VsCommands } from '../constants';
import useThemeStore from '../store/theme-store';
import { LucideFileText, LucideX, LucideMaximize2 } from 'lucide-react';

const FigmaNodeViewer: React.FC<{ fileResponse: figmaJs.FileNodesResponse, image: string, fileImageFillsResponse: figmaJs.FileImageFillsResponse }> = ({ fileResponse, image, fileImageFillsResponse }) => {
	const { theme } = useThemeStore();
	
	const onNodeSelect = (e: any) => {
		debugger;
	};

	const inspect = () => {
		executeAnyCommand(VsCommands.figmaInspect, { fileResponse: fileResponse, image: image, fileImageFillsResponse });
	};

	return (
		<div className={`mt-3 overflow-hidden rounded border ${
			theme === 'dark' 
				? 'border-[#27272A] bg-[#18181B]' 
				: 'border-gray-200 bg-gray-50'
		}`}>
			<div className={`flex items-center justify-between px-3 py-2 border-b ${
				theme === 'dark'
					? 'bg-[#18181B] border-[#27272A]'
					: 'bg-gray-50 border-gray-200'
			}`}>
				<div className="flex items-center gap-2">
					<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
						theme === 'dark'
							? 'bg-gradient-to-br from-[#18181B] to-[#27272A] text-gray-100'
							: 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
					}`}>
						<LucideFileText size={20} />
					</div>
					<div>
						<div className={`text-sm font-medium ${
							theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
						}`}>{fileResponse.name}</div>
						<div className="text-xs text-gray-400">Figma File</div>
					</div>
					<button 
						className={`ml-auto p-2 rounded-lg transition-colors ${
							theme === 'dark'
								? 'text-gray-400 hover:text-gray-200 hover:bg-[#27272A]'
								: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
						}`}
						onClick={inspect}
						title="Inspect in Figma"
					>
						<LucideMaximize2 size={16} />
					</button>
				</div>
			</div>
			<div className="p-3">
				<div className={`relative aspect-video w-full overflow-hidden rounded border ${
					theme === 'dark'
						? 'border-[#27272A] bg-[#18181B]'
						: 'border-gray-200 bg-gray-50'
				}`}>
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
