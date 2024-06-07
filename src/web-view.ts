import * as vscode from 'vscode';

export const loadChatView = async (webview: vscode.Webview, baseUri: vscode.Uri) => {
	let indexPath = vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'index.html');
	let html = (await vscode.workspace.fs.readFile(indexPath)).toString();;
	let path = webview.asWebviewUri(vscode.Uri.joinPath(baseUri, 'out', 'web-view', 'static'));
	html = html.replace(/\/static\//g, path + '/');
	webview.html = html;
}

export const openFigmaInspectorView = async (webview: vscode.Webview, baseUri: vscode.Uri) => {
	webview.html
	let indexPath = vscode.Uri.joinPath(baseUri, 'web-view', 'build', 'index.html');
	let html = (await vscode.workspace.fs.readFile(indexPath)).toString();;
	let path = webview.asWebviewUri(vscode.Uri.joinPath(baseUri, 'out', 'web-view', 'static'));
	html = html.replace(/\/static\//g, path + '/');
	let script = `
	<script>
		window.showFigmaInspector = true;
	</script>
	`
	webview.html = script + html;
}