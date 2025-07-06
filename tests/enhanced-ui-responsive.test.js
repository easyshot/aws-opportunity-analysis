/**
 * Responsive Design Tests for Enhanced UI
 * Tests layout and functionality on desktop, tablet, and mobile devices
 */

const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');
const path = require('path');

// Mock CSS media query testing
class MediaQueryTester {
  constructor() {
    this.breakpoints = {
      mobile: { min: 0, max: 767 },
      tablet: { min: 768, max: 1023 },
      desktop: { min: 1024, max: Infinity }
    };
  }

  // Simulate different viewport sizes
  setViewport(width, height) {
    // Mock window resize
    if (global.window) {
      global.window.innerWidth = width;
      global.window.innerHeight = height;
      
      // Trigger resize event
      const resizeEvent = new global.window.Event('resize');
      global.window.dispatchEvent(resizeEvent);
    }
  }

  // Get current breakpoint based on width
  getCurrentBreakpoint(width) {
    if (width <= this.breakpoints.mobile.max) return 'mobile';
    if (width <= this.breakpoints.tablet.max) return 'tablet';
    return 'desktop';
  }

  // Test CSS media queries
  testMediaQuery(query, width) {
    // Simple media query parser for testing
    if (query.includes('max-width')) {
      const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)[1]);
      return width <= maxWidth;
    }
    if (query.includes('min-width')) {
      const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)[1]);
      return width >= minWidth;
    }
    return false;
  }
}

