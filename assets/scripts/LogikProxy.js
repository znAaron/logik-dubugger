const vscode = require("vscode");

class LogikProxy {
    async startConfig(config) {
        let runtimeToken = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.runtimeToken");
        let logikUrl = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.logikUrl");
        let origin = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.origin");

        const apiUrl = `${logikUrl}/api`;
        
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    Origin: origin,
                    Authorization: `Bearer ${runtimeToken}`,
                    "Content-Type": 'application/vnd.logik.cfg-v2+json',
                    "Accept": 'application/json'
                },
                body: JSON.stringify(config) 
            });

            const responseBody = await response.json();

            return {
                status: response.status,
                body: responseBody
            };
        } catch (error) {
            vscode.window.showErrorMessage("Failed to connect with logik!");
            console.log(error);
            return null;
        }
    }

    async updateConfig(id, config) {
        let runtimeToken = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.runtimeToken");
        let logikUrl = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.logikUrl");
        let origin = vscode.workspace
            .getConfiguration()
            .get("logikDebugger.origin");

        const apiUrl = `${logikUrl}/api/${id}`;

        try {
            const response = await fetch(apiUrl, {
                method: "PATCH",
                headers: {
                    Origin: origin,
                    Authorization: `Bearer ${runtimeToken}`,
                    "Content-Type": 'application/vnd.logik.cfg-v2+json',
                    "Accept": 'application/json'
                },
                body: JSON.stringify(config)
            });

            const responseBody = await response.json();
            console.log(responseBody);

            return {
                status: response.status,
                body: responseBody
            };
        } catch (error) {
            vscode.window.showErrorMessage("Failed to connect with logik!");
            console.log(error);
            return null;
        }
    }
}

module.exports = {
    LogikProxy,
};
