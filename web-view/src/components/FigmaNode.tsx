import React from 'react';
import * as figmaJs from 'figma-js';
import { FwIcon } from "@freshworks/crayons/react";
import { FigspecFrameViewer } from "@figspec/react";
import { executeAnyCommand } from '../services/vsCodeService';
import { VsCommands } from '../constants';

const FigmaNodeViewer: React.FC<{ fileResponse: figmaJs.FileNodesResponse, image: string, fileImageFillsResponse: figmaJs.FileImageFillsResponse }> = ({ fileResponse, image, fileImageFillsResponse }) => {
	const onNodeSelect = (e: any) => {
		debugger;
	};

	const inspect = () => {
		executeAnyCommand(VsCommands.figmaInspect, { fileResponse: fileResponse, image: image, fileImageFillsResponse });
	};

	return (
		<div className="mt-3 overflow-hidden rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
			<div className="flex items-center justify-between px-3 py-2 bg-[var(--vscode-editor-background)] border-b border-[var(--vscode-panel-border)]">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded bg-[var(--vscode-badge-background)] flex items-center justify-center">
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--vscode-badge-foreground)]">
							<path d="M8 1.5C6.27609 1.5 4.62279 2.18482 3.40381 3.40381C2.18482 4.62279 1.5 6.27609 1.5 8C1.5 9.72391 2.18482 11.3772 3.40381 12.5962C4.62279 13.8152 6.27609 14.5 8 14.5C9.72391 14.5 11.3772 13.8152 12.5962 12.5962C13.8152 11.3772 14.5 9.72391 14.5 8C14.5 6.27609 13.8152 4.62279 12.5962 3.40381C11.3772 2.18482 9.72391 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5"/>
							<path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
						</svg>
					</div>
					<span className="text-xs font-medium text-[var(--vscode-editor-foreground)]">{fileResponse.name}</span>
				</div>
				<button
					onClick={inspect}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
				>
					<FwIcon name="visible" size={12} />
					<span>Inspect</span>
				</button>
			</div>
			<div className="p-3">
				<div className="relative aspect-video w-full overflow-hidden rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
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
