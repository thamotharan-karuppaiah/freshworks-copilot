import React, { useState } from 'react';
import * as figmaJs from 'figma-js';
import { FwIcon } from "@freshworks/crayons/react";

import { FigspecFrameViewer, FigspecFileViewer } from "@figspec/react";
import { executeAnyCommand } from '../services/vsCodeService';
import { VsCommands } from '../constants';

const FigmaNodeViewer: React.FC<{ fileResponse: figmaJs.FileNodesResponse, image: string }> = ({ fileResponse, image }) => {

	const onNodeSelect = (e: any) => {
		debugger
	}

	const Inppect = () => {
		executeAnyCommand(VsCommands.figmaInspect, { fileResponse: fileResponse, image: image });
	}

	return (<div className="mt-2">
		<div className="mt-2">
			<div className='flex items-center mt-[8px] bg-gray-800 text-gray-300 text-xs p-[4px] rounded-t-[4px]'>{fileResponse.name}
				<FwIcon name="visible"></FwIcon> <a className='flex item-center  ml-auto cursor-pointer font-medium' onClick={() => Inppect()}>Inspect</a>
			</div>
			<div className="p-2 bg-gray-100 text-xs min-w-[300px] max-w-[100%] h-[200px]">
				<img className='max-w-[100%] max-h-[100%]' src={image}></img>
			</div>
		</div>
	</div>
	);
	return (
		<div style={({ zoom: 0.3 })}>
			<FigspecFrameViewer style={({ height: "600px", "width": '900px' } as any)} apiResponse={fileResponse} renderedImage={image} onNodeSelect={onNodeSelect}></FigspecFrameViewer>
		</div>
	);
};

export default FigmaNodeViewer;
