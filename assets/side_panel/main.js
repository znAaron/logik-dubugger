// @ts-nocheck

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { colors: [] };

    /** @type {Array<{ value: string }>} */
    let colors = oldState.colors;


    document.querySelector('.debug-btn').addEventListener('click', () => {
        const fileName = document.getElementById('fileNameInput').value;
        vscode.postMessage({ type: 'debug', value: fileName });
    });
}());


