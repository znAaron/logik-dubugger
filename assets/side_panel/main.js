// @ts-nocheck

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  // debug button
  document.querySelector(".debug-btn").addEventListener("click", () => {
    const sessionId = document.getElementById("sessionIdInput").value;
    vscode.postMessage({ type: "debug", value: sessionId });
  });

  // setting button
  document.querySelector(".settings-btn").addEventListener("click", () => {
    vscode.postMessage({ type: "configure" });
  });
})();
