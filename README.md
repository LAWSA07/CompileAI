# LAWSA Compiler

LAWSA (Let's Approach Writing a Simple Assembler) is an educational compiler for a subset of C, designed for learning compiler concepts.

## Features

- Supports basic C syntax including:
  - Integer arithmetic and logic operations
  - Control structures (if/else, while, for)
  - Function definitions and calls
  - Arrays and pointers
  - Character arrays

## Using LAWSA

There are two ways to use the LAWSA compiler:

### 1. GUI Interface (LAWSA-IDE)

For interactive coding and testing, use the LAWSA-IDE:

```
python lawsa-ide.py
```

The IDE provides:
- Code editor with syntax highlighting
- One-click compilation and execution
- Assembly code viewer
- Output panel for program results

### 2. Command Line Interface

For batch processing or scripting, use the command-line interface:

```
lawsa-compile.bat example.c [--run] [--keep] [--asm]
```

Options:
- `--run`: Execute the program after compilation
- `--keep`: Keep intermediate files (assembly, object files)
- `--asm`: Display the generated assembly code

## Example Program

```c
int main() {
    int a = 5;
    int b = 10;
    return a + b;
}
```

## Compiler Architecture

LAWSA is structured as a simple multi-pass compiler:
1. Lexical analysis - Tokenizes the input source
2. Parsing - Builds an Abstract Syntax Tree (AST)
3. Code generation - Produces x86 assembly code

The compiler outputs assembly code that can be assembled and linked using GCC.

## Limitations

As an educational compiler, LAWSA has several limitations:
- Limited standard library support
- No support for structs or unions
- Limited type checking
- No optimization passes

## Getting Started

1. Ensure GCC is installed and available in your PATH
2. Run the LAWSA-IDE or use the command-line interface
3. Write or load a C program
4. Compile and run

## License

This project is open source and available for educational purposes.

## Project Structure

- `tokenize.c` - Lexical analyzer (tokenizer)
- `parse.c` - Parser (AST builder)
- `codegen.c` - Code generator (assembly output)
- `type.c` - Type system
- `main.c` - Entry point

## Educational Purpose

This is intended as an educational project that demonstrates compiler principles while gradually adding real-world compiler features. It's not meant to be a production compiler but rather a learning tool to understand how compilers work. 