const vscode = require("vscode");

class SessionConnector {
  constructor(logikUrl, runtimeToken, origin) {
    this.logikUrl = logikUrl;
    this.runtimeToken = runtimeToken;
    this.origin = origin;
    console.log("Creating Session Connector", logikUrl, runtimeToken, origin);
  }

  async getDebugProducts(sessionId) {
    const apiUrl = `${this.logikUrl}/api/${sessionId}/bom?size=150`;
    console.log("calling:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Origin: this.origin,
          Authorization: `Bearer ${this.runtimeToken}`,
        },
      });

      if (!response.ok) {
        console.log(response);
        throw new Error(`Session Invalid!`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      vscode.window.showErrorMessage("Failed to connect with logik!");
      console.log(error);
      return null;
    }
  }

  async getConfig(sessionId) {
    const apiUrl = `${this.logikUrl}/api/${sessionId}`;
    console.log("calling:", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Origin: this.origin,
          Authorization: `Bearer ${this.runtimeToken}`,
        },
      });

      if (!response.ok) {
        console.log(response);
        throw new Error(`Session Invalid!`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      vscode.window.showErrorMessage("Failed to connect with logik!");
      console.log(error);
      return null;
    }
  }
}

module.exports = {
  SessionConnector,
};
