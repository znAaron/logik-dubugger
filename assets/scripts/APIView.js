// File: apiCallTreeView.js
const vscode = require("vscode");

class ApiCallTreeView {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.treeData = [];
    }

    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage((data) => {
            switch (
            data.type
            // Handle messages here...
            ) {
            }
        });
    }

    refresh(apiCallHistory) {
        this.treeData = apiCallHistory.map((call) => (
            new CallHistoryItem(`${call.method} ${call.sessionId}`, call.sessionId, call.request, `Quest Made ${call.time}`)
        ));
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {

        if (!element) {
            return this.treeData;
        }

        if (element instanceof CallHistoryItem) {
            return element.fields.map(
                (field) => {
                    return new CallFieldItem(field.variableName, field["value"], field.variableName);
                })

        }
    }

    _getHtmlForWebview(webview) {
        // Your existing method for generating webview HTML
    }
}

// Tree item class to represent each field in the tree view
class CallHistoryItem extends vscode.TreeItem {
    constructor(label, sessionId, fields, description) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed); // Set to None since we aren't nesting items
        this.label = label; // Combine name and field type
        this.tooltip = description; // Set tooltip to description
        this.sessionId = sessionId;

        this.contextValue = 'callHistoryItem';
        
        this.fields = fields;
    }
}

class CallFieldItem extends vscode.TreeItem {
    constructor(variableName, variableValue, description) {
        super(variableName, vscode.TreeItemCollapsibleState.None); // Set to None since we aren't nesting items
        this.label = `${variableName} = ${variableValue}`; // Combine name and field type
        this.tooltip = description; // Set tooltip to description
    }
}

module.exports = {
    ApiCallTreeView,
};
