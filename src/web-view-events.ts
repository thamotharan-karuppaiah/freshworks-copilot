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
					await sendCreateFileRequest(data.fileName, data.text);

					vscode.window.showInformationMessage('File created');
					break;
				}
			case 'createFiles':
				{
					(data.files as { fileName: string, content: string }[]).forEach(async file => {
						await sendCreateFileRequest(file.fileName, file.content, true);
					});

					vscode.window.showInformationMessage('Files created');
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

export function registerFigmaWebViewEvents(webview: vscode.Webview, fileResponse: any, image: any, fileImageFillsResponse: any) {
	webview.onDidReceiveMessage(async data => {
		switch (data.command) {
			case 'figmaDataRequest':
				{
					webview.postMessage({ ...data, fileResponse: fileResponse, image: image, fileImageFillsResponse });
					break;
				}

			case 'figmaNodeSelected':
				{
					chatWebView?.postMessage({ command: 'figmaNodeSelected', selectedNode: data.selectedNode, fileResponse: fileResponse, image: image, fileImageFillsResponse });
					const selectedNode = data.selectedNode;
					break;
				}
		}
	});
}