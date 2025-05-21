# LAWSA Compiler IDE

A simple IDE for the LAWSA C Compiler that provides an integrated environment for writing, compiling, and running C programs.

## Features

- Code editor with syntax highlighting
- One-click compilation and execution
- Assembly code viewer
- Program output display
- Error reporting
- Example programs to get started
- File management capabilities

## Requirements

The IDE requires the following dependencies:

- **Python 3.x**: The IDE is written in Python, so you'll need Python 3.6 or higher installed.
- **Tkinter**: The GUI library used by the IDE (usually included with Python installations).
- **LAWSA Compiler**: The LAWSA executable should be placed in the same directory as the IDE.
- **GCC**: Used to compile the assembly output from LAWSA into an executable.

## Installation

1. Ensure Python 3.x is installed on your system.
2. Make sure the LAWSA compiler executable is available in the same directory as the IDE script.
3. Verify that GCC is installed and available in your system PATH.

## Usage

1. Run the IDE by executing:

```
python lawsa_ide.py
```

2. The IDE will open with a sample program loaded.
3. You can start by modifying this program or creating a new one.
4. Click "Compile" to compile your code, or "Compile & Run" to compile and execute it.
5. The assembly code will be displayed in the "Assembly" tab.
6. Program output will appear in the "Program Output" tab.
7. Any errors will be shown in the "Errors" tab.

## Example Programs

The IDE includes several example programs to help you get started:

- **Hello World**: A simple program that returns a value
- **Variables and Arithmetic**: Demonstrates basic variable manipulation and math operations
- **Conditional Statements**: Shows how to use if-else statements
- **Loops**: Demonstrates while loop functionality
- **Arrays**: Shows array declaration and manipulation
- **Pointers**: Demonstrates basic pointer usage
- **Functions**: Shows function declaration and calling

## Keyboard Shortcuts

- **Ctrl+N**: New file
- **Ctrl+O**: Open file
- **Ctrl+S**: Save file
- **Ctrl+Shift+S**: Save file as
- **F7**: Compile
- **F5**: Compile and run

## Options

- **Run after compile**: Automatically runs the program after successful compilation
- **Keep intermediate files**: Preserves the generated assembly files and logs after compilation

## Troubleshooting

If you encounter issues:

1. Verify that the LAWSA compiler is in the same directory as the IDE.
2. Check that GCC is properly installed and in your system PATH.
3. Look at the Errors tab for any compilation error messages.

## License

This IDE is available under the MIT License. See the LICENSE file for more details. 