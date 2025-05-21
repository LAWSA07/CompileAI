# LAWSA Compiler Implementation Plan

This document outlines the implementation schedule for adding all remaining features to the LAWSA compiler.

## Phase 1: Core Data Structures (Week 1-2)

- ✅ **Arrays** - Basic array support
  - Array declarations
  - Array indexing operations
  - Array parameter passing

- **Pointers** (Week 1)
  - ✅ Address-of operator (&)
  - ✅ Dereference operator (*)
  - Pointer arithmetic
  - Pointer parameter passing

- **Fix Known Issues** (Week 2)
  - Fix comparison operator handling
  - Fix loop handling with local variables
  - Improve error messages

## Phase 2: Type System (Week 3-4)

- **Additional Primitive Types** (Week 3)
  - char
  - long, short
  - unsigned variations

- **Structures** (Week 4)
  - Structure declarations
  - Member access
  - Structure assignment
  - Passing structures to functions

## Phase 3: Advanced Features (Week 5-6)

- **Static Typing** (Week 5)
  - Type checking
  - Type conversion
  - Type errors

- **Basic Preprocessor** (Week 6)
  - Simple #include mechanism
  - #define for constants
  - Conditional compilation

## Phase 4: Optimization & Finishing (Week 7-8)

- **Optimizations** (Week 7)
  - Constant folding
  - Dead code elimination
  - Register allocation

- **Standard Library Support** (Week 8)
  - Basic I/O functions
  - Memory management
  - String manipulation

## Implementation Checklist

### Pointer Support (This Week)
- [x] Update TypeKind to include TY_PTR
- [x] Update NodeKind to include ND_ADDR and ND_DEREF
- [x] Add pointer_to() function in parser
- [x] Handle & and * operators in unary()
- [x] Implement code generation for pointers
- [ ] Add pointer arithmetic in add()
- [ ] Add pointer type checking

### Structure Support (Next Week)
- [ ] Update TypeKind to include TY_STRUCT
- [ ] Add Member structure for struct members
- [ ] Add struct_decl() parser function
- [ ] Handle structure member access
- [ ] Implement code generation for structures
- [ ] Support structure assignment

## Testing Strategy

For each feature:
1. Create minimal test cases that isolate the feature
2. Update run_tests.bat to include the new tests
3. Verify both positive tests (feature works) and negative tests (proper error handling)
4. Add more complex integration tests combining multiple features

## Documentation

For each implemented feature:
1. Update the implementation guide with details
2. Provide example code demonstrating the feature
3. Document any known limitations or edge cases 