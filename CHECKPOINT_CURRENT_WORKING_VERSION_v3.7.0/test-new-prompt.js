// Simple test to verify the new prompt is working
require('dotenv').config();

async function testNewPrompt() {
  try {
    console.log('Testing new prompt version 8...');
    console.log('Current prompt ID:', process.env.CATAPULT_ANALYSIS_PROMPT_ID);
    
    const testData = {
      CustomerName: "Test Customer",
      region: "United States", 
      closeDate: "2025-03-01",
      oppName: "Test Migration",
      oppDescription: "Test cloud migration project to verify the new prompt analyzes all available historical data instead of limiting to subsets."
    };

    const response = await fetch('http://localhost:8123/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log('Status:', response.status);
    console.log('Fallback mode:', result.fallbackMode || false);
    
    if (result.methodology) {
      console.log('\n=== METHODOLOGY CHECK ===');
      console.log('Methodology (first 200 chars):');
      console.log(result.methodology.substring(0, 200) + '...');
      
      // Check for new vs old language
      const hasOldLanguage = result.methodology.includes('Selected a focused subset') || 
                            result.methodology.includes('M=') ||
                            result.methodology.includes('85%');
      
      const hasNewLanguage = result.methodology.includes('Analyzed ALL') ||
                            result.methodology.includes('ALL N=');
      
      console.log('\n=== PROMPT VERSION CHECK ===');
      console.log('❌ Contains OLD subset language:', hasOldLanguage);
      console.log('✅ Contains NEW full analysis language:', hasNewLanguage);
      
      if (hasNewLanguage && !hasOldLanguage) {
        console.log('\n🎉 SUCCESS! New prompt is working correctly!');
        console.log('The system is now analyzing ALL available data.');
      } else if (hasOldLanguage) {
        console.log('\n⚠️  WARNING: Still using old prompt logic');
        console.log('The system is still limiting data analysis to subsets.');
      } else {
        console.log('\n❓ UNCLEAR: Cannot determine prompt version from methodology');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewPrompt();