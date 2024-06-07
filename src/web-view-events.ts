import * as vscode from 'vscode';
import { openConfiguration, sendCopyCliboardRequest, sendCreateFileRequest } from './copilot';
let chatWebView: vscode.Webview;
export function registerWebViewEvents(webview: vscode.Webview) {
	chatWebView = webview;
	webview.onDidReceiveMessage(async data => {
		switch (data.command) {
			case 'copyClipboard':
				{
					sendCopyCliboardRequest(data.text);
					break;
				}
			case 'createFile':
				{
					sendCreateFileRequest(data.fileName, data.text);
					break;
				}
			case 'openConfiguration':
				{
					openConfiguration(data.key);
					break;
				}
			case "executeAnyCommand":
				{
					let result = await vscode.commands.executeCommand(data.vsCommand, ...(data.args || []));
					webview.postMessage({ ...data, result });
					break;
				}
		}
	});
}

export function registerFigmaWebViewEvents(webview: vscode.Webview, fileResponse: any, image: any) {
	webview.onDidReceiveMessage(async data => {
		switch (data.command) {
			case 'figmaDataRequest':
				{
					webview.postMessage({ ...data, fileResponse: fileResponse, image: image });
					break;
				}

			case 'figmaNodeSelected':
				{
					chatWebView?.postMessage({ command: 'figmaNodeSelected', selectedNode: data.selectedNode, fileResponse: fileResponse, image: image });
					const selectedNode = data.selectedNode;
					break;
				}
		}
	});
}