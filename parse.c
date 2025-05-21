#include "lawsa.h"
#include "type.h"

// Forward declarations
static Node *function_pointer_call(Function *fn, Node *func_ptr);
static Type *function_pointer_type();
static Type *parse_declarator(Type *base_type, char **out_name, int *out_len);
static void add_typedef(const char *name, Type *type);
static Type *find_typedef(const char *name);
static Type *union_decl();
static Type *enum_decl();
static Type *type_specifier();

// Custom implementation of strndup since it's not standard C
static char *my_strndup(const char *s, size_t n)
{
    char *new = malloc(n + 1);
    if (new == NULL)
        return NULL;
    new[n] = '\0';
    return memcpy(new, s, n);
}

// Find a local variable by name
static LVar *find_lvar(LVar *locals, Token *tok)
{
    for (LVar *var = locals; var; var = var->next)
        if (var->len == tok->len && !memcmp(tok->str, var->name, var->len))
            return var;
    return NULL;
}

// Create a new AST node
Node *new_node(NodeKind kind, Node *lhs, Node *rhs)
{
    Node *node = calloc(1, sizeof(Node));
    node->kind = kind;
    node->lhs = lhs;
    node->rhs = rhs;
    return node;
}

// Create a new node for a number
Node *new_node_num(int val)
{
    Node *node = calloc(1, sizeof(Node));
    node->kind = ND_NUM;
    node->val = val;
    return node;
}

// Create a new node for a local variable
static Node *new_node_lvar(LVar *lvar)
{
    Node *node = calloc(1, sizeof(Node));
    node->kind = ND_LVAR;
    node->offset = lvar->offset;
    node->type = lvar->type;
    return node;
}

// Calculate the size of a type in bytes
__attribute__((weak)) int size_of(Type *ty)
{
    if (ty->kind == TY_INT)
        return 4;
    if (ty->kind == TY_CHAR)
        return 1;
    if (ty->kind == TY_PTR)
        return 8;
    if (ty->kind == TY_ARRAY)
        return size_of(ty->ptr_to) * ty->array_size;
    if (ty->kind == TY_STRUCT)
        return ty->size;
    return 0; // Unknown type
}

// Create a type for char
__attribute__((weak)) Type *char_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_CHAR;
    ty->size = 1;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

// Create a new type for an array
__attribute__((weak)) Type *array_of(Type *base, int size)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_ARRAY;
    ty->ptr_to = base;
    ty->size = base->size * size;
    ty->array_size = size;
    return ty;
}

// Create a new type for a pointer
__attribute__((weak)) Type *pointer_to(Type *base)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_PTR;
    ty->ptr_to = base;
    ty->size = 8;
    return ty;
}

// Global variable table
typedef struct GlobalVar
{
    struct GlobalVar *next;
    char *name;
    Type *type;
    int has_initializer;
    int int_value; // Only support int initializers for now
} GlobalVar;
static GlobalVar *global_vars = NULL;

// Global function list
Function *function_list = NULL;
static Function *function_list_tail = NULL;

// Global function table for signature lookup
typedef struct FunctionEntry
{
    struct FunctionEntry *next;
    char *name;
    Function *fn;
} FunctionEntry;
static FunctionEntry *function_table = NULL;

static void add_function_to_table(Function *fn)
{
    FunctionEntry *entry = calloc(1, sizeof(FunctionEntry));
    entry->name = fn->name;
    entry->fn = fn;
    entry->next = function_table;
    function_table = entry;
}

static Function *find_function_in_table(const char *name)
{
    for (FunctionEntry *entry = function_table; entry; entry = entry->next)
    {
        if (strcmp(entry->name, name) == 0)
            return entry->fn;
    }
    return NULL;
}

// Parse a global variable declaration
static void parse_global_var(Type *type)
{
    Token *var_name = consume_ident();
    if (!var_name)
        error_at(token, "expected global variable name, got '%.*s'", token->len, token->str);
    GlobalVar *gvar = calloc(1, sizeof(GlobalVar));
    gvar->name = my_strndup(var_name->str, var_name->len);
    gvar->type = type;
    if (consume("="))
    {
        // Only support integer initializers for now
        if (token->kind == TK_NUM)
        {
            gvar->has_initializer = 1;
            gvar->int_value = token->val;
            token = token->next;
        }
        else
        {
            error_at(token, "Only integer initializers supported for globals");
        }
    }
    expect(";");
    gvar->next = global_vars;
    global_vars = gvar;
}

