import * as vscode from 'vscode';
import { openConfiguration, sendCopyCliboardRequest, sendCreateFileRequest } from './copilot';
import * as https from 'https';

let chatWebView: vscode.Webview;
// Buffer for collecting streaming data
let streamBuffer = '';
let lastSendTime = 0;
// Minimum time between updates (ms)
const MIN_UPDATE_INTERVAL = 300;
// Maximum buffer size before forcing an update
const MAX_BUFFER_SIZE = 10000;
// Track total characters processed
let totalCharsProcessed = 0;

// Format character count for display
function formatCharCount(count: number): string {
	if (count < 1000) return `${count} chars`;
	return `${(count / 1000).toFixed(1)}K chars`;
}

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

// Function to send buffered data to webview with throttling
function sendBufferedDataToWebview() {
	if (!streamBuffer || !chatWebView) return;
	
	const now = Date.now();
	if (now - lastSendTime < MIN_UPDATE_INTERVAL && streamBuffer.length < MAX_BUFFER_SIZE) {
		// Schedule sending later if not enough time has passed and buffer isn't too large
		return;
	}
	
	// Send the buffered data
	chatWebView.postMessage({
		command: 'cloudverseResponse',
		data: streamBuffer
	});
	
	// Reset buffer and update timestamp
	streamBuffer = '';
	lastSendTime = now;
}

async function makeHttpRequest(url: string, options: any, data: any): Promise<string> {
	// Reset buffer and character count at the start of a new request
	streamBuffer = '';
	lastSendTime = 0;
	totalCharsProcessed = 0;
	
	// Show initial status message
	vscode.window.setStatusBarMessage(`Generating response...`);
	
	return new Promise((resolve, reject) => {
		const req = https.request(url, options, (res) => {
			let responseData = '';
			
			res.on('data', (chunk) => {
				responseData += chunk;
				const chunkStr = chunk.toString();
				totalCharsProcessed += chunkStr.length;
				
				// Update status bar with character count
				vscode.window.setStatusBarMessage(`Generating response... (${formatCharCount(totalCharsProcessed)})`);
				
				// Add to buffer instead of sending immediately
				if (chatWebView) {
					streamBuffer += chunkStr;
					sendBufferedDataToWebview();
					
					// Set up a timer to ensure data gets sent even if chunks stop coming
					setTimeout(sendBufferedDataToWebview, MIN_UPDATE_INTERVAL);
				}
			});

			res.on('end', () => {
				// Send any remaining buffered data
				if (streamBuffer && chatWebView) {
					chatWebView.postMessage({
						command: 'cloudverseResponse',
						data: streamBuffer
					});
					streamBuffer = '';
				}
				
				// Clear status bar message
				vscode.window.setStatusBarMessage(`Response complete (${formatCharCount(totalCharsProcessed)})`, 3000);
				
				if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
					reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${responseData}`));
				} else {
					resolve(responseData);
				}
			});
		});

		req.on('error', (error) => {
			vscode.window.setStatusBarMessage('');
			reject(error);
		});

		if (data) {
			req.write(JSON.stringify(data));
		}
		req.end();
	});
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

						const options = {
							method: 'POST',
							headers: {
								...data.data.headers,
								'Content-Type': 'application/json',
							}
						};

						await makeHttpRequest(data.data.url, options, data.data.data);

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