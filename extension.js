// File: extension.js
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new DebugSessionsProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("debugSessions", provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("logik-debugger.startDebug", async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const folderPath = workspaceFolders[0].uri.fsPath;
      const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

      const selectedFile = await vscode.window.showQuickPick(files, {
        placeHolder: "Select a JavaScript file to debug",
      });

      if (!selectedFile) return;

      const originalPath = path.join(folderPath, selectedFile);
      const debugFolder = path.join(folderPath, "sessions");
      if (!fs.existsSync(debugFolder)) fs.mkdirSync(debugFolder);

      const debugFilePath = path.join(debugFolder, selectedFile);
      const originalCode = fs.readFileSync(originalPath, "utf8");

      // Simple search-and-replace logic
      const modifiedCode = originalCode.replace(/myFunc\(/g, "myLib.myFunc(");
      fs.writeFileSync(debugFilePath, modifiedCode);

      // Setting breakpoint
      const debugFileUri = vscode.Uri.file(debugFilePath);
      const breakpoint = new vscode.SourceBreakpoint(
        new vscode.Location(debugFileUri, new vscode.Position(0, 0))
      );
      vscode.debug.addBreakpoints([breakpoint]);

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        vscode.Uri.file(debugFilePath)
      );
      vscode.debug.startDebugging(workspaceFolder, {
        type: "node",
        request: "launch",
        name: "Debug Modified JS",
        program: debugFilePath,
        console: "integratedTerminal",
      });
    })
  );
}
class DebugSessionsProvider {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "debug": {
          this.startDebug(data.value);
          break;
        }
      }
    });
  }

  startDebug(fileName) {
    const selectedFile = fileName;
    if (!selectedFile) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const folderPath = workspaceFolders[0].uri.fsPath;
    const originalPath = path.join(folderPath, selectedFile);
    const debugFolder = path.join(folderPath, "sessions");
    if (!fs.existsSync(debugFolder)) fs.mkdirSync(debugFolder);

    const debugFilePath = path.join(debugFolder, selectedFile);
    const originalCode = fs.readFileSync(originalPath, "utf8");

    // Simple search-and-replace logic
    const modifiedCode = originalCode.replace(/myFunc\(/g, "myLib.myFunc(");
    fs.writeFileSync(debugFilePath, modifiedCode);

    // Setting breakpoint
    const debugFileUri = vscode.Uri.file(debugFilePath);
    const breakpoint = new vscode.SourceBreakpoint(
      new vscode.Location(debugFileUri, new vscode.Position(0, 0))
    );
    vscode.debug.addBreakpoints([breakpoint]);

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(debugFilePath)
    );
    vscode.debug.startDebugging(workspaceFolder, {
      type: "node",
      request: "launch",
      name: "Debug Modified JS",
      program: debugFilePath,
      console: "integratedTerminal",
    });
  }

  _getHtmlForWebview(webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets/side_panel", "main.js")
    );
    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets/side_panel", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets/side_panel", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets/side_panel", "main.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <!--
    Use a content security policy to only allow loading styles from our extension directory,
    and only allow scripts that have a specific nonce.
    (See the 'webview-sample' extension sample for img-src content security policy examples)
  -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <link href="${styleResetUri}" rel="stylesheet">
  <link href="${styleVSCodeUri}" rel="stylesheet">
  <link href="${styleMainUri}" rel="stylesheet">

  <title>Cat Colors</title>
</head>
<body>
  <input type="text" id="fileNameInput" placeholder="Enter file name" />
  <button class="debug-btn">Start Debugging</button>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