// Top-level parser loop: program = (global_decl | function_def)*
void parse_program()
{
    fprintf(stderr, "[DEBUG] Entering parse_program, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return;
    while (1)
    {
        if (at_eof() || token->kind == TK_EOF)
            break;
        // Typedef
        if (consume_keyword("typedef"))
        {
            Type *aliased = type_specifier();
            Token *td_name = consume_ident();
            add_typedef(my_strndup(td_name->str, td_name->len), aliased);
            expect(";");
            if (at_eof() || token->kind == TK_EOF)
                break;
            continue;
        }
        // Struct/union/enum tag declaration (skip for now)
        if (consume_keyword("struct") || consume_keyword("union") || consume_keyword("enum"))
        {
            // Parse and discard the type
            type_specifier();
            // If it's a tag-only declaration, expect ';'
            if (consume(";"))
            {
                if (at_eof() || token->kind == TK_EOF)
                    break;
                continue;
            }
            // Otherwise, it's a definition, so keep going
        }
        // Try to parse a type specifier
        Type *type = type_specifier();
        if (!type)
            break;
        if (at_eof() || token->kind == TK_EOF)
            break;
        // Look ahead: if next token is an identifier and next-next is '(', it's a function definition
        if (token->kind == TK_IDENT)
        {
            Token *save = token;
            token = token->next;
            if (consume("("))
            {
                // It's a function definition
                token = save; // Rewind
                Function *fn = function();
                if (!function_list)
                {
                    function_list = fn;
                    function_list_tail = fn;
                }
                else
                {
                    function_list_tail->next = fn;
                    function_list_tail = fn;
                }
                add_function_to_table(fn);
                if (at_eof() || token->kind == TK_EOF)
                    break;
                continue;
            }
            else
            {
                token = save; // Rewind
            }
        }
        // Otherwise, it's a global variable declaration
        parse_global_var(type);
        if (at_eof() || token->kind == TK_EOF)
            break;
    }
    fprintf(stderr, "[DEBUG] Exiting parse_program, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return;
}

// Create a new local variable
static LVar *new_lvar(char *name, int len)
{
    LVar *var = calloc(1, sizeof(LVar));
    var->name = name;
    var->len = len;

    Type *type = calloc(1, sizeof(Type));
    type->kind = TY_INT;
    var->type = type;

    return var;
}

// Parse variable declaration
// int name[SIZE]?;
static LVar *declare_variable(Token *ident, Type *base_type)
{
    LVar *var = new_lvar(my_strndup(ident->str, ident->len), ident->len);
    var->type = base_type;

    // Check for array declaration
    if (consume("["))
    {
        int size = expect_number();
        expect("]");
        var->type = array_of(base_type, size);
    }

    return var;
}

// function = "int" ident "(" params? ")" "{" stmt* "}"
// params = param ("," param)*
// param = "int" ident
Function *function()
{
    fprintf(stderr, "Parsing function...\n");
    // Parse return type
    Type *return_type = type_specifier();

    // Get function name
    Token *ident = consume_ident();
    if (!ident)
        error_at(token, "expected function name, got '%.*s'", token->len, token->str);

    fprintf(stderr, "Function name: %.*s\n", ident->len, ident->str);

    // Create function node
    Function *fn = calloc(1, sizeof(Function));
    fn->name = my_strndup(ident->str, ident->len);
    fn->len = ident->len;
    fn->params = NULL;
    fn->locals = NULL;

    // Parse parameters
    expect("(");

    if (!consume(")"))
    {
        // Parse the first parameter
        Type *param_type = type_specifier();
        Token *param_tok = consume_ident();
        if (!param_tok)
            error_at(token, "expected parameter name, got '%.*s'", token->len, token->str);

        char *param_name;
        int param_len;
        Type *full_param_type = parse_declarator(param_type, &param_name, &param_len);
        LVar *param = new_lvar(param_name, param_len);
        param->type = full_param_type;
        param->offset = 8; // RBP + 8 (return address)
        fn->params = param;

        LVar *cur = param;

        // Parse remaining parameters
        while (consume(","))
        {
            param_type = type_specifier();
            param_tok = consume_ident();
            if (!param_tok)
                error_at(token, "expected parameter name, got '%.*s'", token->len, token->str);

            char *param_name;
            int param_len;
            Type *full_param_type = parse_declarator(param_type, &param_name, &param_len);
            param = new_lvar(param_name, param_len);
            param->type = full_param_type;
            param->offset = cur->offset + 8;
            cur->next = param;
            cur = param;
        }

        expect(")");
    }

    // Parse function body
    expect("{");

    Node head;
    head.next = NULL;
    Node *cur = &head;

    fprintf(stderr, "Parsing function body...\n");

    while (!consume("}"))
    {
        // Check if it's a declaration
        Type *decl_type = type_specifier();
        if (decl_type)
        {
            fprintf(stderr, "Found variable declaration\n");
            char *var_name;
            int var_len;
            Type *full_type = parse_declarator(decl_type, &var_name, &var_len);
            Token *var_name_tok = consume_ident();
            if (!var_name_tok)
                error_at(token, "expected variable name, got '%.*s'", token->len, token->str);

            // Check for pointer type
            bool is_pointer = false;
            if (consume("*"))
            {
                is_pointer = true;
            }

            // Create a new local variable
            LVar *lvar = new_lvar(var_name, var_len);
            lvar->type = full_type;
            if (is_pointer)
            {
                lvar->type = pointer_to(full_type);
            }

            // Check for array declaration
            if (consume("["))
            {
                int array_size = expect_number();
                expect("]");
                lvar->type = array_of(lvar->type, array_size);
            }

            // Calculate variable size and align to 8 bytes
            int var_size = size_of(lvar->type);
            var_size = (var_size + 7) & ~7;

            // Update offset based on size of previous variables
            lvar->offset = fn->locals ? fn->locals->offset + var_size : var_size;

            lvar->next = fn->locals;
            fn->locals = lvar;

            // Check for initializer
            Node *init_node = NULL;
            if (consume("="))
            {
                if (consume("{"))
                {
                    // Parse initializer list for array/struct
                    Node head = {};
                    Node *cur_init = &head;
                    do
                    {
                        cur_init->next = expr(fn);
                        cur_init = cur_init->next;
                    } while (consume(","));
                    expect("}");
                    init_node = calloc(1, sizeof(Node));
                    init_node->kind = ND_INIT_LIST;
                    init_node->body = head.next;
                }
                else if (token->kind == TK_IDENT && token->next && strcmp(token->next->str, "{") == 0)
                {
                    // Compound literal: (struct S){...}
                    Type *cl_type = type_specifier();
                    expect("{");
                    Node head = {};
                    Node *cur_init = &head;
                    do
                    {
                        cur_init->next = expr(fn);
                        cur_init = cur_init->next;
                    } while (consume(","));
                    expect("}");
                    init_node = calloc(1, sizeof(Node));
                    init_node->kind = ND_COMPOUND_LITERAL;
                    init_node->type = cl_type;
                    init_node->body = head.next;
                }
                else
                {
                    Node *lhs = calloc(1, sizeof(Node));
                    lhs->kind = ND_LVAR;
                    lhs->offset = lvar->offset;
                    lhs->type = lvar->type;
                    Node *rhs = expr(fn);
                    init_node = new_node(ND_ASSIGN, lhs, rhs);
                }
            }

            expect(";");

            if (init_node)
            {
                cur->next = calloc(1, sizeof(Node));
                cur->next->kind = ND_EXPR_STMT;
                cur->next->lhs = init_node;
                cur = cur->next;
            }

            continue;
        }
        // It's a normal statement
        cur->next = stmt(fn);
        cur = cur->next;
    }

    fprintf(stderr, "Function body parsing complete\n");

    fn->body = head.next;

    // Calculate stack size for local variables
    int stack_size = 0;
    for (LVar *var = fn->locals; var; var = var->next)
    {
        int var_size = size_of(var->type);
        var_size = (var_size + 7) & ~7;
        stack_size += var_size;
    }
    fn->stack_size = stack_size;

    fprintf(stderr, "Function parsed successfully, stack size: %d\n", stack_size);

    return fn;
}

// stmt = "return" expr ";"
//      | "if" "(" expr ")" stmt ("else" stmt)?
//      | "while" "(" expr ")" stmt
//      | "for" "(" expr? ";" expr? ";" expr? ")" stmt
//      | "{" stmt* "}"
//      | ident ':' stmt
//      | ';'
//      | expr ";"
Node *stmt(Function *fn)
{
    Node *node;

    // Empty statement
    if (consume(";"))
    {
        node = calloc(1, sizeof(Node));
        node->kind = ND_BLOCK; // Use block as a no-op
        node->body = NULL;
        return node;
    }

    // Labeled statement
    if (token->kind == TK_IDENT && token->next && strcmp(token->next->str, ":") == 0)
    {
        Token *label_tok = token;
        token = token->next->next; // skip ident and ':'
        node = calloc(1, sizeof(Node));
        node->kind = ND_LABEL;
        node->func_name = my_strndup(label_tok->str, label_tok->len); // reuse func_name for label name
        node->lhs = stmt(fn);
        return node;
    }

    if (consume_keyword("return"))
    {
        fprintf(stderr, "Parsing return statement\n");
        node = calloc(1, sizeof(Node));
        node->kind = ND_RETURN;
        node->lhs = expr(fn);
        expect(";");
        if (fn && node->kind == ND_RETURN && node->lhs && node->lhs->type && fn->return_type)
        {
            if (!is_compatible(fn->return_type, node->lhs->type))
            {
                error_at(token, "Type mismatch in return statement: function returns kind %d, got kind %d", fn->return_type->kind, node->lhs->type->kind);
            }
        }
        return node;
    }

    if (consume_keyword("if"))
    {
        fprintf(stderr, "Parsing if statement\n");
        node = calloc(1, sizeof(Node));
        node->kind = ND_IF;
        expect("(");
        node->cond = expr(fn);
        expect(")");
        node->then = stmt(fn);
        if (consume_keyword("else"))
            node->els = stmt(fn);
        return node;
    }

    if (consume_keyword("while"))
    {
        fprintf(stderr, "Parsing while statement\n");
        node = calloc(1, sizeof(Node));
        node->kind = ND_WHILE;
        expect("(");
        node->cond = expr(fn);
        expect(")");
        node->then = stmt(fn);
        return node;
    }

    if (consume_keyword("for"))
    {
        fprintf(stderr, "Parsing for statement\n");
        node = calloc(1, sizeof(Node));
        node->kind = ND_FOR;
        expect("(");

        if (!consume(";"))
        {
            node->init = expr(fn);
            expect(";");
        }

        if (!consume(";"))
        {
            node->cond = expr(fn);
            expect(";");
        }

        if (!consume(")"))
        {
            node->inc = expr(fn);
            expect(")");
        }

        node->then = stmt(fn);
        return node;
    }

    if (consume("{"))
    {
        fprintf(stderr, "Parsing block statement\n");
        Node head;
        head.next = NULL;
        Node *cur = &head;

        while (!consume("}"))
        {
            cur->next = stmt(fn);
            cur = cur->next;
        }

        node = calloc(1, sizeof(Node));
        node->kind = ND_BLOCK;
        node->body = head.next;
        return node;
    }

    fprintf(stderr, "Parsing expression statement\n");
    node = expr(fn);
    expect(";");
    return node;
}

// Forward declaration for the conditional expression parser
Node *conditional(Function *fn);

// expr = conditional
Node *expr(Function *fn)
{
    return conditional(fn);
}

// conditional = assign ("?" expr ":" conditional)?
Node *conditional(Function *fn)
{
    Node *node = assign(fn);

    if (consume("?"))
    {
        Node *cond_node = calloc(1, sizeof(Node));
        cond_node->kind = ND_IF;
        cond_node->cond = node;
        cond_node->then = expr(fn);

        expect(":");
        cond_node->els = conditional(fn);

        return cond_node;
    }

    return node;
}

// assign = equality ("=" assign)?
Node *assign(Function *fn)
{
    Node *node = equality(fn);

    if (consume("="))
    {
        if (node->kind == ND_ASSIGN && node->lhs && node->rhs && node->lhs->type && node->rhs->type)
        {
            // Allow struct/union assignment if types match
            if ((node->lhs->type->kind == TY_STRUCT || node->lhs->type->kind == TY_UNION) &&
                (node->rhs->type->kind == TY_STRUCT || node->rhs->type->kind == TY_UNION))
            {
                if (node->lhs->type != node->rhs->type)
                    error_at(token, "Struct/union assignment requires both sides to be the same type");
            }
            else if (!is_compatible(node->lhs->type, node->rhs->type))
            {
                error_at(token, "Type mismatch in assignment: lhs kind %d, rhs kind %d", node->lhs->type->kind, node->rhs->type->kind);
            }
        }
        node = new_node(ND_ASSIGN, node, assign(fn));
    }
    else if (consume("+="))
    {
        Node *rhs = assign(fn);
        // Equivalent to: node = node + rhs
        Node *add_node = new_node(ND_ADD, node, rhs);
        node = new_node(ND_ASSIGN, node, add_node);
    }
    else if (consume("-="))
    {
        Node *rhs = assign(fn);
        // Equivalent to: node = node - rhs
        Node *sub_node = new_node(ND_SUB, node, rhs);
        node = new_node(ND_ASSIGN, node, sub_node);
    }
    else if (consume("*="))
    {
        Node *rhs = assign(fn);
        // Equivalent to: node = node * rhs
        Node *mul_node = new_node(ND_MUL, node, rhs);
        node = new_node(ND_ASSIGN, node, mul_node);
    }
    else if (consume("/="))
    {
        Node *rhs = assign(fn);
        // Equivalent to: node = node / rhs
        Node *div_node = new_node(ND_DIV, node, rhs);
        node = new_node(ND_ASSIGN, node, div_node);
    }

    return node;
}

// equality = relational ("==" relational | "!=" relational)*
Node *equality(Function *fn)
{
    Node *node = relational(fn);

    for (;;)
    {
        if (consume("=="))
            node = new_node(ND_EQ, node, relational(fn));
        else if (consume("!="))
            node = new_node(ND_NE, node, relational(fn));
        else
            return node;
    }
}

// relational = add ("<" add | "<=" add | ">" add | ">=" add)*
Node *relational(Function *fn)
{
    Node *node = add(fn);

    for (;;)
    {
        if (consume("<"))
            node = new_node(ND_LT, node, add(fn));
        else if (consume("<="))
            node = new_node(ND_LE, node, add(fn));
        else if (consume(">"))
            node = new_node(ND_LT, add(fn), node);
        else if (consume(">="))
            node = new_node(ND_LE, add(fn), node);
        else
            return node;
    }
}

// add = mul ("+" mul | "-" mul)*
Node *add(Function *fn)
{
    Node *node = mul(fn);

    for (;;)
    {
        if (consume("+"))
        {
            Node *rhs = mul(fn);

            // Handle pointer arithmetic: ptr + int or int + ptr
            if (node->type && node->type->kind == TY_PTR)
            {
                if (!rhs->type || !is_integer_type(rhs->type))
                    error_at(token, "Can only add integer to pointer");
                Node *scaled = calloc(1, sizeof(Node));
                scaled->kind = ND_MUL;
                scaled->lhs = rhs;
                scaled->rhs = new_node_num(size_of(node->type->ptr_to));
                node = new_node(ND_ADD, node, scaled);
            }
            else if (rhs->type && rhs->type->kind == TY_PTR)
            {
                if (!node->type || !is_integer_type(node->type))
                    error_at(token, "Can only add integer to pointer");
                Node *scaled = calloc(1, sizeof(Node));
                scaled->kind = ND_MUL;
                scaled->lhs = node;
                scaled->rhs = new_node_num(size_of(rhs->type->ptr_to));
                node = new_node(ND_ADD, rhs, scaled);
            }
            else
            {
                node = new_node(ND_ADD, node, rhs);
            }
        }
        else if (consume("-"))
        {
            Node *rhs = mul(fn);

            // Handle pointer arithmetic: ptr - int
            if (node->type && node->type->kind == TY_PTR && rhs->type && is_integer_type(rhs->type))
            {
                Node *scaled = calloc(1, sizeof(Node));
                scaled->kind = ND_MUL;
                scaled->lhs = rhs;
                scaled->rhs = new_node_num(size_of(node->type->ptr_to));
                node = new_node(ND_SUB, node, scaled);
            }
            // Handle pointer subtraction: ptr - ptr (must be same type)
            else if (node->type && node->type->kind == TY_PTR && rhs->type && rhs->type->kind == TY_PTR)
            {
                if (!is_compatible(node->type, rhs->type))
                    error_at(token, "Pointer subtraction requires both pointers to be of the same type");
                Node *diff = new_node(ND_SUB, node, rhs);
                Node *div = calloc(1, sizeof(Node));
                div->kind = ND_DIV;
                div->lhs = diff;
                div->rhs = new_node_num(size_of(node->type->ptr_to));
                node = div;
            }
            else
            {
                node = new_node(ND_SUB, node, rhs);
            }
        }
        else
        {
            return node;
        }
    }
}

// mul = unary ("*" unary | "/" unary)*
Node *mul(Function *fn)
{
    Node *node = unary(fn);

    for (;;)
    {
        if (consume("*"))
            node = new_node(ND_MUL, node, unary(fn));
        else if (consume("/"))
            node = new_node(ND_DIV, node, unary(fn));
        else
            return node;
    }
}

// unary = ("+" | "-" | "&" | "*")? primary
Node *unary(Function *fn)
{
    if (consume("+"))
        return primary(fn);
    if (consume("-"))
        return new_node(ND_SUB, new_node_num(0), primary(fn));
    if (consume("&"))
    {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_ADDR;
        node->lhs = unary(fn);
        // The result type is a pointer to the operand's type
        if (node->lhs->type)
            node->type = pointer_to(node->lhs->type);
        return node;
    }
    if (consume("*"))
    {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_DEREF;
        node->lhs = unary(fn);
        // The result type is the base type of the pointer
        if (node->lhs->type && node->lhs->type->kind == TY_PTR)
            node->type = node->lhs->type->ptr_to;
        else if (node->lhs->type && node->lhs->type->kind == TY_ARRAY)
            node->type = node->lhs->type->ptr_to;
        else
            error_at(token, "dereference of non-pointer type");
        return node;
    }
    return primary(fn);
}

// func_args = "(" (assign ("," assign)*)? ")"
Node *func_args(Function *fn)
{
    if (consume(")"))
        return NULL;

    Node *head = assign(fn);
    Node *cur = head;

    while (consume(","))
    {
        cur->next = assign(fn);
        cur = cur->next;
    }

    expect(")");
    return head;
}

// Primary expression parser - add struct member access
// primary = "(" expr ")" | ident func_args? | num
Node *primary(Function *fn)
{
    if (consume("("))
    {
        if (consume("*"))
        {
            // We have "(* expr )" which might be a function pointer dereference
            Node *ptr = expr(fn);
            expect(")");

            // Check if it's followed by a function call
            if (consume("("))
            {
                unget_token(); // Put back the "(" for the function_pointer_call function
                return function_pointer_call(fn, ptr);
            }

            // Otherwise, it's just a regular dereference
            Node *node = calloc(1, sizeof(Node));
            node->kind = ND_DEREF;
            node->lhs = ptr;
            return node;
        }

        // Regular parenthesized expression
        Node *node = expr(fn);
        expect(")");
        return node;
    }

    Token *tok = consume_ident();
    if (tok)
    {
        fprintf(stderr, "Found identifier: %.*s\n", tok->len, tok->str);

        // Function call
        if (consume("("))
        {
            fprintf(stderr, "Function call\n");
            Node *node = calloc(1, sizeof(Node));
            node->kind = ND_FUNC_CALL;
            node->func_name = my_strndup(tok->str, tok->len);
            node->func_name_len = tok->len;
            node->args = func_args(fn);

            // Robust argument type checking
            Function *decl = find_function_in_table(node->func_name);
            if (decl)
            {
                LVar *param = decl->params;
                Node *arg = node->args;
                int param_index = 0;
                while (param && arg)
                {
                    if (!is_compatible(param->type, arg->type))
                    {
                        error_at(token, "Type mismatch in argument %d of function '%s'", param_index + 1, node->func_name);
                    }
                    param = param->next;
                    arg = arg->next;
                    param_index++;
                }
                if (param || arg)
                {
                    error_at(token, "Argument count mismatch in call to function '%s'", node->func_name);
                }
            }

            return node;
        }

        // Variable reference
        LVar *lvar = find_lvar(fn->locals, tok);
        if (!lvar)
        {
            // Check if it's a parameter
            lvar = find_lvar(fn->params, tok);
            if (!lvar)
            {
                error_at(token, "Variable not declared: %.*s", tok->len, tok->str);
            }
        }

        Node *node = new_node_lvar(lvar);

        // Process member access (.member) or array access
        for (;;)
        {
            // Member access: x.y
            if (consume("."))
            {
                Token *member_name = consume_ident();
                if (!member_name)
                    error_at(token, "expected struct member name, got '%.*s'", token->len, token->str);

                if (node->type->kind != TY_STRUCT)
                    error_at(token, "member access on non-struct type");

                // Find the member in the structure
                Member *member = NULL;
                for (Member *mem = node->type->members; mem; mem = mem->next)
                {
                    int name_len = strlen(mem->name);
                    if (name_len == member_name->len &&
                        !memcmp(mem->name, member_name->str, name_len))
                    {
                        member = mem;
                        break;
                    }
                }

                if (!member)
                    error_at(token, "member '%.*s' not found in structure", member_name->len, member_name->str);

                // Create member access node
                Node *member_node = calloc(1, sizeof(Node));
                member_node->kind = ND_MEMBER;
                member_node->lhs = node;
                member_node->member = member;
                member_node->type = member->ty;

                node = member_node;
                continue;
            }

            // Array index: x[i]
            if (consume("["))
            {
                Node *index = expr(fn);
                expect("]");

                Node *array_node = calloc(1, sizeof(Node));
                array_node->kind = ND_ARRAY_SUBSCRIPT;
                array_node->lhs = node;
                array_node->index = index;

                if (node->type->kind == TY_ARRAY)
                    array_node->type = node->type->ptr_to;
                else
                    error_at(token, "array subscript on non-array type");

                node = array_node;
                continue;
            }

            break;
        }

        return node;
    }

    // String literal
    if (token->kind == TK_STR)
    {
        Node *node = calloc(1, sizeof(Node));
        node->kind = ND_NUM;                       // Use ND_NUM for now, or define ND_STR if desired
        node->val = 0;                             // String literals are not evaluated to a value
        node->type = pointer_to(char_type(false)); // char *
        token = token->next;
        return node;
    }

    return new_node_num(expect_number());
}

// Create a structure type
static Type *struct_decl()
{
    fprintf(stderr, "[DEBUG] Entering struct_decl, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return NULL;
    expect("struct");
    Token *tag = consume_ident();
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_STRUCT;
    expect("{");
    Member head = {};
    Member *cur = &head;
    int offset = 0;
    int bit_offset = 0;
    int storage_unit_size = 4 * 8; // 4 bytes = 32 bits
    while (!consume("}"))
    {
        Type *member_type = type_specifier();
        char *member_name;
        int member_len;
        Type *full_member_type = parse_declarator(member_type, &member_name, &member_len);
        Member *mem = calloc(1, sizeof(Member));
        mem->name = my_strndup(member_name, member_len);
        mem->ty = full_member_type;
        mem->bit_width = 0;
        mem->bit_offset = 0;
        int is_flexible_array = 0;
        if (consume(":"))
        {
            mem->bit_width = expect_number();
            if (bit_offset + mem->bit_width > storage_unit_size)
            {
                offset += 4;
                bit_offset = 0;
            }
            mem->offset = offset;
            mem->bit_offset = bit_offset;
            bit_offset += mem->bit_width;
            if (bit_offset == storage_unit_size)
            {
                offset += 4;
                bit_offset = 0;
            }
        }
        else
        {
            if (consume("["))
            {
                // Check for flexible array member
                if (token->kind == "]")
                {
                    // Flexible array: []
                    expect("]");
                    mem->ty = array_of(full_member_type, 0);
                    is_flexible_array = 1;
                }
                else
                {
                    int size = expect_number();
                    expect("]");
                    mem->ty = array_of(full_member_type, size);
                }
            }
            // Not a bitfield: align to next storage unit
            if (bit_offset != 0)
            {
                offset += 4;
                bit_offset = 0;
            }
            mem->offset = offset;
            mem->bit_offset = 0;
            // Only add to struct size if not a flexible array
            if (!is_flexible_array)
                offset += size_of(mem->ty);
        }
        cur->next = mem;
        cur = mem;
        expect(";");
    }
    if (bit_offset != 0)
        offset += 4;
    ty->members = head.next;
    ty->size = offset;
    return ty;
}

// Type specifier parser
static Type *type_specifier()
{
    fprintf(stderr, "[DEBUG] Entering type_specifier, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return NULL;
    // Check for struct type
    if (consume("struct"))
    {
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        unget_token(); // Put back 'struct' so struct_decl() can consume it
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        return struct_decl();
    }
    if (consume("union"))
    {
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        unget_token();
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        return union_decl();
    }
    if (consume("enum"))
    {
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        unget_token();
        if (at_eof() || token->kind == TK_EOF)
            return NULL;
        return enum_decl();
    }
    // Check for char type
    if (consume_keyword("char"))
    {
        return char_type(false);
    }
    if (consume_keyword("float"))
    {
        return float_type();
    }
    if (consume_keyword("double"))
    {
        if (consume_keyword("long"))
            return longdouble_type();
        return double_type();
    }
    if (consume_keyword("long"))
    {
        if (consume_keyword("double"))
            return longdouble_type();
        return long_type(false);
    }
    // If not at a valid type keyword, return NULL instead of calling expect("int")
    if (!consume_keyword("int"))
        return NULL;
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_INT;
    return ty;
}

// Unified declarator parser: parses pointer stars, arrays, function pointers, and identifier
// Returns the final type and sets *out_name and *out_len to the variable name and length
static Type *parse_declarator(Type *base_type, char **out_name, int *out_len)
{
    Type *ty = base_type;
    // Parse pointer stars
    while (consume("*"))
    {
        ty = pointer_to(ty);
    }

    // Handle parentheses-wrapped declarators for function pointers
    if (consume("("))
    {
        // Recursively parse the inner declarator
        Type *inner_ty = parse_declarator(ty, out_name, out_len);
        expect(")");
        ty = inner_ty;
    }
    else
    {
        // Parse identifier
        Token *ident = NULL;
        if (token->kind == TK_IDENT)
        {
            ident = token;
            *out_name = my_strndup(ident->str, ident->len);
            *out_len = ident->len;
            token = token->next;
        }
        else
        {
            *out_name = NULL;
            *out_len = 0;
        }
    }

    // Parse function or array declarators (can be chained)
    while (1)
    {
        if (consume("["))
        {
            int array_size = expect_number();
            expect("]");
            ty = array_of(ty, array_size);
            continue;
        }
        if (consume("("))
        {
            // Function type: parse parameter types (for now, treat as function returning ty)
            // We'll need to build a function type node
            Type *func_ty = calloc(1, sizeof(Type));
            func_ty->kind = TY_FUNC;
            func_ty->return_type = ty;
            func_ty->params = NULL;
            func_ty->param_count = 0;

            // Parse parameter list
            if (!consume(")"))
            {
                // Parse first parameter
                Type **params = NULL;
                int param_count = 0;
                do
                {
                    Type *param_type = type_specifier();
                    char *param_name = NULL;
                    int param_len = 0;
                    parse_declarator(param_type, &param_name, &param_len); // ignore name
                    params = realloc(params, sizeof(Type *) * (param_count + 1));
                    params[param_count++] = param_type;
                } while (consume(","));
                expect(")");
                func_ty->params = params;
                func_ty->param_count = param_count;
            }
            ty = func_ty;
            continue;
        }
        break;
    }
    return ty;
}

// Parse function pointer type: "int (*)(int, int)"
static Type *function_pointer_type()
{
    // Function type has return type of int for now
    Type *base_type = int_type(false);

    // Expect (*) part
    if (!consume("("))
        return NULL;
    if (!consume("*"))
        return NULL;
    if (!consume(")"))
        return NULL;

    // Create the function type
    Type *func_type = function_type(base_type);

    // Now expect parameter list: (type, type, ...)
    if (!consume("("))
        return NULL;

    // Parse parameter types
    if (!consume(")"))
    {
        // First parameter is always int for now
        add_param_type(func_type, int_type(false));

        // Parse comma-separated parameter list
        while (consume(","))
        {
            // Additional parameters are always int for now
            add_param_type(func_type, int_type(false));
        }

        expect(")");
    }

    // Return a pointer to the function type
    return pointer_to(func_type);
}

// Parse a function pointer call: (*func_ptr)(arg1, arg2, ...)
static Node *function_pointer_call(Function *fn, Node *func_ptr)
{
    // Create a function pointer call node
    Node *node = calloc(1, sizeof(Node));
    node->kind = ND_FUNC_PTR_CALL;
    node->lhs = func_ptr; // The function pointer expression

    // Parse arguments
    expect("(");

    if (!consume(")"))
    {
        Node head = {};
        Node *cur = &head;

        // Parse the first argument
        cur->next = expr(fn);
        cur = cur->next;

        // Parse additional arguments
        while (consume(","))
        {
            cur->next = expr(fn);
            cur = cur->next;
        }

        expect(")");
        node->args = head.next;
    }

    // Extract function type from func_ptr->type
    Type *fnty = func_ptr->type;
    if (fnty && fnty->kind == TY_PTR)
        fnty = fnty->ptr_to;
    int param_count = 0;
    Type **params = NULL;
    if (fnty && fnty->kind == TY_FUNC)
    {
        param_count = fnty->param_count;
        params = fnty->params;
    }

    // After parsing arguments, for each argument and parameter, check:
    Node *arg = node->args;
    for (int i = 0; arg && i < param_count; i++, arg = arg->next)
    {
        if (!is_compatible(arg->type, params[i]))
            error_at(token, "Type mismatch in function call argument");
    }

    return node;
}

// Typedef table (simple linked list for now)
typedef struct TypedefEntry
{
    struct TypedefEntry *next;
    char *name;
    Type *type;
} TypedefEntry;
static TypedefEntry *typedef_table = NULL;

static void add_typedef(const char *name, Type *type)
{
    TypedefEntry *entry = calloc(1, sizeof(TypedefEntry));
    entry->name = strdup(name);
    entry->type = type;
    entry->next = typedef_table;
    typedef_table = entry;
}

static Type *find_typedef(const char *name)
{
    for (TypedefEntry *entry = typedef_table; entry; entry = entry->next)
    {
        if (strcmp(entry->name, name) == 0)
            return entry->type;
    }
    return NULL;
}

// Union declaration
static Type *union_decl()
{
    fprintf(stderr, "[DEBUG] Entering union_decl, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return NULL;
    expect("union");
    Token *tag = consume_ident();
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_UNION;
    expect("{");
    Member head = {};
    Member *cur = &head;
    int max_size = 0;
    while (!consume("}"))
    {
        Type *member_type = type_specifier();
        char *member_name;
        int member_len;
        Type *full_member_type = parse_declarator(member_type, &member_name, &member_len);
        Member *mem = calloc(1, sizeof(Member));
        mem->name = my_strndup(member_name, member_len);
        mem->ty = full_member_type;
        if (consume("["))
        {
            int size = expect_number();
            expect("]");
            mem->ty = array_of(full_member_type, size);
        }
        mem->offset = 0; // All members start at offset 0
        int member_size = size_of(mem->ty);
        if (member_size > max_size)
            max_size = member_size;
        cur->next = mem;
        cur = mem;
        expect(";");
    }
    ty->members = head.next;
    ty->size = max_size;
    return ty;
}

// Enum declaration
static Type *enum_decl()
{
    fprintf(stderr, "[DEBUG] Entering enum_decl, token kind: %d, str: '%s'\n", token->kind, token->str ? token->str : "(null)");
    if (at_eof() || token->kind == TK_EOF)
        return NULL;
    expect("enum");
    Token *tag = consume_ident();
    expect("{");
    EnumConst *head = NULL, *last = NULL;
    int value = 0;
    while (!consume("}"))
    {
        Token *name = consume_ident();
        if (consume("="))
        {
            value = expect_number();
        }
        EnumConst *ec = calloc(1, sizeof(EnumConst));
        ec->name = my_strndup(name->str, name->len);
        ec->value = value++;
        if (!head)
            head = ec;
        else
            last->next = ec;
        last = ec;
        if (!consume(","))
            break;
    }
    Type *ty = enum_type(tag ? my_strndup(tag->str, tag->len) : NULL);
    ty->enum_consts = head;
    return ty;
}