import * as figmaJs from 'figma-js';
import { executeAnyCommand, getConfiguration, openConfiguration } from '../services/vsCodeService';
import { VsCommands } from '../constants';

export type FigmaFileInfo = { fileId: string, nodeID: string }

export function checktextHasFigmaUrl(text: string): boolean {
	const pattern = /figma\.com\/.+?\/([a-zA-Z0-9]+).+?node-id=([0-9]+-[0-9]+)/;
	return pattern.test(text);

}

export function extractFileNodeId(url: string): FigmaFileInfo | null {
	// Define regex pattern for fileid and nodeid
	const pattern = /figma\.com\/.+?\/([a-zA-Z0-9]+).+?node-id=([0-9]+-[0-9]+)/;

	// Search for matches
	const match = url.match(pattern);

	if (match) {
		const fileId = match[1];
		const nodeID = match[2];
		return { fileId, nodeID };
	} else {
		return { fileId: '', nodeID: '' };
	}
}

const getClient = async () => {
	let figmaPersonalToken = await getConfiguration('figmaPersonalToken');
	let client = figmaJs.Client({ personalAccessToken: figmaPersonalToken });
	return client;
}


export async function getNodeResponse(fileId: string, nodeId: string): Promise<[figmaJs.FileNodesResponse, figmaJs.FileImageResponse, figmaJs.FileImageFillsResponse]> {
	let client = await getClient();
	const nodeResponse = client.fileNodes(fileId, { ids: [nodeId] })
		.then((response) => {
			return response.data;
		})
		.catch((error) => {
			return error;
		});

	let nodeImages = client.fileImages(fileId, { ids: [nodeId] }).then((response) => {
		return response.data;
	})
		.catch((error) => {
			return error;
		});;

	let externalImages = client.fileImageFills(fileId).then((response) => {
		return response.data;
	})
		.catch((error) => {
			return error;
		});;
	return [await nodeResponse, await nodeImages, await externalImages]
}

