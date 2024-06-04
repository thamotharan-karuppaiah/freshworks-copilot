import * as vscode from 'vscode';
import { sendRequest, sendCopyCliboardRequest, sendCreateFileRequest, openConfiguration } from './copilot';

export function activate(context: vscode.ExtensionContext) {

	const provider = new FigmaChatViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(FigmaChatViewProvider.viewType, provider));

	context.subscriptions.push(vscode.commands.registerCommand('fmpilot.getConfiguration', () => {
		const config = vscode.workspace.getConfiguration('fmCopilot');
		return config;
	}));

	context.subscriptions.push(vscode.commands.registerCommand('fmpilot.copilotRequest', async (data) => {
		let meesage = '';
		try {
			meesage = await sendRequest(data.prompt, data.history);
		} catch {
			meesage = 'Unable to process';
		}
		return meesage;
	}));
}

class FigmaChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'fmpilot.chat';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public async resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'web-view', 'build')
			]
		};
		let indexPath = vscode.Uri.joinPath(this._extensionUri, 'web-view', 'build', 'index.html');
		let html = (await vscode.workspace.fs.readFile(indexPath)).toString();;
		let path = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'web-view', 'build', 'static'));
		html = html.replace(/\/static\//g, path + '/');
		webviewView.webview.html = html;
		webviewView.webview.options.enableCommandUris

		// webviewView.webview.html =  this.getWebviewContent(webviewView.webview);//  //  this._getHtmlForWebview(webviewView.webview);// 

		webviewView.webview.onDidReceiveMessage(async data => {
			switch (data.command) {
				// case 'copilotRequest':
				// 	{
				// 		let meesage = '';
				// 		try {
				// 			meesage = await sendRequest(data.prompt, data.history);
				// 		} catch {
				// 			meesage = 'Unable to process';
				// 		}
				// 		webviewView.webview.postMessage({ command: 'copilotResponse', response: meesage });
				// 		break;
				// 	}
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
						webviewView.webview.postMessage({ ...data, result });
						break;
					}
			}
		});
	}

	// public addColor() {
	// 	if (this._view) {
	// 		this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
	// 		this._view.webview.postMessage({ type: 'addColor' });
	// 	}
	// }

	// public clearColors() {
	// 	if (this._view) {
	// 		this._view.webview.postMessage({ type: 'clearColors' });
	// 	}
	// }

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		let actualURI = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
		const scriptUri = webview.asWebviewUri(actualURI);

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();
		// <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
		// nonce="${nonce}"
		let a = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
			

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>

				<button class="add-color-button">Add Color</button>

				<script  src="${scriptUri}"></script>
			</body>
			</html>`;
		return a;
	}

	private getWebviewContent(webview: vscode.Webview) {
		let path = vscode.Uri.joinPath(this._extensionUri, 'out', 'web-view', 'sidebar-view.js');
		let scriptUri = webview.asWebviewUri(path);
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'web-view', 'main.css'));
		// const scriptUri = vscode.Uri.file(path);
		// Use a nonce to only allow a specific script to be run.
		// const nonce = getNonce();
		let a = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>React Panel</title>
			<link href="${styleMainUri}" rel="stylesheet">
        </head>
        <body>
			HelloWorld
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
		return a;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}


