# Macro Preprocessor Automated Tests

This directory contains automated tests for the macro preprocessor component of the compiler project.

## Structure
- Each `.c` file is a test case for a specific macro expansion scenario.
- Output is compared against expected results to verify correctness.

## How to Run Tests
A test runner script will be provided to automate running all tests and checking their output.

## Test Types
- Object-like macro expansion
- Function-like macro expansion
- Nested macros
- Edge cases (empty, whitespace, recursion, malformed)

## Adding New Tests
1. Add a new `.c` file with the macro(s) and code to test.
2. Add the expected output file if needed.
3. Update the test runner script if necessary. 