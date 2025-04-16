// lgk.js
const LGK = {
    // Implement the fieldMessage function
    fieldMessage: function(message, level, element) {
        return {
            "targetType": "field_element",
            "message": message,
            "type": level,
            "error": level == "error",
            "target": element
        }
    },
    layoutMessage: function(message, level, element) {
        return {
            "targetType": "layout_element",
            "message": message,
            "type": level,
            "error": level == "error",
            "target": element
        }
    }
};

// Export the LGK object
module.exports = {
    LGK
};