# LAWSA Compiler Enhancement Roadmap

This roadmap outlines the planned enhancements to transform LAWSA into a more complete educational compiler.

## Phase 1: Core Improvements

### Fix Existing Issues
- [ ] Fix comparison operator handling to ensure correct operand ordering
- [ ] Improve the loop handling to properly support local variables
- [ ] Add clear error messages for syntax and semantic errors

### Basic Data Structures
- [ ] Add support for arrays
  - [ ] Declaration and initialization
  - [ ] Array indexing
  - [ ] Array parameter passing
- [ ] Add support for pointers
  - [ ] Pointer declarations
  - [ ] Pointer dereferencing
  - [ ] Pointer arithmetic
  - [ ] Address-of operator

## Phase 2: Type System Enhancements

- [ ] Support for additional primitive types
  - [ ] char
  - [ ] float/double
  - [ ] long, short, unsigned variations
- [ ] Add support for structs and unions
  - [ ] Declaration and definition
  - [ ] Member access
  - [ ] Member assignment
- [ ] Add typedefs for cleaner type definitions
- [ ] Implement proper type checking and conversion

## Phase 3: Advanced Features

- [ ] Preprocessor support
  - [ ] #include directive
  - [ ] #define for constants and macros
  - [ ] Conditional compilation (#ifdef, #ifndef, etc.)
- [ ] Standard library integration
  - [ ] Basic I/O functions
  - [ ] Memory management (malloc, free)
  - [ ] String manipulation
- [ ] Optimization passes
  - [ ] Constant folding
  - [ ] Dead code elimination
  - [ ] Register allocation

## Phase 4: Developer Experience

- [ ] Improved error reporting
  - [ ] Line and column information
  - [ ] Suggestions for fixes
  - [ ] Color-coded output
- [ ] Compiler flags for various options
  - [ ] Optimization levels
  - [ ] Debug information
  - [ ] Warning levels
- [ ] Documentation
  - [ ] Developer guide explaining the compiler internals
  - [ ] Example programs showcasing language features
  - [ ] Tutorial for extending the compiler

## Educational Components

- [ ] Add comments throughout the code explaining compiler concepts
- [ ] Create visualization tools for:
  - [ ] Token stream
  - [ ] Abstract Syntax Tree
  - [ ] Symbol tables
  - [ ] Assembly generation
- [ ] Create step-by-step walkthroughs for compiler phases
- [ ] Add exercises for students to implement specific features

## Implementation Strategy

For each feature, follow this process:
1. Update the AST structure to represent the new feature
2. Modify the tokenizer to recognize new tokens if needed
3. Update the parser to handle the new syntax
4. Extend the code generator to produce correct assembly
5. Add appropriate test cases
6. Document the feature implementation

## Example Implementation: Array Support

### 1. Update AST Structure
```c
// Add to Type structure in lawsa.h
struct Type {
    TypeKind kind;
    Type *ptr_to;      // Used for pointer types
    Type *return_type; // Used for function types
    Token *name;
    int array_size;    // New field for array size
};

// Add new node kind
typedef enum {
    // ... existing kinds
    ND_ARRAY,      // Array indexing
    // ... other kinds
} NodeKind;

// Add to Node structure
struct Node {
    // ... existing fields
    Node *index;       // Array index expression
    // ... other fields
};
```

### 2. Tokenizer Changes
No significant changes needed for basic array support.

### 3. Parser Changes
```c
// Add to primary() function
Node *primary(Function *fn) {
    // ... existing code

    // Check for array indexing
    if (consume("[")) {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_ARRAY;
        node->lhs = expr; // Base array
        node->index = expr(fn); // Index expression
        expect("]");
        return node;
    }

    // ... rest of function
}

// Add array type parsing to type_specifier()
Type *type_specifier() {
    // ... existing code for basic types

    // Check for array declaration
    if (consume("[")) {
        int size = expect_number();
        expect("]");
        Type *array_type = calloc(1, sizeof(Type));
        array_type->kind = TY_ARRAY;
        array_type->array_size = size;
        array_type->ptr_to = base_type;
        return array_type;
    }

    // ... rest of function
}
```

### 4. Code Generator Changes
```c
// In gen_expr()
case ND_ARRAY: {
    // Calculate the address of the array element
    // Generate address of base array
    gen_addr(node->lhs);
    
    // Generate index expression
    gen_expr(node->index);
    
    // Calculate offset (index * size of element)
    printf("  pop rax\n"); // index value
    printf("  imul rax, %d\n", node->lhs->type->ptr_to->size);
    
    // Add to base address
    printf("  pop rdi\n"); // base address
    printf("  add rax, rdi\n");
    
    // Load the value from the calculated address
    printf("  mov rax, [rax]\n");
    printf("  push rax\n");
    return;
}
```

By following this roadmap, LAWSA can be transformed into a more complete compiler suitable for educational purposes, demonstrating more advanced compiler concepts and supporting a larger subset of the C language. 