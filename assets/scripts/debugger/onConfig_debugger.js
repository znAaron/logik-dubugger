const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const {
    SessionConnector,
} = require("./sessionConnector.js");
const {
    getFields
} = require("../BlueprintView.js")

const { convertConfigTocfg } = require('../logikHelper/requestParser.js')

class InitDebugger {
    constructor(sessionId, config) {
        this.sessionId = sessionId;
        this.config = config;
        this.sessionConnector = new SessionConnector(
            config.logikUrl,
            config.runtimeToken,
            config.origin
        );
    }

    async createSessionFile(filepath, sessionId, data) {
        // step 1. prepare the data
        let cfgData;
        if (data) {
            cfgData = convertConfigTocfg(data, getFields());
        }
        console.log("cfgdata", cfgData, JSON.stringify(cfgData))

        // get validation script
        const scriptContect = fs.readFileSync(filepath, "utf-8");

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workSpacePath = workspaceFolders[0].uri.fsPath;

        const FolderPath = path.join(
            workSpacePath,
            './Sessions/',
            sessionId,
        );
        const scriptFilePath = path.join(
            FolderPath, "/init_runner.js"
        );
        const dataFilePath = path.join(
            FolderPath, "/init_data.js"
        );

        if (!fs.existsSync(FolderPath)) {
            fs.mkdirSync(FolderPath, {
                recursive: true,
            });
        }

        const dataContnt = `let debugData = ${JSON.stringify(cfgData, null, 2)};

module.exports = {
    debugData
};
  `;
        const modifiedScriptContent = scriptContect
            .replace(/!== null/g, "!= null") // Replace all occurrences of !== null
            .split("\n") // Split into lines
            .map((line) => "  " + line) // Add 2 spaces to each line
            .join("\n"); // Join the lines back together

        const combinedContent = `const { debugData } = require('./init_data.js');
  const { lookup } = require('../../.LGK_Scripts/lookup.js');
  const { LGK } = require('../../.LGK_Scripts/lgk.js');
  
  function onConfiguration(cfgRequest) {
    // INIT SCRIPT
  ${modifiedScriptContent}
  }
  
  let result = onConfiguration(debugData.cfgRequest);
  console.log(result);
  `;

        fs.writeFileSync(scriptFilePath, combinedContent);
        fs.writeFileSync(dataFilePath, dataContnt);

        return {
            script: scriptFilePath,
            dataFile: dataFilePath,
            startline: 5
        };
    }
}

module.exports = {
    InitDebugger
};