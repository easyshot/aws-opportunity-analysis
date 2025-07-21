# Design Document

## Overview

This design addresses the broken theme toggle functionality in the Partner Opportunity Intelligence application. The solution involves implementing the missing `toggleTheme()` JavaScript function, ensuring proper theme state management, and verifying that all existing CSS dark mode styles are properly applied when the dark theme is active.

## Architecture

### Theme Management System
- **Theme State Storage**: Use localStorage to persist theme preference across sessions
- **Theme Application**: Apply theme by setting `data-theme` attribute on document root
- **Theme Toggle Logic**: Implement toggle function that switches between 'light' and 'dark' states
- **UI Feedback**: Update button icon and text to reflect current theme state

### Component Integration
- **Existing CSS**: Leverage the comprehensive dark mode styles already defined in `styles-compact-option-c.css`
- **JavaScript Enhancement**: Add theme management to the existing `CompactOpportunityAnalyzerC` class
- **HTML Compatibility**: Work with the existing theme toggle button structure

## Components and Interfaces

### Theme Manager
```javascript
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.initializeTheme();
    }
    
    toggleTheme() {
        // Switch between light and dark themes
    }
    
    setTheme(theme) {
        // Apply specific theme
    }
    
    getStoredTheme() {
        // Retrieve theme from localStorage
    }
    
    saveTheme(theme) {
        // Save theme to localStorage
    }
    
    updateThemeButton() {
        // Update button icon and text
    }
}
```

### Integration Points
- **Global Function**: `window.toggleTheme()` for HTML onclick handler
- **Class Integration**: Add theme management to existing `CompactOpportunityAnalyzerC` class
- **DOM Manipulation**: Update `data-theme` attribute on document element
- **Button Updates**: Modify theme toggle button icon and text

## Data Models

### Theme State
```javascript
{
    currentTheme: 'light' | 'dark',
    storageKey: 'poi-theme-preference',
    defaultTheme: 'light'
}
```

### Button States
```javascript
{
    light: {
        icon: '🌙',
        text: 'Dark'
    },
    dark: {
        icon: '☀️', 
        text: 'Light'
    }
}
```

## Error Handling

### Theme Application Failures
- **Fallback**: If theme application fails, default to light theme
- **Storage Errors**: Handle localStorage access errors gracefully
- **DOM Errors**: Ensure theme toggle works even if button elements are missing

### Validation
- **Theme Values**: Validate theme values before application
- **Storage Validation**: Check localStorage availability before use
- **Element Existence**: Verify DOM elements exist before manipulation

## Testing Strategy

### Unit Testing
- Test theme toggle functionality
- Test localStorage persistence
- Test button state updates
- Test theme application to DOM

### Integration Testing
- Test theme toggle with existing UI components
- Test theme persistence across page reloads
- Test compatibility with existing CSS styles

### User Acceptance Testing
- Verify smooth theme transitions
- Confirm all UI elements properly support both themes
- Test theme persistence across browser sessions
- Validate accessibility in both themes

## Implementation Approach

### Phase 1: Core Theme Management
1. Add theme management methods to existing JavaScript class
2. Implement localStorage persistence
3. Create global `toggleTheme()` function

### Phase 2: UI Integration
1. Implement DOM theme application
2. Add button state management
3. Initialize theme on page load

### Phase 3: Enhancement & Polish
1. Add smooth transition effects if needed
2. Verify all CSS dark mode styles are working
3. Test across different browsers and devices

## Technical Considerations

### Browser Compatibility
- Use standard localStorage API (supported in all modern browsers)
- Use standard DOM manipulation methods
- Ensure CSS custom properties work with theme switching

### Performance
- Minimize DOM queries by caching element references
- Use efficient theme switching without page reloads
- Optimize localStorage access patterns

### Accessibility
- Maintain proper contrast ratios in both themes
- Ensure theme toggle button is keyboard accessible
- Provide clear visual feedback for theme state