// Mock DOM with responsive elements
const createResponsiveDom = () => {
  return new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>AWS Opportunity Analysis - Responsive</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Base styles */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .field-group {
      margin-bottom: 20px;
    }
    
    .results-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    
    .projects-table {
      width: 100%;
      overflow-x: auto;
    }
    
    .architecture-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    /* Tablet styles */
    @media (max-width: 1023px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .results-layout {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .architecture-grid {
        grid-template-columns: 1fr;
      }
    }
    
    /* Mobile styles */
    @media (max-width: 767px) {
      .container {
        padding: 10px;
      }
      
      .field-group {
        margin-bottom: 15px;
      }
      
      .projects-table {
        font-size: 14px;
      }
      
      .btn {
        width: 100%;
        margin-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Enhanced Input Form -->
    <form id="opportunityForm" class="form-grid">
      <div class="field-group">
        <label for="CustomerName">Customer Name *</label>
        <input type="text" id="CustomerName" name="CustomerName" required />
      </div>
      
      <div class="field-group">
        <label for="oppName">Opportunity Name *</label>
        <input type="text" id="oppName" name="oppName" required />
      </div>
      
      <div class="field-group">
        <label for="oppDescription">Description *</label>
        <textarea id="oppDescription" name="oppDescription" required></textarea>
      </div>
      
      <div class="field-group">
        <label for="region">Region *</label>
        <select id="region" name="region" required>
          <option value="">Select Region</option>
          <option value="us-east-1">US East (N. Virginia)</option>
          <option value="us-west-2">US West (Oregon)</option>
        </select>
      </div>
      
      <div class="field-group">
        <label for="closeDate">Close Date *</label>
        <input type="date" id="closeDate" name="closeDate" required />
      </div>
      
      <div class="field-group">
        <label for="industry">Industry</label>
        <select id="industry" name="industry">
          <option value="">Select Industry</option>
          <option value="Technology">Technology</option>
          <option value="Healthcare">Healthcare</option>
        </select>
      </div>
      
      <div class="field-group">
        <label for="customerSegment">Customer Segment</label>
        <select id="customerSegment" name="customerSegment">
          <option value="">Select Segment</option>
          <option value="Enterprise">Enterprise</option>
          <option value="Mid-Market">Mid-Market</option>
        </select>
      </div>
      
      <div class="field-group">
        <label for="partnerName">Partner Name</label>
        <input type="text" id="partnerName" name="partnerName" />
      </div>
    </form>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button id="analyzeBtn" class="btn">Analyze (Standard)</button>
      <button id="analyzeNovaBtn" class="btn">Analyze (Nova Premier)</button>
      <button id="fundingBtn" class="btn">Funding Analysis</button>
      <button id="resetBtn" class="btn">Reset</button>
      <button id="exportBtn" class="btn">Export Results</button>
    </div>

    <!-- Results Layout -->
    <div class="results-layout">
      <!-- Projections Section -->
      <div class="projections-section">
        <h3>Projections</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <label>ARR</label>
            <div id="arrValue" class="metric-value">-</div>
          </div>
          <div class="metric-card">
            <label>MRR</label>
            <div id="mrrValue" class="metric-value">-</div>
          </div>
          <div class="metric-card">
            <label>Launch Date</label>
            <div id="launchDate" class="metric-value">-</div>
          </div>
          <div class="metric-card">
            <label>Confidence</label>
            <div id="confidence" class="metric-value">-</div>
          </div>
        </div>
      </div>

      <!-- Analysis Results Section -->
      <div class="analysis-section">
        <h3>Analysis Results</h3>
        <div class="analysis-content">
          <div class="methodology">
            <h4>Methodology</h4>
            <div id="methodologyContent">-</div>
          </div>
          <div class="findings">
            <h4>Findings</h4>
            <div id="findingsContent">-</div>
          </div>
          <div class="risks">
            <h4>Risk Factors</h4>
            <div id="riskContent">-</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Similar Projects Table -->
    <div class="projects-section">
      <h3>Similar Projects</h3>
      <div class="projects-table">
        <table id="projectsTable">
          <thead>
            <tr>
              <th>Project</th>
              <th>Customer</th>
              <th>Industry</th>
              <th>Region</th>
              <th>ARR</th>
              <th>Services</th>
            </tr>
          </thead>
          <tbody id="projectsTableBody">
            <tr>
              <td colspan="6">No projects loaded</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Architecture Section -->
    <div class="architecture-section">
      <h3>Architecture Recommendations</h3>
      <div class="architecture-grid">
        <div class="arch-card">
          <h4>Network Foundation</h4>
          <div id="networkContent">-</div>
        </div>
        <div class="arch-card">
          <h4>Compute Layer</h4>
          <div id="computeContent">-</div>
        </div>
        <div class="arch-card">
          <h4>Data Layer</h4>
          <div id="dataContent">-</div>
        </div>
        <div class="arch-card">
          <h4>Security Components</h4>
          <div id="securityContent">-</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`, { url: 'http://localhost' });
};

// Responsive layout tester
class ResponsiveLayoutTester {
  constructor() {
    this.dom = createResponsiveDom();
    this.window = this.dom.window;
    this.document = this.dom.window.document;
    this.mediaQueryTester = new MediaQueryTester();
    
    // Set up global references
    global.window = this.window;
    global.document = this.document;
  }

  // Test element visibility at different screen sizes
  testElementVisibility(elementId, viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const element = this.document.getElementById(elementId);
    
    if (!element) return { exists: false, visible: false };
    
    const computedStyle = this.window.getComputedStyle(element);
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' &&
                     computedStyle.opacity !== '0';
    
    return {
      exists: true,
      visible: isVisible,
      display: computedStyle.display,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  }

  // Test form layout at different screen sizes
  testFormLayout(viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const form = this.document.getElementById('opportunityForm');
    const fieldGroups = this.document.querySelectorAll('.field-group');
    
    if (!form) return { error: 'Form not found' };
    
    const formStyle = this.window.getComputedStyle(form);
    const breakpoint = this.mediaQueryTester.getCurrentBreakpoint(viewportWidth);
    
    return {
      breakpoint,
      formDisplay: formStyle.display,
      gridColumns: formStyle.gridTemplateColumns,
      fieldCount: fieldGroups.length,
      fieldsVisible: Array.from(fieldGroups).every(field => 
        this.window.getComputedStyle(field).display !== 'none'
      )
    };
  }

  // Test results layout responsiveness
  testResultsLayout(viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const resultsLayout = this.document.querySelector('.results-layout');
    const projectsTable = this.document.querySelector('.projects-table');
    const architectureGrid = this.document.querySelector('.architecture-grid');
    
    const results = {
      breakpoint: this.mediaQueryTester.getCurrentBreakpoint(viewportWidth),
      resultsLayout: null,
      projectsTable: null,
      architectureGrid: null
    };
    
    if (resultsLayout) {
      const style = this.window.getComputedStyle(resultsLayout);
      results.resultsLayout = {
        display: style.display,
        gridColumns: style.gridTemplateColumns,
        gap: style.gap
      };
    }
    
    if (projectsTable) {
      const style = this.window.getComputedStyle(projectsTable);
      results.projectsTable = {
        width: style.width,
        overflowX: style.overflowX,
        fontSize: style.fontSize
      };
    }
    
    if (architectureGrid) {
      const style = this.window.getComputedStyle(architectureGrid);
      results.architectureGrid = {
        display: style.display,
        gridColumns: style.gridTemplateColumns
      };
    }
    
    return results;
  }

  // Test button layout responsiveness
  testButtonLayout(viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const buttons = this.document.querySelectorAll('.btn');
    const breakpoint = this.mediaQueryTester.getCurrentBreakpoint(viewportWidth);
    
    const buttonTests = Array.from(buttons).map(button => {
      const style = this.window.getComputedStyle(button);
      return {
        id: button.id,
        width: style.width,
        marginBottom: style.marginBottom,
        display: style.display,
        visible: style.display !== 'none'
      };
    });
    
    return {
      breakpoint,
      buttonCount: buttons.length,
      buttons: buttonTests,
      allVisible: buttonTests.every(btn => btn.visible)
    };
  }

  // Test accessibility at different screen sizes
  testAccessibility(viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const focusableElements = this.document.querySelectorAll(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    
    const accessibilityTests = {
      breakpoint: this.mediaQueryTester.getCurrentBreakpoint(viewportWidth),
      focusableCount: focusableElements.length,
      allFocusable: true,
      tabOrder: [],
      labels: {
        total: 0,
        associated: 0
      }
    };
    
    // Test focusable elements
    focusableElements.forEach((element, index) => {
      const style = this.window.getComputedStyle(element);
      const isFocusable = style.display !== 'none' && 
                         style.visibility !== 'hidden' &&
                         !element.disabled;
      
      if (!isFocusable) {
        accessibilityTests.allFocusable = false;
      }
      
      accessibilityTests.tabOrder.push({
        element: element.tagName.toLowerCase(),
        id: element.id,
        focusable: isFocusable,
        tabIndex: element.tabIndex
      });
    });
    
    // Test labels
    const labels = this.document.querySelectorAll('label');
    accessibilityTests.labels.total = labels.length;
    
    labels.forEach(label => {
      const forAttribute = label.getAttribute('for');
      if (forAttribute && this.document.getElementById(forAttribute)) {
        accessibilityTests.labels.associated++;
      }
    });
    
    return accessibilityTests;
  }

  // Simulate touch interactions for mobile
  testTouchInteractions(viewportWidth) {
    this.mediaQueryTester.setViewport(viewportWidth, 800);
    const touchTargets = this.document.querySelectorAll('button, input, select, textarea');
    const breakpoint = this.mediaQueryTester.getCurrentBreakpoint(viewportWidth);
    
    const touchTests = Array.from(touchTargets).map(element => {
      const rect = element.getBoundingClientRect();
      const style = this.window.getComputedStyle(element);
      
      // Minimum touch target size is 44px x 44px (iOS guidelines)
      const minTouchSize = 44;
      const isTouchFriendly = rect.width >= minTouchSize && rect.height >= minTouchSize;
      
      return {
        element: element.tagName.toLowerCase(),
        id: element.id,
        width: rect.width,
        height: rect.height,
        touchFriendly: isTouchFriendly,
        padding: style.padding,
        margin: style.margin
      };
    });
    
    return {
      breakpoint,
      touchTargetCount: touchTargets.length,
      touchTargets: touchTests,
      allTouchFriendly: touchTests.every(target => target.touchFriendly)
    };
  }
}

describe('Enhanced UI Responsive Design Tests', () => {
  let responsiveTester;
  
  // Common viewport sizes for testing
  const viewports = {
    mobile: { width: 375, height: 667, name: 'Mobile (iPhone)' },
    mobileSmall: { width: 320, height: 568, name: 'Mobile Small' },
    tablet: { width: 768, height: 1024, name: 'Tablet (iPad)' },
    tabletLandscape: { width: 1024, height: 768, name: 'Tablet Landscape' },
    desktop: { width: 1200, height: 800, name: 'Desktop' },
    desktopLarge: { width: 1920, height: 1080, name: 'Desktop Large' }
  };

  beforeEach(() => {
    responsiveTester = new ResponsiveLayoutTester();
  });

  describe('Form Layout Responsiveness', () => {
    test('should display all form fields on desktop', () => {
      const layout = responsiveTester.testFormLayout(viewports.desktop.width);
      
      expect(layout.breakpoint).toBe('desktop');
      expect(layout.fieldsVisible).toBe(true);
      expect(layout.fieldCount).toBeGreaterThan(0);
      expect(layout.formDisplay).toBe('grid');
    });

    test('should adapt form layout for tablet', () => {
      const layout = responsiveTester.testFormLayout(viewports.tablet.width);
      
      expect(layout.breakpoint).toBe('tablet');
      expect(layout.fieldsVisible).toBe(true);
      expect(layout.formDisplay).toBe('grid');
      // Should use single column layout on tablet
      expect(layout.gridColumns).not.toContain('1fr 1fr');
    });

    test('should stack form fields on mobile', () => {
      const layout = responsiveTester.testFormLayout(viewports.mobile.width);
      
      expect(layout.breakpoint).toBe('mobile');
      expect(layout.fieldsVisible).toBe(true);
      expect(layout.formDisplay).toBe('grid');
    });

    test('should maintain field visibility across all screen sizes', () => {
      Object.values(viewports).forEach(viewport => {
        const layout = responsiveTester.testFormLayout(viewport.width);
        expect(layout.fieldsVisible).toBe(true);
      });
    });
  });

  describe('Results Layout Responsiveness', () => {
    test('should display two-column results layout on desktop', () => {
      const layout = responsiveTester.testResultsLayout(viewports.desktop.width);
      
      expect(layout.breakpoint).toBe('desktop');
      expect(layout.resultsLayout).toBeDefined();
      expect(layout.resultsLayout.display).toBe('grid');
      expect(layout.resultsLayout.gridColumns).toContain('1fr 1fr');
    });

    test('should use single-column layout on tablet', () => {
      const layout = responsiveTester.testResultsLayout(viewports.tablet.width);
      
      expect(layout.breakpoint).toBe('tablet');
      expect(layout.resultsLayout).toBeDefined();
      expect(layout.resultsLayout.gridColumns).toBe('1fr');
    });

    test('should maintain single-column layout on mobile', () => {
      const layout = responsiveTester.testResultsLayout(viewports.mobile.width);
      
      expect(layout.breakpoint).toBe('mobile');
      expect(layout.resultsLayout).toBeDefined();
      expect(layout.resultsLayout.gridColumns).toBe('1fr');
    });

    test('should make projects table scrollable on small screens', () => {
      const mobileLayout = responsiveTester.testResultsLayout(viewports.mobile.width);
      const desktopLayout = responsiveTester.testResultsLayout(viewports.desktop.width);
      
      expect(mobileLayout.projectsTable).toBeDefined();
      expect(mobileLayout.projectsTable.overflowX).toBe('auto');
      expect(desktopLayout.projectsTable).toBeDefined();
    });
  });

  describe('Architecture Grid Responsiveness', () => {
    test('should display multi-column architecture grid on desktop', () => {
      const layout = responsiveTester.testResultsLayout(viewports.desktop.width);
      
      expect(layout.architectureGrid).toBeDefined();
      expect(layout.architectureGrid.display).toBe('grid');
      expect(layout.architectureGrid.gridColumns).toContain('minmax');
    });

    test('should use single-column architecture grid on tablet and mobile', () => {
      const tabletLayout = responsiveTester.testResultsLayout(viewports.tablet.width);
      const mobileLayout = responsiveTester.testResultsLayout(viewports.mobile.width);
      
      expect(tabletLayout.architectureGrid.gridColumns).toBe('1fr');
      expect(mobileLayout.architectureGrid.gridColumns).toBe('1fr');
    });
  });

  describe('Button Layout Responsiveness', () => {
    test('should display buttons inline on desktop', () => {
      const buttonLayout = responsiveTester.testButtonLayout(viewports.desktop.width);
      
      expect(buttonLayout.breakpoint).toBe('desktop');
      expect(buttonLayout.allVisible).toBe(true);
      expect(buttonLayout.buttonCount).toBeGreaterThan(0);
    });

    test('should stack buttons on mobile', () => {
      const buttonLayout = responsiveTester.testButtonLayout(viewports.mobile.width);
      
      expect(buttonLayout.breakpoint).toBe('mobile');
      expect(buttonLayout.allVisible).toBe(true);
      
      // On mobile, buttons should have full width and margin bottom
      buttonLayout.buttons.forEach(button => {
        expect(button.width).toBe('100%');
        expect(button.marginBottom).toBe('10px');
      });
    });

    test('should maintain button accessibility across screen sizes', () => {
      Object.values(viewports).forEach(viewport => {
        const buttonLayout = responsiveTester.testButtonLayout(viewport.width);
        expect(buttonLayout.allVisible).toBe(true);
      });
    });
  });

  describe('Element Visibility Tests', () => {
    const criticalElements = [
      'CustomerName',
      'oppName', 
      'oppDescription',
      'region',
      'closeDate',
      'analyzeBtn',
      'resetBtn',
      'arrValue',
      'mrrValue',
      'confidence'
    ];

    test('should keep all critical elements visible on desktop', () => {
      criticalElements.forEach(elementId => {
        const visibility = responsiveTester.testElementVisibility(elementId, viewports.desktop.width);
        expect(visibility.exists).toBe(true);
        expect(visibility.visible).toBe(true);
      });
    });

    test('should keep all critical elements visible on tablet', () => {
      criticalElements.forEach(elementId => {
        const visibility = responsiveTester.testElementVisibility(elementId, viewports.tablet.width);
        expect(visibility.exists).toBe(true);
        expect(visibility.visible).toBe(true);
      });
    });

    test('should keep all critical elements visible on mobile', () => {
      criticalElements.forEach(elementId => {
        const visibility = responsiveTester.testElementVisibility(elementId, viewports.mobile.width);
        expect(visibility.exists).toBe(true);
        expect(visibility.visible).toBe(true);
      });
    });
  });

  describe('Accessibility Responsiveness', () => {
    test('should maintain keyboard navigation on all screen sizes', () => {
      Object.values(viewports).forEach(viewport => {
        const accessibility = responsiveTester.testAccessibility(viewport.width);
        
        expect(accessibility.focusableCount).toBeGreaterThan(0);
        expect(accessibility.allFocusable).toBe(true);
        expect(accessibility.tabOrder.length).toBeGreaterThan(0);
      });
    });

    test('should maintain proper label associations across screen sizes', () => {
      Object.values(viewports).forEach(viewport => {
        const accessibility = responsiveTester.testAccessibility(viewport.width);
        
        expect(accessibility.labels.total).toBeGreaterThan(0);
        expect(accessibility.labels.associated).toBeGreaterThan(0);
        // Most labels should be properly associated
        expect(accessibility.labels.associated / accessibility.labels.total).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Touch Interaction Tests', () => {
    test('should provide touch-friendly targets on mobile', () => {
      const touchTests = responsiveTester.testTouchInteractions(viewports.mobile.width);
      
      expect(touchTests.breakpoint).toBe('mobile');
      expect(touchTests.touchTargetCount).toBeGreaterThan(0);
      
      // Most touch targets should be touch-friendly (44px minimum)
      const touchFriendlyRatio = touchTests.touchTargets.filter(t => t.touchFriendly).length / touchTests.touchTargets.length;
      expect(touchFriendlyRatio).toBeGreaterThan(0.8);
    });

    test('should maintain touch targets on tablet', () => {
      const touchTests = responsiveTester.testTouchInteractions(viewports.tablet.width);
      
      expect(touchTests.breakpoint).toBe('tablet');
      expect(touchTests.touchTargetCount).toBeGreaterThan(0);
      
      // Touch targets should still be accessible on tablet
      const touchFriendlyRatio = touchTests.touchTargets.filter(t => t.touchFriendly).length / touchTests.touchTargets.length;
      expect(touchFriendlyRatio).toBeGreaterThan(0.7);
    });
  });

  describe('Cross-Device Consistency', () => {
    test('should maintain consistent field count across devices', () => {
      const desktopLayout = responsiveTester.testFormLayout(viewports.desktop.width);
      const tabletLayout = responsiveTester.testFormLayout(viewports.tablet.width);
      const mobileLayout = responsiveTester.testFormLayout(viewports.mobile.width);
      
      expect(desktopLayout.fieldCount).toBe(tabletLayout.fieldCount);
      expect(tabletLayout.fieldCount).toBe(mobileLayout.fieldCount);
    });

    test('should maintain consistent button count across devices', () => {
      const desktopButtons = responsiveTester.testButtonLayout(viewports.desktop.width);
      const tabletButtons = responsiveTester.testButtonLayout(viewports.tablet.width);
      const mobileButtons = responsiveTester.testButtonLayout(viewports.mobile.width);
      
      expect(desktopButtons.buttonCount).toBe(tabletButtons.buttonCount);
      expect(tabletButtons.buttonCount).toBe(mobileButtons.buttonCount);
    });

    test('should maintain data accessibility across all screen sizes', () => {
      const criticalDataElements = ['arrValue', 'mrrValue', 'confidence', 'methodologyContent'];
      
      Object.values(viewports).forEach(viewport => {
        criticalDataElements.forEach(elementId => {
          const visibility = responsiveTester.testElementVisibility(elementId, viewport.width);
          expect(visibility.exists).toBe(true);
          expect(visibility.visible).toBe(true);
        });
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should not hide critical content on any screen size', () => {
      const criticalSections = [
        'opportunityForm',
        'projections-section',
        'analysis-section',
        'projects-section',
        'architecture-section'
      ];
      
      Object.values(viewports).forEach(viewport => {
        criticalSections.forEach(sectionClass => {
          const element = responsiveTester.document.querySelector(`.${sectionClass}`) || 
                         responsiveTester.document.getElementById(sectionClass);
          
          if (element) {
            const visibility = responsiveTester.testElementVisibility(element.id || sectionClass, viewport.width);
            expect(visibility.visible).toBe(true);
          }
        });
      });
    });

    test('should maintain reasonable layout performance across screen sizes', () => {
      // Test that layout calculations don't become overly complex
      Object.values(viewports).forEach(viewport => {
        const formLayout = responsiveTester.testFormLayout(viewport.width);
        const resultsLayout = responsiveTester.testResultsLayout(viewport.width);
        
        // Layouts should be defined and functional
        expect(formLayout.formDisplay).toBeDefined();
        expect(resultsLayout.resultsLayout).toBeDefined();
        
        // Grid layouts should be simplified on smaller screens
        if (viewport.width <= 767) { // Mobile
          expect(formLayout.gridColumns).not.toContain('1fr 1fr');
        }
      });
    });
  });
});