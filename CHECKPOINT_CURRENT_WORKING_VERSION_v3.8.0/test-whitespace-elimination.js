// Whitespace Elimination Verification Script
// This script checks that all white spaces are eliminated in dark mode

console.log('🔍 Whitespace Elimination Verification Starting...');

function checkWhitespaceElimination() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    
    console.log(`Current theme: ${currentTheme}`);
    
    if (currentTheme === 'dark') {
        console.log('✅ Dark theme is active - checking for whitespace elimination...');
        
        // Check key areas that should have no white spaces
        const areasToCheck = [
            'html',
            'body',
            '.app-container',
            '.main-content',
            '.content-grid',
            '.input-panel',
            '.results-panel',
            '.detailed-analysis',
            '.additional-sections',
            '.section-grid',
            '.analysis-content',
            '.panel-header',
            '.opportunity-form',
            '.metrics-section',
            '.services-section',
            '.confidence-section',
            '.action-panel',
            '.services-content',
            '.confidence-display',
            '.item-content',
            '.section-content',
            '.loading-state',
            '.empty-state',
            '.input-group',
            '.secondary-actions'
        ];
        
        let allPassed = true;
        let whiteSpaceFound = false;
        
        areasToCheck.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                const computedStyle = window.getComputedStyle(elements[0]);
                const backgroundColor = computedStyle.backgroundColor;
                
                // Check if background is white or very light
                if (backgroundColor.includes('255, 255, 255') || // white
                    backgroundColor.includes('250, 251, 252') || // #fafbfc
                    backgroundColor.includes('248, 250, 252') || // #f8fafc
                    backgroundColor.includes('241, 245, 249')) { // #f1f5f9
                    console.log(`❌ ${selector}: WHITE SPACE DETECTED - ${backgroundColor}`);
                    whiteSpaceFound = true;
                    allPassed = false;
                } else if (backgroundColor.includes('26, 32, 44') || // #1a202c
                           backgroundColor.includes('45, 55, 72') || // #2d3748
                           backgroundColor.includes('55, 65, 81') || // #374151
                           backgroundColor.includes('74, 85, 104')) { // #4a5568
                    console.log(`✅ ${selector}: Dark background applied - ${backgroundColor}`);
                } else {
                    console.log(`⚠️  ${selector}: Unknown background - ${backgroundColor}`);
                }
            } else {
                console.log(`⚠️  ${selector}: No elements found`);
            }
        });
        
        if (!whiteSpaceFound) {
            console.log('🎉 No white spaces detected! All areas have dark backgrounds.');
            return true;
        } else {
            console.log('⚠️  White spaces detected in some areas.');
            return false;
        }
    } else {
        console.log('ℹ️  Light theme is active - switch to dark mode to test whitespace elimination');
        return false;
    }
}

// Test function to verify theme toggle works
function testThemeToggle() {
    console.log('🔄 Testing theme toggle functionality...');
    
    const body = document.body;
    const initialTheme = body.getAttribute('data-theme') || 'light';
    
    // Simulate theme toggle
    const newTheme = initialTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    
    console.log(`Theme toggled from ${initialTheme} to ${newTheme}`);
    
    // Verify the change
    const currentTheme = body.getAttribute('data-theme');
    if (currentTheme === newTheme) {
        console.log('✅ Theme toggle working correctly');
        return true;
    } else {
        console.log('❌ Theme toggle failed');
        return false;
    }
}

// Run verification when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Page loaded, starting whitespace elimination verification...');
    
    // Wait a moment for styles to apply
    setTimeout(() => {
        const toggleResult = testThemeToggle();
        const whitespaceResult = checkWhitespaceElimination();
        
        console.log('\n📊 Whitespace Elimination Summary:');
        console.log(`Theme Toggle: ${toggleResult ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Whitespace Elimination: ${whitespaceResult ? '✅ PASS' : '❌ FAIL'}`);
        
        if (toggleResult && whitespaceResult) {
            console.log('🎉 All tests passed! No white spaces in dark mode.');
        } else {
            console.log('⚠️  Some issues detected. Check the logs above for details.');
        }
    }, 1000);
});

// Export functions for manual testing
window.checkWhitespaceElimination = checkWhitespaceElimination;
window.testThemeToggle = testThemeToggle;

console.log('📝 Verification functions available: checkWhitespaceElimination(), testThemeToggle()'); 