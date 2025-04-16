// File: extension.js
const vscode = require("vscode");

const {
  DebugSessionsProvider,
} = require("./assets/scripts/DebugSession.js");
const {
  BlueprintSessionsProvider,
} = require("./assets/scripts/BlueprintView.js");
const { startServer } = require("./assets/scripts/APIServer");
const { ApiCallTreeView } = require("./assets/scripts/APIView");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // provider classes
  const provider = new DebugSessionsProvider(context.extensionUri, context.extensionPath);
  const bpProvider = new BlueprintSessionsProvider();

  // Initialize the API call tree view
  const apiCallTreeView = new ApiCallTreeView();

  // Start the API server
  const apiServer = startServer(apiCallTreeView);

  /**
   * ===============================================================
   * Commands
   * ===============================================================
   */
  // debug command
  context.subscriptions.push(
    vscode.commands.registerCommand("logik-debugger.startDebug", async (item) => {
      
      // Check if this launched from call history
      if (item && item.contextValue === 'callHistoryItem') {
        const fields = item.fields;
        console.log('Fields passed to startDebug:', fields);
        provider.startDebug(item.sessionId, item.fields);
      } else {
        provider.startDebug();
      }
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

  // API endpoint to refresh the tree view
  context.subscriptions.push(
    vscode.commands.registerCommand("logik-debugger.refreshApiCallHistory", () => {
      apiCallTreeView.refresh(apiServer.getHistory());
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

  // Register the tree view provider for the API call history
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("requestHistory", apiCallTreeView)
  );

  // Clean up the server on extension deactivate
  context.subscriptions.push({
    dispose: () => {
      apiServer.close();
    }
  });
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
