
import * as vscode from 'vscode';

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'copilot-gpt-4' };
// const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-3.5-turbo' };

export const sendRequest = async (prompt: string, history: {
	sender: 'user' | 'bot';
	text: string;
}[] = []) => {
	const messages = [
		...history.map(({ sender, text }) => sender === 'bot'
			? vscode.LanguageModelChatMessage.Assistant(text) : vscode.LanguageModelChatMessage.User(text))
	];
	const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
	const chatResponse = await model.sendRequest(messages, {

	});
	let result = '';
	for await (const value of chatResponse.text) {
		result += value;
	}
	return result;
}


export const sendCopyCliboardRequest = async (text: string) => {
	await vscode.env.clipboard.writeText(text);
	// show alert 
	vscode.window.showInformationMessage('Text copied to clipboard');
}

export const sendCreateFileRequest = async (fileName: string, text: string, saveAutomatically = false) => {
	// find the base path the workspace
	let appSrc = vscode.workspace.workspaceFolders?.[0]?.uri as vscode.Uri;
	let targetFilePath: vscode.Uri;
	if (appSrc) {
		targetFilePath = vscode.Uri.joinPath(appSrc, `${fileName}`);
	}
	else {
		targetFilePath = vscode.Uri.parse(`${fileName}`);
		vscode.window.showErrorMessage('No workspace found');
	}

	const targetFileUri = targetFilePath;
	let document;

	// Check if file exists
	try {
		await vscode.workspace.fs.stat(targetFileUri);
		document = await vscode.workspace.openTextDocument(targetFileUri);
	} catch {
		// If file does not exist, create it
		await vscode.workspace.fs.writeFile(targetFileUri, new TextEncoder().encode(''));
		document = await vscode.workspace.openTextDocument(targetFileUri);
	}

	const editor = await vscode.window.showTextDocument(document);
	await editor.edit(editBuilder => {
		editBuilder.insert(new vscode.Position(0, 0), text);
	});

	// Save the file
	if (saveAutomatically) {
		await document.save();
	}
}


export const openConfiguration = async (key: string) => {
	await vscode.commands.executeCommand('workbench.action.openSettings', `fwCopilot.${key}`);
}