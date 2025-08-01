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

// Local fallback methods for AI functionality
function generateCompletions(context, cursorPosition) {
  const suggestions = [];
  
  // Basic C keywords and functions
  const cKeywords = ['int', 'char', 'float', 'double', 'void', 'if', 'else', 'while', 'for', 'return', 'printf', 'scanf'];
  const cFunctions = ['main()', 'printf()', 'scanf()', 'strlen()', 'strcpy()', 'strcmp()'];
  
  // Add relevant suggestions based on context
  if (context.includes('int ') || context.includes('char ') || context.includes('float ')) {
    suggestions.push(...cKeywords.slice(0, 5));
  }
  
  if (context.includes('#include') || context.includes('stdio')) {
    suggestions.push(...cFunctions);
  }
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

function refactorCode(code, requirements = '') {
  // Use the existing refactorCCode function
  const refactoredCode = refactorCCode ? refactorCCode(code) : code;
  return {
    refactoredCode,
    explanation: 'Applied local formatting and best practices',
    changes: ['Fixed indentation', 'Fixed spacing', 'Applied C best practices']
  };
}

function diagnoseError(errorMessage, code) {
  let diagnosis = 'Unable to analyze error automatically.';
  let suggestedFix = 'Please check the syntax and try again.';
  let explanation = 'Basic error analysis performed.';

  // Simple error pattern matching
  if (errorMessage.includes('syntax error')) {
    diagnosis = 'Syntax error detected in the code.';
    suggestedFix = 'Check for missing semicolons, brackets, or parentheses.';
  } else if (errorMessage.includes('undeclared')) {
    diagnosis = 'Undeclared variable or function used.';
    suggestedFix = 'Make sure all variables are declared before use.';
  } else if (errorMessage.includes('undefined reference')) {
    diagnosis = 'Function or variable referenced but not defined.';
    suggestedFix = 'Implement the missing function or check the spelling.';
  }

  return { diagnosis, suggestedFix, explanation };
}

function generateCode(requirements, context = '') {
  // Simple code template based on requirements
  let generatedCode = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;
  
  if (requirements.toLowerCase().includes('calculator')) {
    generatedCode = `#include <stdio.h>

int main() {
    int a, b, result;
    char operation;
    
    printf("Enter first number: ");
    scanf("%d", &a);
    
    printf("Enter operation (+, -, *, /): ");
    scanf(" %c", &operation);
    
    printf("Enter second number: ");
    scanf("%d", &b);
    
    switch(operation) {
        case '+':
            result = a + b;
            break;
        case '-':
            result = a - b;
            break;
        case '*':
            result = a * b;
            break;
        case '/':
            if(b != 0)
                result = a / b;
            else {
                printf("Error: Division by zero!\\n");
                return 1;
            }
            break;
        default:
            printf("Error: Invalid operation!\\n");
            return 1;
    }
    
    printf("Result: %d\\n", result);
    return 0;
}`;
  }
  
  return {
    generatedCode,
    explanation: 'Basic code template generated'
  };
}

function reviewCode(code, focusAreas = []) {
  const issues = [];
  const suggestions = [];
  
  // Basic checks
  if (!code.includes('#include')) {
    issues.push('Missing header includes');
    suggestions.push('Add appropriate #include statements');
  }
  
  if (!code.includes('return 0;') && code.includes('int main')) {
    issues.push('Missing return statement in main function');
    suggestions.push('Add "return 0;" at the end of main function');
  }
  
  if (code.includes('printf') && !code.includes('#include <stdio.h>')) {
    issues.push('Using printf without including stdio.h');
    suggestions.push('Add #include <stdio.h> at the top');
  }

  const review = `Basic code review completed. Found ${issues.length} issues and ${suggestions.length} suggestions.`;
  
  return { review, suggestions, issues };
}

function getBasicSuggestions(context, cursorPosition) {
  return generateCompletions(context, cursorPosition);
}

// Create a LocalRefactorService class
class LocalRefactorService {
  generateCompletions(context, cursorPosition) {
    return generateCompletions(context, cursorPosition);
  }
  
  refactorCode(code, requirements = '') {
    return refactorCode(code, requirements);
  }
  
  diagnoseError(errorMessage, code) {
    return diagnoseError(errorMessage, code);
  }
  
  generateCode(requirements, context = '') {
    return generateCode(requirements, context);
  }
  
  reviewCode(code, focusAreas = []) {
    return reviewCode(code, focusAreas);
  }
  
  getBasicSuggestions(context, cursorPosition) {
    return getBasicSuggestions(context, cursorPosition);
  }
}

module.exports = {
  refactorCCode,
  LocalRefactorService
};

// Export as default for require('./localRefactorService')
module.exports = LocalRefactorService;
