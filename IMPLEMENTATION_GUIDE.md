# LAWSA Compiler Implementation Guide

This guide provides detailed instructions for implementing the features outlined in the ROADMAP.md file.

## Understanding the Compiler Architecture

LAWSA follows a traditional compiler architecture:

1. **Lexical Analysis (tokenize.c)**: Breaks the source code into tokens
2. **Syntax Analysis (parse.c)**: Builds an Abstract Syntax Tree (AST)
3. **Code Generation (codegen.c)**: Translates the AST into assembly

To add new features, you'll need to make changes to all three components.

## Implementing Arrays

### Step 1: Update Data Structures

First, modify `lawsa.h` to add array types:

```c
// Add a new type kind for arrays
typedef enum {
    TY_INT,     // int
    TY_ARRAY,   // Array
    // Add other types here
} TypeKind;

// Update Type structure
struct Type {
    TypeKind kind;     // Type kind
    Type *ptr_to;      // Pointer to (used for pointer types)
    Type *return_type; // Return type (used for function types)
    Token *name;       // Variable name
    
    // Add this for arrays
    int array_size;    // Size of array (number of elements)
    int element_size;  // Size of each element in bytes
};

// Add a new node kind for array access
typedef enum {
    // Existing node kinds...
    ND_ARRAY_SUBSCRIPT, // Array subscript (a[i])
    // Other node kinds...
} NodeKind;

// Update Node structure for array access
struct Node {
    // Existing fields...
    
    // For array subscript
    Node *index;       // Array index expression
};
```

### Step 2: Update Parser

Modify `parse.c` to handle array declarations and array accesses:

```c
// Add to primary() function for array access
Node *primary(Function *fn) {
    // ... existing code
    
    if (tok) {
        // ... existing code for variable references
        
        // Check for array access
        if (consume("[")) {
            Node *node = calloc(1, sizeof(Node));
            node->kind = ND_ARRAY_SUBSCRIPT;
            node->lhs = var_node; // The array variable
            node->index = expr(fn); // The index expression
            expect("]");
            return node;
        }
    }
}

// Add to type_specifier() for array declarations
Type *type_specifier() {
    // ... existing code
    
    // Check for array declaration
    if (consume("[")) {
        int size = expect_number();
        expect("]");
        
        Type *array_type = calloc(1, sizeof(Type));
        array_type->kind = TY_ARRAY;
        array_type->array_size = size;
        array_type->ptr_to = base_type; // Element type
        array_type->element_size = 4; // Assume int for now (4 bytes)
        
        return array_type;
    }
}
```

### Step 3: Update Code Generator

Modify `codegen.c` to generate code for array accesses:

```c
// Add to gen_expr()
static void gen_expr(Node *node) {
    // ... existing code
    
    switch (node->kind) {
        // ... existing cases
        
        case ND_ARRAY_SUBSCRIPT: {
            // Generate the address calculation
            gen_addr(node->lhs); // Put the base address on stack
            gen_expr(node->index); // Put the index on stack
            
            // Calculate element address
            printf("  pop rax\n"); // Index
            printf("  imul rax, %d\n", node->lhs->type->element_size);
            printf("  pop rdi\n"); // Base address
            printf("  add rax, rdi\n"); // Base + Index*Size
            
            // Load the value at the calculated address
            printf("  mov rax, [rax]\n");
            printf("  push rax\n");
            return;
        }
    }
}

// Add a function to generate the address of a variable
static void gen_addr(Node *node) {
    switch (node->kind) {
        case ND_LVAR:
            printf("  mov rax, rbp\n");
            printf("  sub rax, %d\n", node->offset);
            printf("  push rax\n");
            return;
            
        case ND_ARRAY_SUBSCRIPT:
            // If this is a nested array access, calculate address
            gen_addr(node->lhs);
            gen_expr(node->index);
            
            printf("  pop rax\n"); // Index
            printf("  imul rax, %d\n", node->lhs->type->element_size);
            printf("  pop rdi\n"); // Base address
            printf("  add rax, rdi\n");
            printf("  push rax\n");
            return;
            
        default:
            error("not an lvalue");
    }
}
```

## Implementing Pointers

### Step 1: Update Data Structures

Add pointer types to `lawsa.h`:

```c
// Add pointer type kind
typedef enum {
    TY_INT,     // int
    TY_ARRAY,   // Array
    TY_PTR,     // Pointer
    // Other types...
} TypeKind;

// Node kinds for pointer operations
typedef enum {
    // Existing node kinds...
    ND_ADDR,    // Address-of operator (&)
    ND_DEREF,   // Dereference operator (*)
    // Other node kinds...
} NodeKind;
```

### Step 2: Update Parser

