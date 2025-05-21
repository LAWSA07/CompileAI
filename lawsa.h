// lawsa.h - Main header file for the compiler
#ifndef LAWSA_H
#define LAWSA_H

#include <assert.h>
#include <ctype.h>
#include <errno.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "type.h"

// Token types
typedef enum
{
    TK_RESERVED, // Keywords or punctuators
    TK_IDENT,    // Identifiers
    TK_STR,      // String literals
    TK_NUM,      // Numeric literals
    TK_EOF,      // End-of-file markers
    TK_KEYWORD,  // Keywords (if, else, while, for, etc.)
} TokenKind;

// Token type
typedef struct Token Token;
struct Token
{
    TokenKind kind;   // Token kind
    Token *next;      // Next token
    int val;          // If kind is TK_NUM, its value
    char *str;        // Token string
    int len;          // Token length
    const char *file; // File name for error reporting
    int line;         // Line number for error reporting
    int column;       // Column number for error reporting
};

// Variable
typedef struct Var Var;
struct Var
{
    char *name; // Variable name
    int len;    // Name length
    int offset; // Offset from RBP
    Type *type; // Type
};

// Local variable
typedef struct LVar LVar;
struct LVar
{
    LVar *next; // Next variable
    char *name; // Variable name
    int len;    // Name length
    int offset; // Offset from RBP
    Type *type; // Type
};

// Forward declaration for Node
typedef struct Node Node;

// Function
typedef struct Function Function;
struct Function
{
    Function *next;    // Next function
    char *name;        // Function name
    int len;           // Name length
    LVar *params;      // Parameters
    LVar *locals;      // Local variables
    Node *body;        // Function body
    int stack_size;    // Stack size required for local variables
    Type *return_type; // Function return type
};

// AST node types
typedef enum
{
    ND_ADD,              // +
    ND_SUB,              // -
    ND_MUL,              // *
    ND_DIV,              // /
    ND_MOD,              // %
    ND_BITAND,           // &
    ND_BITOR,            // |
    ND_BITXOR,           // ^
    ND_SHL,              // <<
    ND_SHR,              // >>
    ND_NUM,              // Integer
    ND_EQ,               // ==
    ND_NE,               // !=
    ND_LT,               // <
    ND_LE,               // <=
    ND_LOGAND,           // &&
    ND_LOGOR,            // ||
    ND_ASSIGN,           // =
    ND_COND,             // Conditional expression (? :)
    ND_COMMA,            // Comma operator
    ND_MEMBER,           // Struct member access
    ND_ADDR,             // Address-of operator (&)
    ND_DEREF,            // Dereference operator (*)
    ND_NOT,              // Logical not (!)
    ND_BITNOT,           // Bitwise not (~)
    ND_CAST,             // Type cast
    ND_PRE_INC,          // Pre-increment (++x)
    ND_PRE_DEC,          // Pre-decrement (--x)
    ND_POST_INC,         // Post-increment (x++)
    ND_POST_DEC,         // Post-decrement (x--)
    ND_LVAR,             // Local variable
    ND_IF,               // if
    ND_WHILE,            // while
    ND_FOR,              // for
    ND_BLOCK,            // { ... }
    ND_SWITCH,           // switch
    ND_CASE,             // case
    ND_BREAK,            // break
    ND_CONTINUE,         // continue
    ND_RETURN,           // return
    ND_EXPR_STMT,        // Expression statement
    ND_FUNC_CALL,        // Function call
    ND_FUNC_PTR_CALL,    // Call through function pointer
    ND_FUNC_DEF,         // Function definition
    ND_ARRAY_SUBSCRIPT,  // Array indexing
    ND_INIT_LIST,        // Initializer list
    ND_COMPOUND_LITERAL, // Compound literal
    ND_LABEL             // Labeled statement
} NodeKind;

// AST node type
struct Node
{
    NodeKind kind;         // Node kind
    Node *next;            // Next node
    Node *lhs;             // Left-hand side
    Node *rhs;             // Right-hand side
    Node *cond;            // Used by if, while, for, cond
    Node *then;            // Used by if, while, for
    Node *els;             // Used by if
    Node *init;            // Used by for
    Node *inc;             // Used by for
    Node *body;            // Used by block, function definition
    Node *default_case;    // Default case for switch
    Node *break_target;    // Target for break
    Node *continue_target; // Target for continue

    // Function call
    char *func_name;   // Function name
    int func_name_len; // Function name length
    Node *args;        // Arguments

    // Function definition
    LVar *params;   // Parameters
    LVar *locals;   // Local variables
    int stack_size; // Stack size required for local variables

    // Array subscript
    Node *index; // Array index expression

    // Structure member access
    Member *member; // Structure member

    int val;    // Used if kind == ND_NUM
    int offset; // Used if kind == ND_LVAR
    Type *type; // Type
};

// Function prototypes
Token *tokenize(char *p);
void parse_program();

// Tokenizer
extern char *user_input;
extern Token *token;

void error(char *fmt, ...);
void error_at(Token *tok, char *fmt, ...);
bool consume(char *op);
Token *consume_ident();
bool consume_keyword(char *keyword);
void expect(char *op);
int expect_number();
char *expect_ident();
bool at_eof();
void unget_token();

// Parser
Node *new_node(NodeKind kind, Node *lhs, Node *rhs);
Node *new_node_num(int val);
Function *program();
Function *function();
Node *stmt(Function *fn);
Node *expr(Function *fn);
Node *assign(Function *fn);
Node *equality(Function *fn);
Node *relational(Function *fn);
Node *add(Function *fn);
Node *mul(Function *fn);
Node *unary(Function *fn);
Node *primary(Function *fn);
Node *func_args(Function *fn);

// Code generator
void codegen(Function *prog);

#endif // LAWSA_H