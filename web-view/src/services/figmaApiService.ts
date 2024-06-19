import { FigmaFileInfo, extractFileNodeId, getNodeResponse } from '../util/figma';
import { FileImageResponse, FileNodesResponse, FileImageFillsResponse } from 'figma-js';

export type FigmaApiResponse = { fileInfo: FigmaFileInfo, nodeResponse: FileNodesResponse, nodeImages: FileImageResponse, fileImageFillsResponse: FileImageFillsResponse }

export const getFigmaResponse = async (figmaUrl: string, interMediateResponse: (message) => void):
	Promise<FigmaApiResponse> => {
	let fileInfo = extractFileNodeId(figmaUrl);
	if (!fileInfo.fileId || !fileInfo.nodeID) {
		throw new Error('Invalid figma URL ' + figmaUrl);
	}
	interMediateResponse(`Reading figma file (Fileid: ${fileInfo.fileId}, Nodeid : ${fileInfo.nodeID})...`);
	try {
		let [nodeResponse, nodeImages, fileImageFillsResponse] = await getNodeResponse(fileInfo.fileId, fileInfo.nodeID);
		return { fileInfo, nodeResponse, nodeImages, fileImageFillsResponse };
	} catch (error) {
		throw new Error('Error fetching figma file.');
	}
};
