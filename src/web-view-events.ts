import * as vscode from 'vscode';
import { openConfiguration, sendCopyCliboardRequest, sendCreateFileRequest } from './copilot';
import fetch from 'node-fetch';

let chatWebView: vscode.Webview;

async function ensureWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		const selected = await vscode.window.showErrorMessage(
			'No workspace folder is opened. Please open a workspace folder first.',
			'Open Folder'
		);
		if (selected === 'Open Folder') {
			await vscode.commands.executeCommand('vscode.openFolder');
		}
		return undefined;
	}
	return vscode.workspace.workspaceFolders[0];
}

async function createFileInWorkspace(fileName: string, content: string, skipDialog: boolean = false, openFile: boolean = true): Promise<void> {
	const workspaceFolder = await ensureWorkspaceFolder();
	if (!workspaceFolder) return;

	const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
	
	try {
		// Check if file exists
		try {
			await vscode.workspace.fs.stat(filePath);
			if (!skipDialog) {
				const overwrite = await vscode.window.showWarningMessage(
					`File ${fileName} already exists. Do you want to overwrite it?`,
					'Yes',
					'No'
				);
				if (overwrite !== 'Yes') {
					return;
				}
			}
		} catch (err) {
			// File doesn't exist, which is fine
		}

		// Create directory if it doesn't exist
		const dirPath = vscode.Uri.joinPath(filePath, '..');
		try {
			await vscode.workspace.fs.createDirectory(dirPath);
		} catch (err) {
			// Directory might already exist, which is fine
		}

		// Write file content
		await vscode.workspace.fs.writeFile(
			filePath,
			Buffer.from(content, 'utf8')
		);

		// Open the file in editor if requested
		if (openFile) {
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document, { preview: false });
		}

	} catch (error: any) {
		throw new Error(`Failed to create file ${fileName}: ${error?.message || 'Unknown error'}`);
	}
}

async function openAllFiles(files: { fileName: string }[]) {
	const workspaceFolder = await ensureWorkspaceFolder();
	if (!workspaceFolder) return;

	// Open all files in editor
	for (const file of files) {
		const filePath = vscode.Uri.joinPath(workspaceFolder.uri, file.fileName);
		const document = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(document, { preview: false });
	}

	// Focus the first file
	if (files.length > 0) {
		const firstFilePath = vscode.Uri.joinPath(workspaceFolder.uri, files[0].fileName);
		const document = await vscode.workspace.openTextDocument(firstFilePath);
		await vscode.window.showTextDocument(document, { preview: false });
	}
}

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
					try {
						await createFileInWorkspace(data.fileName, data.text, false, true);
						vscode.window.showInformationMessage(`File ${data.fileName} created successfully`);
					} catch (error: any) {
						vscode.window.showErrorMessage(error.message);
					}
					break;
				}
			case 'createFiles':
				{
					try {
						const results = await Promise.allSettled(
							(data.files as { fileName: string, content: string }[])
								.map(file => createFileInWorkspace(file.fileName, file.content, true, false))
						);

						// Count successes and failures
						const succeeded = results.filter(r => r.status === 'fulfilled').length;
						const failed = results.filter(r => r.status === 'rejected').length;

						if (failed === 0) {
							vscode.window.showInformationMessage(`Successfully created ${succeeded} files`);
							// Open all successfully created files
							await openAllFiles(data.files);
						} else {
							vscode.window.showWarningMessage(
								`Created ${succeeded} files, ${failed} files failed to create. Check the developer console for details.`
							);
							// Log failures to console
							results.forEach((result, index) => {
								if (result.status === 'rejected') {
									console.error(`Failed to create file ${data.files[index].fileName}:`, result.reason);
								}
							});
							// Open the successfully created files
							const successfulFiles = data.files.filter((_: { fileName: string, content: string }, index: number) => 
								results[index].status === 'fulfilled'
							);
							await openAllFiles(successfulFiles);
						}
					} catch (error: any) {
						vscode.window.showErrorMessage(`Error creating files: ${error.message}`);
					}
					break;
				}
			case 'openConfiguration':
				{
					openConfiguration(data.key);
					break;
				}
			case "executeAnyCommand":
				{
					const result = await vscode.commands.executeCommand(data.vsCommand, ...(data.args || []));
					webview.postMessage({ ...data, result });
					break;
				}
			case 'cloudverseRequest':
				{
					try {
						console.log('Making request to:', data.data.url);
						console.log('Request headers:', data.data.headers);
						console.log('Request body:', data.data.data);

						const response = await fetch(data.data.url, {
							method: 'POST',
							headers: {
								...data.data.headers,
								'User-Agent': 'Node.js',
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(data.data.data)
						});

						if (!response.ok) {
							const errorBody = await response.text();
							console.error('Server error response:', {
								status: response.status,
								statusText: response.statusText,
								headers: response.headers,
								body: errorBody
							});
							throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
						}

						// Get the response as text
						const text = await response.text();
						console.log('Received response:', text.substring(0, 200) + '...'); // Log first 200 chars

						// Split by newlines but preserve empty lines
						const lines = text.split(/(\r\n|\n|\r)/);
						
						// Send each chunk with preserved line breaks
						for (const line of lines) {
							if (line.trim() || line.match(/(\r\n|\n|\r)/)) {  // Send if line has content or is a line break
								webview.postMessage({
									command: 'cloudverseResponse',
									data: line
								});
							}
						}

						// Signal completion
						webview.postMessage({
							command: 'cloudverseResponse',
							done: true
						});

					} catch (error) {
						console.error('Error in cloudverse request:', error);
						const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
						webview.postMessage({
							command: 'cloudverseResponse',
							error: errorMessage
						});
					}
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