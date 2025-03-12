import * as vscode from 'vscode';

export const loadChatView = async (webview: vscode.Webview, baseUri: vscode.Uri) => {
	const indexPath = vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'index.html');
	let html = (await vscode.workspace.fs.readFile(indexPath)).toString();
	const path = webview.asWebviewUri(vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'static'));
	html = html.replace(/\/static\//g, path + '/');
	webview.html = html;
};

export const openFigmaInspectorView = async (webview: vscode.Webview, baseUri: vscode.Uri) => {
	webview.html;
	const indexPath = vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'index.html');
	let html = (await vscode.workspace.fs.readFile(indexPath)).toString();
	const path = webview.asWebviewUri(vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'static'));
	html = html.replace(/\/static\//g, path + '/');
	const script = `
	<script>
		window.showFigmaInspector = true;
	</script>
	`;
	webview.html = script + html;
};