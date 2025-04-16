const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { exec } = require("child_process");

const { ValidationDebugger } = require("./debugger/validation_debugger.js");

class DebugSessionsProvider {
  constructor(_extensionUri, extensionPath) {
    this._extensionUri = _extensionUri;
    this.extensionPath = extensionPath;
    this.filenames = {};

    // Read the blueprint.yaml file
    readBlueprintYaml()
      .then((filenames) => {
        // Store or use the filenames as needed
        console.log("Extracted Filenames: ", filenames);
        // You can save the filenames in the context or in the class
        this.filenames = filenames; // Assuming filenames will be stored for later use
      })
      .catch((err) => {
        vscode.window.showErrorMessage(err);
      });
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
        case "configure": {
          vscode.commands.executeCommand("logik-debugger.configure");
          break;
        }
      }
    });
  }

  startDebug(sessionId, requestData) {
    // Create an array of the file options
    const fileOptions = ["INIT", "PRODUCT", "REQUEST", "VALIDATION"];

    // Show quick pick to let the user select the file to debug
    vscode.window
      .showQuickPick(fileOptions, {
        placeHolder: "Select a file type to debug",
      })
      .then((selectedType) => {
        if (!selectedType) return; // User canceled the selection
        const selectedFile = this.filenames[selectedType];

        // Proceed with debugging using the selectedFile
        this.handleDebugSession(selectedType, selectedFile, sessionId);
      });
  }

  async handleDebugSession(type, fileName, sessionId) {
    const selectedFile = fileName;
    if (!selectedFile) {
      vscode.window.showErrorMessage("Unable to find the script");
      return;
    }

    // Check for API Key configuration
    const token = vscode.workspace
      .getConfiguration()
      .get("logikDebugger.runtimeToken");
    const url = vscode.workspace
      .getConfiguration()
      .get("logikDebugger.logikUrl");
    const origin = vscode.workspace
      .getConfiguration()
      .get("logikDebugger.origin");
    const adminToken = vscode.workspace
      .getConfiguration()
      .get("logikDebugger.adminToken");

    const debuggerConfig = {
      logikUrl: url,
      runtimeToken: token,
      origin: origin,
      adminToken: adminToken
    };

    copyFilesToWorkspace(this.extensionPath, debuggerConfig);

    if (!token || !url) {
      vscode.window
        .showInformationMessage(
          "API Key/Logik URL is not set. Please configure it in the settings.",
          "Add API Key" // Provide an option to open the settings
        )
        .then((selection) => {
          if (selection === "Add API Key") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "logikDebugger.apiKey"
            );
          }
        });
      return; // Exit if API key is not set
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const folderPath = workspaceFolders[0].uri.fsPath;
    const originalPath = path.join(folderPath, selectedFile);

    let sessionDebugger;
    if (type == "VALIDATION") {
      sessionDebugger = new ValidationDebugger(sessionId, debuggerConfig);
    }

    const sessionFile = await sessionDebugger.createSessionFile(
      originalPath,
      sessionId
    );

    // Setting breakpoint
    const debugFileUri = vscode.Uri.file(sessionFile);
    const breakpoint = new vscode.SourceBreakpoint(
      new vscode.Location(debugFileUri, new vscode.Position(0, 0))
    );
    vscode.debug.addBreakpoints([breakpoint]);

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(sessionFile)
    );
    vscode.debug.startDebugging(workspaceFolder, {
      type: "node",
      request: "launch",
      name: "Debug Modified JS",
      program: sessionFile,
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
    <input type="text" id="sessionIdInput" placeholder="Enter Configuration Session Id" />
    <button class="debug-btn">Start Debugging</button>
    <button class="settings-btn">Open Settings</button>
  
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

async function readBlueprintYaml() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) throw new Error("No workspace folder found.");

  const folderPath = workspaceFolders[0].uri.fsPath;
  const yamlFilePath = path.join(folderPath, "blueprint.yaml");

  // Check if blueprint.yaml exists
  if (!fs.existsSync(yamlFilePath)) {
    throw new Error("Blueprint.yaml not found.");
  }

  try {
    // Read and parse the YAML file
    const fileContents = fs.readFileSync(yamlFilePath, "utf8");
    const parsedYaml = yaml.load(fileContents);

    const filenames = {};
    // @ts-ignore
    if (parsedYaml.blueprints && Array.isArray(parsedYaml.blueprints)) {
      // @ts-ignore
      parsedYaml.blueprints.forEach((blueprint) => {
        if (blueprint.scripts && Array.isArray(blueprint.scripts)) {
          blueprint.scripts.forEach((script) => {
            if (
              ["INIT", "PRODUCT", "REQUEST", "VALIDATION"].includes(script.type)
            ) {
              filenames[script.type] = script.file; // Store the filename
            }
          });
        }
      });
    }

    return filenames; // Return the object containing filenames for different types
  } catch (error) {
    throw new Error(`Failed to read blueprint.yaml: ${error.message}`);
  }
}


async function copyFilesToWorkspace(extensionPath, debuggerConfig) {
  console.log('copy file');
  const lgkfile = path.join(extensionPath, 'assets/localLGK/lgk.js');
  const lookupfile = path.join(extensionPath, 'assets/localLGK/lookup.js');

  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const targetFolder = path.join(workspaceFolder, '.LGK_Scripts')
  if (!fs.existsSync(targetFolder)) {
    exec("npm install sync-request", { cwd: workspaceFolder }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing sync-request: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });

    fs.mkdirSync(targetFolder, {
      recursive: true,
    });
  }

  const lgkdestinationFile = path.join(targetFolder, path.basename(lgkfile));
  try {
    await fs.promises.copyFile(lgkfile, lgkdestinationFile);
    console.log(`Copied ${lgkfile} to workspace.`);
  } catch (error) {
    console.error(`Failed to copy ${lgkfile}:`, error);
  }

  const lookupdestinationFile = path.join(targetFolder, path.basename(lookupfile));
  const lookupContent = fs.readFileSync(lookupfile, "utf-8");
  const modifiedLookupContent = lookupContent
    .replace(/#LOGIK_URL#/g, debuggerConfig.logikUrl)
    .replace(/#ADMIN_TOKEN#/g, debuggerConfig.adminToken)
  try {
    await fs.writeFileSync(lookupdestinationFile, modifiedLookupContent);
    console.log(`Copied ${lgkfile} to workspace.`);
  } catch (error) {
    console.error(`Failed to copy ${lgkfile}:`, error);
  }
}

module.exports = {
  DebugSessionsProvider,
  copyFilesToWorkspace
};
