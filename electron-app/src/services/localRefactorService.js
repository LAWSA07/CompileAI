/**
 * Local C Code Refactoring Service
 * 
 * This module provides code refactoring functionality without relying on external APIs.
 * It uses JavaScript regex patterns to improve C code formatting and apply best practices.
 */

// Main function to refactor C code
async function refactorCCode(code) {
  console.log('Running local C code refactoring...');
  
  if (!code || !code.trim()) {
    console.error('Empty code provided');
    throw new Error('Empty code provided');
  }
  
  try {
    // Apply a sequence of formatting and improvement transformations
    let refactoredCode = code;
    
    // Fix indentation (convert tabs to spaces, normalize indentation)
    refactoredCode = fixIndentation(refactoredCode);
    
    // Fix spacing (around operators, after commas, etc.)
    refactoredCode = fixSpacing(refactoredCode);
    
    // Fix braces (consistent placement)
    refactoredCode = fixBraces(refactoredCode);
    
    // Apply C best practices
    refactoredCode = applyCBestPractices(refactoredCode);
    
    // Add header comment
    refactoredCode = `/**
 * Refactored C code
 */
${refactoredCode}`;
    
    console.log('Local refactoring completed successfully');
    return refactoredCode;
  } catch (error) {
    console.error('Error during local refactoring:', error);
    throw new Error('Local refactoring failed: ' + error.message);
  }
}

// Function to fix indentation
function fixIndentation(code) {
  // Convert tabs to spaces
  let result = code.replace(/\t/g, '    ');
  
  // Normalize line breaks
  result = result.replace(/\r\n/g, '\n');
  
  // Remove extra blank lines (no more than 2 consecutive)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

// Function to fix spacing
function fixSpacing(code) {
  let result = code;
  
  // Add space after keywords
  result = result.replace(/(if|for|while|switch|return|int|void|char|float|double)(\()/g, '$1 $2');
  
  // Add space after commas
  result = result.replace(/,([^\s])/g, ', $1');
  
  // Fix spaces around operators
  result = result.replace(/([^\s])([+\-*/%=<>!&|^])([^\s=])/g, '$1 $2 $3');
  
  // Fix spaces around assignment
  result = result.replace(/([^\s])=([^\s=])/g, '$1 = $2');
  
  // Remove space between function name and opening parenthesis
  result = result.replace(/([a-zA-Z0-9_]+)\s+\(/g, '$1(');
  
  return result;
}

// Function to fix braces
function fixBraces(code) {
  let result = code;
  
  // Add space before opening brace
  result = result.replace(/\)(\s*)\{/g, ') $1{');
  
  // Move opening braces to the same line for control structures
  result = result.replace(/\)\s*\n\s*\{/g, ') {');
  
  return result;
}

// Function to apply C best practices
function applyCBestPractices(code) {
  let result = code;
  
  // Add void to empty parameter lists in main function
  result = result.replace(/int\s+main\s*\(\s*\)/g, 'int main(void)');
  
  // Replace printf with puts for simple strings
  if (result.includes('#include <stdio.h>')) {
    result = result.replace(/printf\("([^%"]*)\\n"\);/g, 'puts("$1");');
  }
  
  // Check for missing return 0 in main
  if (result.includes('int main') && 
      !result.match(/return\s+0;\s*\n\s*}/)) {
    result = result.replace(/(\n\s*)\}/g, '$1    return 0;\n}');
  }
  
  return result;
}

module.exports = {
  refactorCCode
}; 