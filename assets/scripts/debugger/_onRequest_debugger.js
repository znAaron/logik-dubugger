import fs from 'fs';
import path from 'path';

function parseConfigToRequest(responseBody) {
    // Initialize an empty object to hold the transformed fields
    let transformedFields = {};
    let cfgFields = {}
    let setFields = {}

    // Loop through each field in the response
    responseBody.fields.forEach(field => {
        // Split the variableName to determine the nested structure
        let variableParts = field.variableName.split('.');

        // cfg
        if (variableParts.length == 1) {
            cfgFields[variableParts[0]] = field.value;
        }

        // set length
        if (field.set != null && variableParts[variableParts.length - 1] == "size") {
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
                setFields[currentSet] = {}
            }

            let index = field.index;
            if (!setFields[currentSet].data) {
                setFields[currentSet].data = []
            }
            if (!setFields[currentSet].data[index]) {
                setFields[currentSet].data[index] = {
                    index: index
                };
            }

            setFields[currentSet].data[index][field.variableName] = field.value;
        }
    });

    transformedFields = { ...cfgFields, ...setFields };

    return transformedFields;
}


const allConfig = await getConfig(sessionId);
let debugRequest = parseConfigToRequest(allConfig);
let prettyDebugRequest = JSON.stringify(debugRequest, null, 2);

// get validation script
const requestContent = fs.readFileSync('./' + blueprintName + '/REQUEST.js', 'utf-8');
const sessionRunnerPath = './Sessions/';
const combinedFilePath = path.join(sessionRunnerPath, sessionId + '/onrequest_runner.js');

if (!fs.existsSync(path.join(sessionRunnerPath, sessionId))) {
    fs.mkdirSync(path.join(sessionRunnerPath, sessionId), { recursive: true });
}

const modifiedRequestContent = requestContent
    .replace(/!== null/g, '!= null') // Replace all occurrences of !== null
    .split('\n') // Split into lines
    .map(line => '  ' + line) // Add 2 spaces to each line
    .join('\n'); // Join the lines back together

const combinedContent = 
`import lookup from '../../LGK_Scripts/lookup.mjs';
import LGK from '../../LGK_Scripts/lgk.mjs';

let cfgRequest = ${prettyDebugRequest};

function onRequest(cfgRequest) {

  // REQUEST SCRIPT
${modifiedRequestContent}

}

let request_result = onRequest(cfgRequest)
console.log(request_result);
`;

// Write the combined content to a new file
fs.writeFileSync(combinedFilePath, combinedContent);

// Update package.json to add a validation script
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Add or update the validation script
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts.onrequest = `node ${combinedFilePath}`;

// Write the updated package.json back to the file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json with validation script.');