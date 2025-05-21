# LAWSA Compiler Project Brief

## Project Overview
LAWSA is an educational compiler that translates a subset of C code into x86-64 assembly. It's designed to be a learning tool for understanding compiler construction principles.

## Project Goals
1. Serve as an educational tool to learn compiler construction
2. Implement a compiler that supports a growing subset of C language features
3. Follow a clear roadmap to extend functionality in a structured way
4. Demonstrate core compiler concepts (lexing, parsing, code generation)

## Key Features (Current)
- Integer arithmetic
- Local variables 
- Basic control flow (if/else, while, for)
- Functions (definitions and calls with parameters)
- Blocks of statements
- Return statements
- Variable assignment

## Planned Extensions
The ROADMAP.md file outlines phases for extending the compiler with:
- Basic data structures (arrays, pointers)
- Enhanced type system (char, float/double, structs/unions)
- Preprocessor support
- Standard library integration
- Optimizations
- Developer experience improvements

## Core Components
1. **Tokenizer** (`tokenize.c`): Converts source code into tokens
2. **Parser** (`parse.c`): Builds an AST from tokens
3. **Code Generator** (`codegen.c`): Produces x86-64 assembly from the AST
4. **Main Driver** (`main.c`): Orchestrates the compilation process
5. **Header** (`lawsa.h`): Defines data structures and key function declarations

## Project Scope
This is intended as an educational project that demonstrates compiler principles while gradually adding real-world compiler features. It's not meant to be a production compiler but rather a learning tool to understand how compilers work. 