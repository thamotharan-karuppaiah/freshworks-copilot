import { VsCommands } from "../constants";
import useVsCodeMessageStore from "../store/vsCodeMessageStore";
type VsCodeMessageCommand = 'copilotResponse';

type VsCodeMessage = {
	command: VsCodeMessageCommand;
	response: never;
};

let vsCode = window.acquireVsCodeApi?.()

window.addEventListener('message', event => {
	let eventData = event.data as VsCodeMessage;
	if (!eventData?.command) {
		return;
	}
	useVsCodeMessageStore.setState({ message: eventData });
});


export function sendCopilotPromptRequest(prompt: string, history) {
	vsCode.postMessage({ command: 'copilotRequest', prompt: prompt, history })
}

export function sendFigmaDataRequest(id) {
	vsCode.postMessage({ command: 'figmaDataRequest', id });
}

export function sendNodeSelectedEvent(selectedNode, fileImageFillsResponse) {
	vsCode.postMessage({ command: 'figmaNodeSelected', selectedNode, fileImageFillsResponse });
}


export function sendCopyCliboardRequest(text) {
	vsCode.postMessage({ command: 'copyClipboard', text: text })
}

export function sendCreateFileRequest(fileName, text) {
	vsCode.postMessage({ command: 'createFile', text: text, fileName: fileName })
}

export function sendCreateFilesRequest(files) {
	vsCode.postMessage({ command: 'createFiles', files })
}

export function openConfiguration(key) {
	vsCode?.postMessage({ command: 'openConfiguration', key: key })
}

export function getState(key) {
	return (vsCode?.getState() as any)?.fwCopilot?.[key];
}

export async function executeAnyCommand(vsCommand: VsCommands, ...args: any[]) {
	return await new Promise((resolve, reject) => {
		let id = Math.random();
		vsCode?.postMessage({ command: 'executeAnyCommand', vsCommand: vsCommand, args, id });
		let eventListener = event => {
			let eventData = event.data;
			if (eventData.id === id) {
				resolve(eventData.result);
			}
			window.removeEventListener('message', eventListener);
		}
		window.addEventListener('message', eventListener);
	});
}

export async function getConfiguration(key, skipOpeningSettings?): Promise<string> {
	let API_KEY = '';
	if (window.acquireVsCodeApi) {
		const configuration = await executeAnyCommand(VsCommands.getConfiguration) as any;
		API_KEY = configuration[key];
	}
	else {
		API_KEY = localStorage.getItem(key);
	}
	if (!API_KEY && !skipOpeningSettings) {
		openConfiguration(key);
		throw new Error('API key not found. Configure it with vscode editor settings.');
	}
	return API_KEY;
}