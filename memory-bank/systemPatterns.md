# System Patterns: LAWSA Compiler

## System Architecture
- **Modular pipeline:** Tokenizer → Parser → Semantic Analyzer → Code Generator → Preprocessor (integrated at tokenization phase).
- **AST-based design:** Parser builds an Abstract Syntax Tree (AST) for all code, which is then traversed for semantic analysis and codegen.
- **Symbol tables:** Used for variables, types, functions, typedefs, and macros.
- **Error handling:** Centralized error reporting with error counting and recovery for multiple errors per run.

## Key Technical Decisions
- **Unified type/declarator parsing:** All declarations use a single parsing path for type specifiers and declarators, supporting all C types and modifiers.
- **Preprocessor integration:** Preprocessing occurs during tokenization, supporting macros, includes, and conditionals.
- **Test-driven development:** Each new feature or bugfix is accompanied by new or updated tests.
- **Educational clarity:** Code is written for readability and extensibility, with comments and modularity prioritized.

## Design Patterns
- **Visitor pattern:** Used in AST traversal for codegen and semantic analysis.
- **Table-driven parsing:** Symbol and macro tables for fast lookup and extensibility.
- **Error recovery:** Parser continues after errors to report as many issues as possible in one run.

## Component Relationships
- **Tokenizer** feeds tokens to the **Parser**.
- **Parser** builds the AST and populates symbol tables.
- **Semantic Analyzer** checks types and function signatures using symbol/type tables.
- **Code Generator** emits x86-64 assembly from the AST.
- **Preprocessor** expands macros and handles includes/conditionals during tokenization. 