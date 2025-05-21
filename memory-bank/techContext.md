# Tech Context: LAWSA Compiler

## Technologies Used
- **C99**: Implementation language for the compiler itself.
- **x86-64 Assembly**: Target output for generated code.
- **Standard C Library**: Used for runtime support and test programs.
- **Make** (or equivalent build system): For building the compiler and running tests.

## Development Setup
- Cross-platform: Developed and tested on Windows and Linux.
- Command-line interface for compilation and testing.
- Modular source files: `tokenize.c`, `parse.c`, `codegen.c`, `main.c`, `lawsa.h`, and test files.
- Test suite includes both positive and negative C programs.

## Technical Constraints
- Focus on educational clarity over maximum performance or full C standard compliance.
- No external dependencies beyond standard C library and assembler/linker.
- Incremental feature development: not all C features are supported at once.

## Dependencies
- Standard C compiler (for building LAWSA itself).
- x86-64 assembler and linker (e.g., `nasm`, `gcc`, or `clang` for assembling and linking output).
- (Optional) `make` or similar tool for build automation. 