# Product Context: LAWSA Compiler

## Why This Project Exists
LAWSA is designed as an educational tool to demystify compiler construction. It provides a hands-on, incremental approach to building a real C compiler, making compiler theory accessible to students, hobbyists, and educators.

## Problems It Solves
- Lack of approachable, stepwise compiler projects for C.
- Need for a practical, working example that covers all major compiler phases (lexing, parsing, semantic analysis, codegen, preprocessor).
- Desire for a project that can be extended and experimented with, supporting learning by doing.

## How It Should Work
- Users write C code (with growing feature support) and compile it using LAWSA.
- The compiler translates C code to x86-64 assembly, which can be assembled and run on real hardware or emulators.
- The system provides clear error messages and diagnostics to aid learning.
- The codebase is modular, well-documented, and easy to extend.

## User Experience Goals
- Simple command-line interface.
- Fast feedback: compile, run, and debug quickly.
- Clear, actionable error messages and warnings.
- Comprehensive test suite for self-checking and regression prevention.
- Documentation and code comments to support self-guided learning. 