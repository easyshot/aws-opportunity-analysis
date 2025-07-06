// Global toggleTheme function for HTML onclick handlers
window.toggleTheme = function() {
    // Get current theme or default to light
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply the new theme
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update the toggle button if it exists
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('.icon');
        const themeText = themeToggle.querySelector('.theme-text');
        
        if (newTheme === 'dark') {
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light';
            themeToggle.title = 'Switch to Light Mode';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark';
            themeToggle.title = 'Switch to Dark Mode';
        }
    }
    
    // Save theme preference to localStorage
    try {
        localStorage.setItem('poi-theme-preference', newTheme);
    } catch (error) {
        console.warn('Failed to save theme preference:', error);
    }
    
    // Add smooth transition effect
    try {
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    } catch (error) {
        console.warn('Failed to add theme transition:', error);
    }
};

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('poi-theme-preference') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update the toggle button to match the current theme
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        const themeIcon = themeToggle.querySelector('.icon');
        const themeText = themeToggle.querySelector('.theme-text');
        
        if (savedTheme === 'dark') {
            if (themeIcon) themeIcon.textContent = '☀️';
            if (themeText) themeText.textContent = 'Light';
            themeToggle.title = 'Switch to Light Mode';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
            if (themeText) themeText.textContent = 'Dark';
            themeToggle.title = 'Switch to Dark Mode';
        }
    }
});