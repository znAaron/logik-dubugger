// File: extension.js
const vscode = require("vscode");

const {
  DebugSessionsProvider,
} = require("./assets/scripts/DebugSession.js");
const {
  BlueprintSessionsProvider,
} = require("./assets/scripts/BlueprintView.js");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // provider classes
  const provider = new DebugSessionsProvider(context.extensionUri);
  const bpProvider = new BlueprintSessionsProvider();

  /**
   * ===============================================================
   * Commands
   * ===============================================================
   */
  // debug command
  context.subscriptions.push(
    vscode.commands.registerCommand("logik-debugger.startDebug", async () => {
      provider.startDebug();
    })
  );

  // setting button
  context.subscriptions.push(
    vscode.commands.registerCommand("logik-debugger.configure", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "logikDebugger"
      );
    })
  );


  /**
   * ===============================================================
   * Views
   * ===============================================================
   */
  // debug session panel
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("debugSessions", provider)
  );

  // Register the tree view provider for the Current Blueprint
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("blueprint", bpProvider)
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
