function convertConfigTocfg(inputData, fields) {
    const cfgRequest = {
        context: {},
        channel: {}
    };

    inputData.forEach(item => {
        cfgRequest[item.variableName] = {
            value: item.value,
            userEdited: true
        };
    });

    fields.forEach(item => {
        if (cfgRequest[item.variableName]) {
            return;
        }
        cfgRequest[item.variableName] = {
            value: null,
            userEdited: false
        };
    });

    return { cfgRequest };
}

module.exports = { convertConfigTocfg };
