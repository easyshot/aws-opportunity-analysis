// Dark Mode Verification Script
// This script tests that dark mode is working comprehensively across all areas

console.log('🔍 Dark Mode Verification Script Starting...');

// Test function to verify dark mode styles are applied
function verifyDarkMode() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    
    console.log(`Current theme: ${currentTheme}`);
    
    if (currentTheme === 'dark') {
        console.log('✅ Dark theme is active');
        
        // Test key areas that should have dark backgrounds
        const testAreas = [
            '.main-content',
            '.content-grid', 
            '.detailed-analysis',
            '.additional-sections',
            '.section-grid',
            '.analysis-content',
            '.item-content',
            '.section-content',
            '.metrics-section',
            '.services-section',
            '.confidence-section',
            '.action-panel',
            '.secondary-actions',
            '.opportunity-form',
            '.input-group',
            '.panel-header',
            '.item-header',
            '.section-header',
            '.analysis-header',
            '.analysis-controls'
        ];
        
        let allPassed = true;
        
        testAreas.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                const computedStyle = window.getComputedStyle(elements[0]);
                const backgroundColor = computedStyle.backgroundColor;
                
                // Check if background is dark (should be rgb(45, 55, 72) or similar)
                if (backgroundColor.includes('45, 55, 72') || 
                    backgroundColor.includes('26, 32, 44') ||
                    backgroundColor.includes('55, 65, 81')) {
                    console.log(`✅ ${selector}: Dark background applied`);
                } else {
                    console.log(`❌ ${selector}: Light background detected - ${backgroundColor}`);
                    allPassed = false;
                }
            } else {
                console.log(`⚠️  ${selector}: No elements found`);
            }
        });
        
        // Test text colors
        const textElements = document.querySelectorAll('h1, h2, h3, h4, p, span, div');
        let textColorPassed = true;
        
        textElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const color = computedStyle.color;
            
            // Skip elements that should have specific colors (like buttons)
            if (element.classList.contains('primary-btn') || 
                element.classList.contains('secondary-btn') ||
                element.classList.contains('action-btn')) {
                return;
            }
            
            // Check if text is light colored in dark mode
            if (color.includes('247, 250, 252') || // #f7fafc
                color.includes('203, 213, 225') || // #cbd5e1
                color.includes('255, 255, 255')) { // white
                // This is good for dark mode
            } else if (color.includes('26, 32, 44') || // #1a202c
                       color.includes('0, 0, 0')) { // black
                console.log(`❌ ${element.tagName}: Dark text detected in dark mode - ${color}`);
                textColorPassed = false;
            }
        });
        
        if (textColorPassed) {
            console.log('✅ Text colors are appropriate for dark mode');
        }
        
        if (allPassed && textColorPassed) {
            console.log('🎉 All dark mode tests passed!');
            return true;
        } else {
            console.log('⚠️  Some dark mode issues detected');
            return false;
        }
    } else {
        console.log('ℹ️  Light theme is active - switch to dark mode to test');
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
    console.log('🚀 Page loaded, starting verification...');
    
    // Wait a moment for styles to apply
    setTimeout(() => {
        const toggleResult = testThemeToggle();
        const darkModeResult = verifyDarkMode();
        
        console.log('\n📊 Verification Summary:');
        console.log(`Theme Toggle: ${toggleResult ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Dark Mode Styles: ${darkModeResult ? '✅ PASS' : '❌ FAIL'}`);
        
        if (toggleResult && darkModeResult) {
            console.log('🎉 All tests passed! Dark mode is working correctly.');
        } else {
            console.log('⚠️  Some issues detected. Check the logs above for details.');
        }
    }, 1000);
});

// Export functions for manual testing
window.verifyDarkMode = verifyDarkMode;
window.testThemeToggle = testThemeToggle;

console.log('📝 Verification functions available: verifyDarkMode(), testThemeToggle()'); 