Modify `parse.c` to handle pointer declarations and operations:

```c
// Add to unary() for address-of and dereference
Node *unary(Function *fn) {
    if (consume("&")) {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_ADDR;
        node->lhs = unary(fn);
        return node;
    }
    
    if (consume("*")) {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_DEREF;
        node->lhs = unary(fn);
        return node;
    }
    
    // ... existing code
}

// Add to declarator() for pointer variable declarations
Type *declarator(Type *base_type) {
    while (consume("*")) {
        Type *pointer_type = calloc(1, sizeof(Type));
        pointer_type->kind = TY_PTR;
        pointer_type->ptr_to = base_type;
        base_type = pointer_type;
    }
    
    // ... rest of declarator code
}
```

### Step 3: Update Code Generator

Modify `codegen.c` to handle pointers:

```c
// Add to gen_expr() for address and dereference
static void gen_expr(Node *node) {
    // ... existing code
    
    switch (node->kind) {
        // ... existing cases
        
        case ND_ADDR:
            gen_addr(node->lhs);
            return;
            
        case ND_DEREF:
            gen_expr(node->lhs);
            printf("  pop rax\n");
            printf("  mov rax, [rax]\n");
            printf("  push rax\n");
            return;
    }
}
```

## Implementing Structures

### Step 1: Update Data Structures

Add structure types to `lawsa.h`:

```c
// Add struct type kind
typedef enum {
    // Existing types...
    TY_STRUCT,  // Structure
    // Other types...
} TypeKind;

// Structure for struct members
typedef struct Member Member;
struct Member {
    Member *next;    // Next member
    Type *type;      // Type of member
    char *name;      // Name of member
    int offset;      // Offset from start of struct
};

// Add to Type structure
struct Type {
    // Existing fields...
    Member *members; // For struct types
    int size;        // Total size of the struct
};

// Add struct access node kind
typedef enum {
    // Existing node kinds...
    ND_MEMBER,   // Struct member access
    // Other node kinds...
} NodeKind;

// Add to Node structure
struct Node {
    // Existing fields...
    Member *member;  // For struct member access
};
```

### Step 2: Update Parser

Add structure parsing to `parse.c`:

```c
// Add struct declaration
Type *struct_decl() {
    expect("struct");
    Token *tag = consume_ident();
    
    expect("{");
    
    Type *type = calloc(1, sizeof(Type));
    type->kind = TY_STRUCT;
    
    // Parse members
    Member head = {};
    Member *cur = &head;
    int offset = 0;
    
    while (!consume("}")) {
        Type *member_type = type_specifier();
        Token *member_name = consume_ident();
        
        Member *member = calloc(1, sizeof(Member));
        member->type = member_type;
        member->name = strndup(member_name->str, member_name->len);
        member->offset = offset;
        
        offset += 4; // Assume 4 bytes for now
        
        cur->next = member;
        cur = member;
        
        expect(";");
    }
    
    type->members = head.next;
    type->size = offset;
    
    return type;
}

// Add to primary() for struct member access
Node *primary(Function *fn) {
    // ... existing code
    
    Node *node = /* existing primary expression */;
    
    while (consume(".")) {
        Token *member_name = consume_ident();
        
        Node *member_node = calloc(1, sizeof(Node));
        member_node->kind = ND_MEMBER;
        member_node->lhs = node;
        
        // Find the member in the struct
        for (Member *mem = node->type->members; mem; mem = mem->next) {
            if (mem->len == member_name->len && 
                !memcmp(mem->name, member_name->str, mem->len)) {
                member_node->member = mem;
                break;
            }
        }
        
        if (!member_node->member)
            error("member not found");
            
        node = member_node;
    }
    
    return node;
}
```

### Step 3: Update Code Generator

Modify `codegen.c` to handle structures:

```c
// Add to gen_expr()
static void gen_expr(Node *node) {
    // ... existing code
    
    switch (node->kind) {
        // ... existing cases
        
        case ND_MEMBER:
            gen_addr(node->lhs);
            printf("  pop rax\n");
            printf("  add rax, %d\n", node->member->offset);
            printf("  mov rax, [rax]\n");
            printf("  push rax\n");
            return;
    }
}

// Update gen_addr()
static void gen_addr(Node *node) {
    // ... existing code
    
    switch (node->kind) {
        // ... existing cases
        
        case ND_MEMBER:
            gen_addr(node->lhs);
            printf("  pop rax\n");
            printf("  add rax, %d\n", node->member->offset);
            printf("  push rax\n");
            return;
    }
}
```

This implementation guide should help you get started with adding advanced features to the LAWSA compiler. Remember to test each feature incrementally and add proper error handling. 