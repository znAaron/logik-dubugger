const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

let fieldsData = [];
let ruleData = [];

class BlueprintSessionsProvider {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.readFields();
    this.readRules();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
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

  getChildren(element) {
    if (!element) {
      // If the element is a child (i.e., Fields or Rules), we don't return more items
      return [
        new vscode.TreeItem(
          "Fields",
          vscode.TreeItemCollapsibleState.Collapsed
        ),
        new vscode.TreeItem("Rules", vscode.TreeItemCollapsibleState.Collapsed),
      ];
    } else if (element.label == "Fields") {
      console.log(fieldsData);
      return fieldsData.map((field) => {
        const fieldItem = new FieldTreeItem(
          field.name,
          field.type,
          field.description
        );
        return fieldItem;
      });
    } else if (element.label == "Rules") {
      return ruleData.map((rule) => {
        const ruleItem = new RuleTreeItem(rule.name);
        return ruleItem;
      });
    }
  }

  getTreeItem(element) {
    return element; // Return each element as a tree item
  }

  _getHtmlForWebview(webview) {
    // Your existing method for generating webview HTML
  }

  async readFields() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
  
    const folderPath = path.join(
      workspaceFolders[0].uri.fsPath,
      "fields",
      "fields.csv"
    );
  
    if (fs.existsSync(folderPath)) {
      fieldsData = []; // Reset existing data
  
      // Read and parse the CSV file
      fs.createReadStream(folderPath)
        .pipe(csv())
        .on("data", (row) => {
          // Extract relevant fields for the tree view
          fieldsData.push({
            type: row.field_type,
            name: row.name,
            description: row.description,
          });
        })
        .on("end", () => {
          console.log("CSV file successfully processed");
          fieldsData.sort((a, b) => {
            return a.name.localeCompare(b.name);
          });
          this.refresh();
          vscode.window.showInformationMessage("Fields loaded successfully.");
        });
    } else {
      vscode.window.showErrorMessage("Field CSV file not found!");
    }
  }
  
  async readRules() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
  
    const folderPath = path.join(
      workspaceFolders[0].uri.fsPath,
      "rules",
      "rules.csv"
    );
  
    if (fs.existsSync(folderPath)) {
      ruleData = []; // Reset existing data
  
      // Read and parse the CSV file
      fs.createReadStream(folderPath)
        .pipe(csv())
        .on("data", (row) => {
          // Extract relevant rule details
          if (row.rule_name) {
            ruleData.push({
              name: row.rule_name,
              grouping: row.grouping || "No grouping provided", // For display on click
            });
          }
        })
        .on("end", () => {
          console.log("Rules CSV file successfully processed");
          ruleData.sort((a, b) => {
            return a.name.localeCompare(b.name);
          });
          this.refresh();
          vscode.window.showInformationMessage("Rules loaded successfully.");
        })
        .on("error", (error) => {
          vscode.window.showErrorMessage(
            `Error processing rules CSV file: ${error.message}`
          );
        });
    } else {
      vscode.window.showErrorMessage("Rules CSV file not found!");
    }
  }
}

// Tree item class to represent each field in the tree view
class FieldTreeItem extends vscode.TreeItem {
  constructor(name, type, description) {
    super(name, vscode.TreeItemCollapsibleState.None); // Set to None since we aren't nesting items
    this.label = `${name} (${type})`; // Combine name and field type
    this.tooltip = description; // Set tooltip to description
  }
}

// Tree item class to represent each rule in the tree view
class RuleTreeItem extends vscode.TreeItem {
  constructor(name) {
    super(name, vscode.TreeItemCollapsibleState.None); // Set to None since we aren't nesting items
    this.label = name; // Show rule name as the label
    this.tooltip = name; // Set tooltip to description
  }
}

module.exports = {
  BlueprintSessionsProvider
};
