import React, { useState } from 'react';
import * as figmaJs from 'figma-js';


import { FigspecFrameViewer, FigspecFileViewer } from "@figspec/react";

const FigmaNodeViewer: React.FC<{ fileResponse: figmaJs.FileNodesResponse, image: string }> = ({ fileResponse, image }) => {

	const onNodeSelect = (e: any) => {
		debugger
	}

	return (
		<div style={({zoom:0.3})}>
			<FigspecFrameViewer style={({ height: "600px", "width": '900px' } as any)} apiResponse={fileResponse} renderedImage={image} onNodeSelect={onNodeSelect}></FigspecFrameViewer>
		</div>
	);
};

export default FigmaNodeViewer;
