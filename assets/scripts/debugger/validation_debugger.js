const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const {
  SessionConnector,
} = require("./sessionConnector.js");

function parseConfig(responseBody) {
  // Initialize an empty object to hold the transformed fields
  let transformedFields = {};
  let cfgFields = {};
  let setFields = {};

  // Loop through each field in the response
  responseBody.fields.forEach((field) => {
    // Split the variableName to determine the nested structure
    let variableParts = field.variableName.split(".");

    // cfg
    if (variableParts.length == 1) {
      cfgFields[variableParts[0]] = field.value;
    }

    // set length
    if (
      field.set != null &&
      variableParts[variableParts.length - 1] == "size"
    ) {
      if (field.value.length == 0) {
        return;
      }

      let currentSet = field.set;
      if (!setFields[currentSet]) {
        setFields[currentSet] = {};
      }
      setFields[currentSet].size = field.value.length;
      return;
    }

    // set data
    if (field.set != null && variableParts.length == 1) {
      let currentSet = field.set;

      // Initialize the set structure if it doesn't exist
      if (!setFields[currentSet]) {
        setFields[currentSet] = {};
      }

      let index = field.index;
      if (!setFields[currentSet].data) {
        setFields[currentSet].data = [];
      }
      if (!setFields[currentSet].data[index]) {
        setFields[currentSet].data[index] = {
          index: index,
        };
      }

      setFields[currentSet].data[index][field.variableName] = field.value;
    }
  });

  transformedFields["cfg"] = cfgFields;
  transformedFields["set"] = setFields;

  return transformedFields;
}

class ValidationDebugger {
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
    const allBOMResult = await this.sessionConnector.getDebugProducts(
      sessionId
    );
    let debugProducts = allBOMResult["products"];
    let prettyDebugProducts = JSON.stringify(debugProducts, null, 2);

    const allConfig = await this.sessionConnector.getConfig(sessionId);
    let debugFields = parseConfig(allConfig);
    let prettyDebugFields = JSON.stringify(debugFields, null, 2);

    // get validation script
    const validationContent = fs.readFileSync(filepath, "utf-8");

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workSpacePath = workspaceFolders[0].uri.fsPath;

    const FolderPath = path.join(
      workSpacePath,
      './Sessions/',
      sessionId,
    );
    const combinedFilePath = path.join(
      FolderPath, "/validation_runner.js"
    );
    const dataFilePath = path.join(
      FolderPath, "/validation_data.js"
    );

    if (!fs.existsSync(FolderPath)) {
      fs.mkdirSync(FolderPath, {
        recursive: true,
      });
    }

    const dataContnt = `let debugFields = ${prettyDebugFields};
let debugProducts = ${prettyDebugProducts};

module.exports = {
    debugFields, debugProducts
};
  `;
    const modifiedValidationContent = validationContent
      .replace(/!== null/g, "!= null") // Replace all occurrences of !== null
      .split("\n") // Split into lines
      .map((line) => "  " + line) // Add 2 spaces to each line
      .join("\n"); // Join the lines back together

    const combinedContent = `const { debugFields, debugProducts } = require('./validation_data.js');
const { lookup } = require('../../.LGK_Scripts/lookup.js');
const { LGK } = require('../../.LGK_Scripts/lgk.js');

function validation(set, cfg, ProductList) {
  // VALIDATION SCRIPT
${modifiedValidationContent}
}

let validation_message = validation(debugFields.set, debugFields.cfg, debugProducts)
console.log(validation_message);
`;

    // Write the combined content to a new file
    fs.writeFileSync(combinedFilePath, combinedContent);
    fs.writeFileSync(dataFilePath, dataContnt);

    return {
      script: combinedFilePath,
      dataFile: dataFilePath,
      startline: 5
    };
  }
}

module.exports = {
  ValidationDebugger
};
