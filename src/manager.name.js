const fs = require('fs');
const path = require('path');

/**
 * Read JSON file and extract all unique manager names and titles
 */
function extractUniqueManagers() {
    try {
        // Read JSON file
        const filePath = path.join(__dirname, '../temp/2025.0613-0619.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Use Map to store unique manager info, with name as key
        const uniqueManagers = new Map();
        
        // Iterate through all questions
        Object.keys(jsonData).forEach(questionId => {
            const question = jsonData[questionId];
            
            // If this question has managers array
            if (question.managers && Array.isArray(question.managers)) {
                question.managers.forEach(manager => {
                    // Use name as unique identifier
                    if (manager.name && manager.title) {
                        uniqueManagers.set(manager.name, {
                            name: manager.name,
                            title: manager.title,
                            entityId: manager.entityId
                        });
                    }
                });
            }
        });
        
        // Convert to array and sort by name
        const managersArray = Array.from(uniqueManagers.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        return managersArray;
    } catch (error) {
        console.error('Error reading file:', error.message);
        return [];
    }
}

/**
 * Display all unique manager names and titles
 */
function displayUniqueManagers() {
    const managers = extractUniqueManagers();
    
    console.log(`\nFound ${managers.length} unique managers:\n`);
    console.log('Name'.padEnd(35) + 'Title');
    console.log('-'.repeat(80));
    
    managers.forEach(manager => {
        console.log(`${manager.name.padEnd(35)} ${manager.title}`);
    });
    
    return managers;
}

/**
 * Export manager data to JSON file
 */
function exportManagersToJson(outputPath = './managers.json') {
    const managers = extractUniqueManagers();
    
    try {
        fs.writeFileSync(outputPath, JSON.stringify(managers, null, 2), 'utf8');
        console.log(`\nExported ${managers.length} managers data to: ${outputPath}`);
        return true;
    } catch (error) {
        console.error('Error exporting file:', error.message);
        return false;
    }
}

// If this file is executed directly, display results
if (require.main === module) {
    displayUniqueManagers();
    
    // Optional: export to JSON file
    const outputPath = path.join(__dirname, '../temp/unique-managers.json');
    exportManagersToJson(outputPath);
}

// Export functions for use by other modules
module.exports = {
    extractUniqueManagers,
    displayUniqueManagers,
    exportManagersToJson
};
