// lookup.mjs
var request = require('sync-request');

function lookup(query, params = {}) {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    let result;

    // Step 1: Parse the query
    const match = query.match(/select (.+?) from (.+?)(?: where (.+))?$/i);
    if (!match) {
        throw new Error("Invalid query format");
    }

    const columns = match[1].split(',').map(col => col.trim());
    const tableName = match[2].trim();
    const condition = match[3] ? match[3].trim() : null;

    // Step 2: Call the API to get the entire table
    const url = `#LOGIK_URL#/api/managedTables/v2/managedTables/${tableName}`;
    const token = "#ADMIN_TOKEN#";
    
    const response = request('GET', url, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        }
    });

    if (response.statusCode !== 200) {
        throw new Error("Failed to fetch data from API");
    }

    const data = JSON.parse(response.getBody('utf8'));

    // Step 3: Filter the results
    const filteredResults = data.content.map(row => {
        const result = {};
        columns.forEach(col => {
            result[col] = row[col];
        });
        return result;
    });

    // Step 4: Apply conditions if any
    if (condition) {
        const filteredByCondition = filteredResults.filter(row => {
            // Replace parameters in condition with actual values
            let evalCondition = condition;

            // Replace parameters with their values
            for (const key in params) {
                evalCondition = evalCondition.replace(new RegExp(`:${key}`, 'g'), JSON.stringify(params[key]));
            }

            // Split the condition by AND and OR (case insensitive)
            const andConditions = evalCondition.split(/ AND /i);
            const orConditions = andConditions.map(cond => cond.split(/ OR /i));

            // Construct the final condition
            const finalCondition = orConditions.map(orGroup => {
                return orGroup.map(cond => {
                    // Trim whitespace and prefix the left side with 'row.'
                    const parts = cond.split(/=/);
                    if (parts.length === 2) {
                        return `row.${parts[0].trim()} === ${parts[1].trim()}`;
                    }
                    return cond; // In case of malformed condition
                }).join(' || '); // Join OR conditions
            }).join(' && '); // Join AND conditions
            //console.log(finalCondition)

            // Evaluate the condition safely
            return new Function('row', `return ${finalCondition};`)(row);
        });
        return filteredByCondition;
    }

    return filteredResults;
}

module.exports = {
    lookup
};