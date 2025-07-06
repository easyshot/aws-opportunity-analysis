const fs = require('fs');
const path = require('path');

const jsFilePath = path.join(__dirname, 'public', 'app-compact-option-c.js');
const jsContent = fs.readFileSync(jsFilePath, 'utf8');

console.log('Checking for moon icon:', jsContent.includes('🌙'));
console.log('Checking for sun icon:', jsContent.includes('☀️'));
console.log('Checking for "Dark" (double quotes):', jsContent.includes('"Dark"'));
console.log('Checking for \'Dark\' (single quotes):', jsContent.includes("'Dark'"));
console.log('Checking for "Light" (double quotes):', jsContent.includes('"Light"'));
console.log('Checking for \'Light\' (single quotes):', jsContent.includes("'Light'"));
console.log('Checking for theme conditional:', jsContent.includes('this.currentTheme === \'dark\''));

// Let's find the exact text around the theme switching
const lines = jsContent.split('\n');
lines.forEach((line, index) => {
    if (line.includes('🌙') || line.includes('☀️')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});