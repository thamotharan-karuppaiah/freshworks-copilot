import * as vscode from 'vscode';
import { sendRequest, sendCopyCliboardRequest, sendCreateFileRequest, openConfiguration } from './copilot';
import { loadChatView, openFigmaInspectorView } from './web-view';
import { registerFigmaWebViewEvents, registerWebViewEvents } from './web-view-events';

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

	context.subscriptions.push(vscode.commands.registerCommand('figma.inspect', async (data: { fileResponse: any, image: any }) => {
		const panel = vscode.window.createWebviewPanel(
			'figmaInspector',
			'Figma Inspector: ' + data.fileResponse.name,
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);
		openFigmaInspectorView(panel.webview, context.extensionUri);
		panel.reveal(vscode.ViewColumn.Active);
		registerFigmaWebViewEvents(panel.webview, data.fileResponse, data.image);
	}))
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
				vscode.Uri.joinPath(this._extensionUri, 'out', 'web-view')
			]
		};
		loadChatView(webviewView.webview, this._extensionUri);
		// let indexPath = vscode.Uri.joinPath(this._extensionUri, 'web-view', 'build', 'index.html');
		// let html = (await vscode.workspace.fs.readFile(indexPath)).toString();;
		// let path = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'web-view', 'build', 'static'));
		// html = html.replace(/\/static\//g, path + '/');
		// webviewView.webview.html = html;

		// webviewView.webview.html =  this.getWebviewContent(webviewView.webview);//  //  this._getHtmlForWebview(webviewView.webview);// 

		registerWebViewEvents(webviewView.webview);
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


