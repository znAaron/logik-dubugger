const vscode = require("vscode");
const express = require("express");
const bodyParser = require("body-parser");

const { LogikProxy } = require("./LogikProxy.js");

let apiCallHistory = []; // Array to store API call history
const app = express();
app.use(bodyParser.json());

function startServer(apiCallTreeView) {
    const logikProxy = new LogikProxy();

    // API endpoint to receive POST calls
    app.post('/api', (req, res) => {
        const lgkRequest = req.body; // Get the API call data from the request
        //console.log(`Logik Request: ${JSON.stringify(lgkRequest)}`);

        // Make an API call to another server
        logikProxy.startConfig(lgkRequest).then((result) => {
            //console.log(`Return Result: ${JSON.stringify(result)}`);
            res.status(result.status).json(result.body);
            apiCallHistory.push(
                {
                    method: 'POST',
                    time: new Date(),
                    sessionId: result.body['uuid'],
                    request: lgkRequest['fields'],
                    responseBody: result.body
                });
            apiCallTreeView.refresh(apiCallHistory)
        });
    });

    // API endpoint to receive PATCH calls
    app.patch('/api/:id', (req, res) => {
        const lgkRequest = req.body; // Get the API call data from the request
        const id = req.params.id; // Get the ID from the URL

        console.log(lgkRequest);
        console.log(id);

        // Make an API call to another server
        logikProxy.updateConfig(id, lgkRequest).then((result) => {
            res.status(result.status).json(result.body);
            apiCallHistory.push({
                method: 'PATCH',
                time: new Date(),
                sessionId: id,
                request: lgkRequest['fields'] || null,
                responseBody: result.body
            });
            apiCallTreeView.refresh(apiCallHistory);
        });
    });

    // Start the server
    const server = app.listen(3000, () => {
        console.log('API server listening on http://localhost:3000');
    });

    return {
        close: () => server.close(),
        getHistory: () => apiCallHistory, // Method to get the history
    };
}

module.exports = {
    startServer,
};
