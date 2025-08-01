#include "lawsa.h"
#include <string.h>

// Forward declarations for external functions
static void emit(const char *fmt, ...);
bool is_integer_type(Type *ty);

// Label counter for generating unique labels
static int label_count = 0;

// Generate a unique label
static int gen_label()
{
    return label_count++;
}

// Registers used for function arguments
static char *argreg[] = {"rdi", "rsi", "rdx", "rcx", "r8", "r9"};

// Forward declarations
static int count_args(Node *args);
static void gen_expr(Node *node);

// Stubs for push and pop (implement as needed)
static void push() {}
static void pop(const char *reg) {}

// Helper: Resolve typedefs to underlying type
static Type *resolve_typedef(Type *ty)
{
    while (ty && ty->kind == TY_TYPEDEF)
    {
        ty = ty->typedef_type;
    }
    return ty;
}

// Helper: Check if type is floating point
static bool is_float_type(Type *ty)
{
    ty = resolve_typedef(ty);
    return ty && (ty->kind == TY_FLOAT || ty->kind == TY_DOUBLE || ty->kind == TY_LONGDOUBLE);
}

// Helper: Check if type is struct/union
static bool is_struct_or_union(Type *ty)
{
    ty = resolve_typedef(ty);
    return ty && (ty->kind == TY_STRUCT || ty->kind == TY_UNION);
}

// Generate code for accessing a variable at an offset from RBP.
void gen_addr(Node *node)
{  
    if (node->kind == ND_LVAR)
    {
        int offset = node->offset;
        emit("  lea rax, [rbp-%d]", offset);
        return;
    }

    if (node->kind == ND_DEREF)
    {
        gen_expr(node->lhs);
        return;
    }

    if (node->kind == ND_MEMBER)
    {
        if (!is_struct_or_union(node->lhs->type))
        {
            error("Member access on non-struct/union");
        }
        gen_addr(node->lhs);
        emit("  add rax, %d", node->member->offset);
        return;
    }

    if (node->kind == ND_ARRAY_SUBSCRIPT)
    {
        // Get the base address
        gen_addr(node->lhs);
        push();
        // Get the index value
        gen_expr(node->rhs);

        // Determine element size based on type
        int element_size = 4; // Default for int
        Type *type = node->lhs->type;

        if (type->ptr_to && type->ptr_to->kind == TY_CHAR)
            element_size = 1; // For char

        // Scale the index by the element size
        if (element_size > 1)
            emit("  imul rax, %d", element_size);

        pop("rcx");
        emit("  add rax, rcx");
        return;
    }

    error("not an lvalue");
}

// Generate code for a given node and push the result to the stack
static void gen_expr(Node *node)
{
    int i, l, l2;
    Node *arg;

    switch (node->kind)
    {
    case ND_NUM:
        emit("  push %d", node->val);
        return;
    case ND_LVAR:
        gen_addr(node);
        emit("  pop rax");

        // Check if this is a char type and use the right load instruction
        if (node->type && node->type->kind == TY_CHAR)
            emit("  movzx eax, byte ptr [rax]");
        else
            emit("  mov rax, [rax]");

        emit("  push rax");
        return;
    case ND_ASSIGN:
        gen_addr(node->lhs);
        gen_expr(node->rhs);

        emit("  pop rdi"); // value or address of right-hand side
        emit("  pop rax"); // address of left-hand side

        if (!node->lhs->type)
        {
            error("Assignment to a node without a type");
            return;
        }

        // Struct/union assignment support
        if ((node->lhs->type->kind == TY_STRUCT || node->lhs->type->kind == TY_UNION) &&
            node->rhs->type && (node->rhs->type->kind == TY_STRUCT || node->rhs->type->kind == TY_UNION) &&
            node->lhs->type == node->rhs->type)
        {
            int size = node->lhs->type->size;
            emit("  mov rcx, %d", size);
            emit("  mov rsi, rdi");
            emit("  mov rdi, rax");
            emit("  rep movsb");
            emit("  push rdi");
            return;
        }

        // Float/double assignment
        if (node->lhs->type->kind == TY_FLOAT)
        {
            // Store float (4 bytes)
            emit("  movss dword ptr [rax], xmm0");
            emit("  push rdi");
            return;
        }
        if (node->lhs->type->kind == TY_DOUBLE)
        {
            // Store double (8 bytes)
            emit("  movsd qword ptr [rax], xmm0");
            emit("  push rdi");
            return;
        }
        if (is_struct_or_union(node->lhs->type) || is_struct_or_union(node->rhs->type))
        {
            error("Struct/union assignment not yet supported in codegen");
        }
        if (is_float_type(node->lhs->type) || is_float_type(node->rhs->type))
        {
            error("Float/double/long double assignment not yet supported in codegen");
        }
        if (!is_integer_type(node->lhs->type) || !is_integer_type(node->rhs->type))
        {
            error("Assignment only supported for integer types (and enums) in codegen");
        }
        if (node->lhs->type && node->lhs->type->kind == TY_ENUM)
        {
            // treat as int
        }
        if (node->rhs->type && node->rhs->type->kind == TY_ENUM)
        {
            // treat as int
        }

        // Check if target is a char type and use the right store instruction
        if (node->lhs->type->kind == TY_CHAR)
        {
            // Store a byte
            emit("  mov byte ptr [rax], dil");
        }
        else if (node->lhs->type->kind == TY_INT)
        {
            // Store an int (4 bytes)
            emit("  mov dword ptr [rax], edi");
        }
        else if (node->lhs->type->kind == TY_PTR || node->lhs->type->kind == TY_ARRAY)
        {
            // Store a pointer (8 bytes)
            emit("  mov [rax], rdi");
        }
        else
        {
            // Default case - store whatever size is needed
            emit("  mov [rax], rdi");
        }

        emit("  push rdi"); // leave the value on the stack

        // Bitfield assignment support
        if (node->lhs->kind == ND_MEMBER && node->lhs->member && node->lhs->member->bit_width > 0)
        {
            // For bitfield assignment: update only the relevant bits
            // rax: address, rdi: value to assign
            int bit_offset = node->lhs->member->bit_offset;
            int bit_width = node->lhs->member->bit_width;
            int mask = ((1U << bit_width) - 1) << bit_offset;
            emit("  mov ecx, dword ptr [rax]");             // load storage unit
            emit("  and edi, 0x%x", (1U << bit_width) - 1); // mask value
            if (bit_offset > 0)
                emit("  shl edi, %d", bit_offset);
            emit("  and ecx, 0x%x", ~mask); // clear bitfield
            emit("  or ecx, edi");          // set new value
            emit("  mov dword ptr [rax], ecx");
            emit("  push rdi"); // push assigned value (unshifted)
            return;
        }

        return;
    case ND_IF:
    {
        // For normal if statements with statements as branches
        if (node->kind == ND_IF && !node->els)
        {
            l = gen_label();
            gen_expr(node->cond);
            emit("  pop rax");
            emit("  cmp rax, 0");
            emit("  je .L%d", l);
            gen_expr(node->then);
            emit(".L%d:", l);
            return;
        }

        // For conditional expressions (ternary operators) or if-else
        l = gen_label();
        l2 = gen_label();

        gen_expr(node->cond);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  je .L%d", l);

        gen_expr(node->then);
        emit("  jmp .L%d", l2);

        emit(".L%d:", l);
        if (node->els)
            gen_expr(node->els);

        emit(".L%d:", l2);
        return;
    }
    case ND_ADDR:
        gen_addr(node->lhs);
        return;
    case ND_DEREF:
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  mov rax, [rax]");
        emit("  push rax");
        return;
    case ND_ARRAY_SUBSCRIPT:
        gen_addr(node);
        emit("  pop rax");

        // Check if this is a char array and use the right load instruction
        if (node->type && node->type->kind == TY_CHAR)
            emit("  movzx eax, byte ptr [rax]");
        else
            emit("  mov rax, [rax]");

        emit("  push rax");
        return;
    case ND_MEMBER:
        gen_addr(node);
        emit("  pop rax");
        if (node->member && node->member->bit_width > 0)
        {
            // Bitfield access: load storage unit, shift, mask
            emit("  mov eax, dword ptr [rax]");
            if (node->member->bit_offset > 0)
                emit("  shr eax, %d", node->member->bit_offset);
            int mask = (1U << node->member->bit_width) - 1;
            emit("  and eax, 0x%x", mask);
            emit("  push rax");
        }
        else
        {
            emit("  mov rax, [rax]");
            emit("  push rax");
        }
        return;
    case ND_FUNC_CALL:
        // Push all arguments onto the stack in reverse order
        i = 0;
        for (arg = node->args; arg; arg = arg->next)
            i++;

        for (arg = node->args; arg; arg = arg->next)
        {
            gen_expr(arg);
            i--;
        }

        // Pop arguments into registers - fix for the pointer/integer comparison
        for (i = 0; i < 6 && i < count_args(node->args); i++)
            emit("  pop %s", argreg[i]);

        // We need to align RSP to a 16-byte boundary before
        // calling a function. Here we assume that RAX is 0.
        l = gen_label();
        emit("  mov rax, rsp");
        emit("  and rax, 15");
        emit("  jnz .Lcall%d", l);
        emit("  mov rax, 0");
        emit("  call %.*s", node->func_name_len, node->func_name);
        emit("  jmp .Lend%d", l);
        emit(".Lcall%d:", l);
        emit("  sub rsp, 8");
        emit("  mov rax, 0");
        emit("  call %.*s", node->func_name_len, node->func_name);
        emit("  add rsp, 8");
        emit(".Lend%d:", l);
        emit("  push rax");
        return;
    case ND_MOD:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        emit("  cqo");
        emit("  idiv rdi");
        emit("  push rdx"); // Remainder is in rdx
        return;
    case ND_BITAND:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        emit("  and rax, rdi");
        emit("  push rax");
        return;
    case ND_BITOR:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        emit("  or rax, rdi");
        emit("  push rax");
        return;
    case ND_BITXOR:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        emit("  xor rax, rdi");
        emit("  push rax");
        return;
    case ND_SHL:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rcx"); // Right operand in rcx for shift
        emit("  pop rax");
        emit("  sal rax, cl");
        emit("  push rax");
        return;
    case ND_SHR:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rcx"); // Right operand in rcx for shift
        emit("  pop rax");
        emit("  sar rax, cl");
        emit("  push rax");
        return;
    case ND_LOGAND:
    {
        int l = gen_label();
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  je .L%d", l);
        gen_expr(node->rhs);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  mov rax, 0");
        emit("  setne al");
        emit("  push rax");
        emit(".L%d:", l);
        return;
    }
    case ND_LOGOR:
    {
        int l = gen_label();
        int l2 = gen_label();
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  jne .L%d", l);
        gen_expr(node->rhs);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  mov rax, 0");
        emit("  setne al");
        emit("  push rax");
        emit("  jmp .L%d", l2);
        emit(".L%d:", l);
        emit("  push 1");
        emit(".L%d:", l2);
        return;
    }
    case ND_NOT:
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  sete al");
        emit("  movzb rax, al");
        emit("  push rax");
        return;
    case ND_BITNOT:
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  not rax");
        emit("  push rax");
        return;
    case ND_FUNC_PTR_CALL:
    {
        // Push all arguments onto the stack in reverse order
        i = 0;
        for (arg = node->args; arg; arg = arg->next)
            i++;

        for (arg = node->args; arg; arg = arg->next)
        {
            gen_expr(arg);
            i--;
        }

        // Pop arguments into registers
        for (i = 0; i < 6 && i < count_args(node->args); i++)
            emit("  pop %s", argreg[i]);

        // Generate function pointer expression
        gen_expr(node->lhs);
        emit("  pop rax"); // Function pointer in RAX

        // We need to align RSP to a 16-byte boundary before
        // calling a function through a pointer
        l = gen_label();
        emit("  mov r10, rsp");
        emit("  and r10, 15");
        emit("  jnz .Lcall%d", l);
        emit("  call rax");
        emit("  jmp .Lend%d", l);
        emit(".Lcall%d:", l);
        emit("  sub rsp, 8");
        emit("  call rax");
        emit("  add rsp, 8");
        emit(".Lend%d:", l);
        emit("  push rax");
        return;
    }
    }

    gen_expr(node->lhs);
    gen_expr(node->rhs);

    emit("  pop rdi");
    emit("  pop rax");

    switch (node->kind)
    {
    case ND_ADD:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        if (node->lhs->type && node->lhs->type->kind == TY_FLOAT)
        {
            emit("  movss xmm0, dword ptr [rax]");
            emit("  addss xmm0, dword ptr [rdi]");
            emit("  sub rsp, 4");
            emit("  movss dword ptr [rsp], xmm0");
            emit("  push dword ptr [rsp]");
            return;
        }
        if (node->lhs->type && node->lhs->type->kind == TY_DOUBLE)
        {
            emit("  movsd xmm0, qword ptr [rax]");
            emit("  addsd xmm0, qword ptr [rdi]");
            emit("  sub rsp, 8");
            emit("  movsd qword ptr [rsp], xmm0");
            emit("  push qword ptr [rsp]");
            return;
        }
        emit("  add rax, rdi");
        emit("  push rax");
        return;
    case ND_SUB:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        if (node->lhs->type && node->lhs->type->kind == TY_FLOAT)
        {
            emit("  movss xmm0, dword ptr [rax]");
            emit("  subss xmm0, dword ptr [rdi]");
            emit("  sub rsp, 4");
            emit("  movss dword ptr [rsp], xmm0");
            emit("  push dword ptr [rsp]");
            return;
        }
        if (node->lhs->type && node->lhs->type->kind == TY_DOUBLE)
        {
            emit("  movsd xmm0, qword ptr [rax]");
            emit("  subsd xmm0, qword ptr [rdi]");
            emit("  sub rsp, 8");
            emit("  movsd qword ptr [rsp], xmm0");
            emit("  push qword ptr [rsp]");
            return;
        }
        emit("  sub rax, rdi");
        emit("  push rax");
        return;
    case ND_MUL:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        if (node->lhs->type && node->lhs->type->kind == TY_FLOAT)
        {
            emit("  movss xmm0, dword ptr [rax]");
            emit("  mulss xmm0, dword ptr [rdi]");
            emit("  sub rsp, 4");
            emit("  movss dword ptr [rsp], xmm0");
            emit("  push dword ptr [rsp]");
            return;
        }
        if (node->lhs->type && node->lhs->type->kind == TY_DOUBLE)
        {
            emit("  movsd xmm0, qword ptr [rax]");
            emit("  mulsd xmm0, qword ptr [rdi]");
            emit("  sub rsp, 8");
            emit("  movsd qword ptr [rsp], xmm0");
            emit("  push qword ptr [rsp]");
            return;
        }
        emit("  imul rax, rdi");
        emit("  push rax");
        return;
    case ND_DIV:
        gen_expr(node->lhs);
        gen_expr(node->rhs);
        emit("  pop rdi");
        emit("  pop rax");
        if (node->lhs->type && node->lhs->type->kind == TY_FLOAT)
        {
            emit("  movss xmm0, dword ptr [rax]");
            emit("  divss xmm0, dword ptr [rdi]");
            emit("  sub rsp, 4");
            emit("  movss dword ptr [rsp], xmm0");
            emit("  push dword ptr [rsp]");
            return;
        }
        if (node->lhs->type && node->lhs->type->kind == TY_DOUBLE)
        {
            emit("  movsd xmm0, qword ptr [rax]");
            emit("  divsd xmm0, qword ptr [rdi]");
            emit("  sub rsp, 8");
            emit("  movsd qword ptr [rsp], xmm0");
            emit("  push qword ptr [rsp]");
            return;
        }
        emit("  cqo");
        emit("  idiv rdi");
        emit("  push rax");
        return;
    case ND_EQ:
        emit("  cmp rax, rdi");
        emit("  sete al");
        emit("  movzb rax, al");
        break;
    case ND_NE:
        emit("  cmp rax, rdi");
        emit("  setne al");
        emit("  movzb rax, al");
        break;
    case ND_LT:
        emit("  cmp rax, rdi");
        emit("  setl al");
        emit("  movzb rax, al");
        break;
    case ND_LE:
        emit("  cmp rax, rdi");
        emit("  setle al");
        emit("  movzb rax, al");
        break;
    }

    emit("  push rax");
}

// Helper function to count the number of arguments in a linked list
static int count_args(Node *args)
{
    int count = 0;
    for (Node *arg = args; arg; arg = arg->next)
        count++;
    return count;
}

// Generate code for a statement
static void gen_stmt(Node *node)
{
    int l1, l2;

    switch (node->kind)
    {
    case ND_RETURN:
        gen_expr(node->lhs);
        emit("  pop rax");
        emit("  mov rsp, rbp");
        emit("  pop rbp");
        emit("  ret");
        return;
    case ND_IF:
        l1 = gen_label();
        if (node->els)
        {
            l2 = gen_label();

            gen_expr(node->cond);
            emit("  pop rax");
            emit("  cmp rax, 0");
            emit("  je .L%d", l2);

            gen_stmt(node->then);
            emit("  jmp .L%d", l1);

            emit(".L%d:", l2);
            gen_stmt(node->els);

            emit(".L%d:", l1);
        }
        else
        {
            gen_expr(node->cond);
            emit("  pop rax");
            emit("  cmp rax, 0");
            emit("  je .L%d", l1);

            gen_stmt(node->then);

            emit(".L%d:", l1);
        }
        return;
    case ND_WHILE:
        l1 = gen_label();
        l2 = gen_label();

        emit(".L%d:", l1);
        gen_expr(node->cond);
        emit("  pop rax");
        emit("  cmp rax, 0");
        emit("  je .L%d", l2);

        gen_stmt(node->then);
        emit("  jmp .L%d", l1);

        emit(".L%d:", l2);
        return;
    case ND_FOR:
        l1 = gen_label();
        l2 = gen_label();

        if (node->init)
            gen_expr(node->init);
        if (node->init)
            emit("  pop rax"); // Discard init result

        emit(".L%d:", l1);
        if (node->cond)
        {
            gen_expr(node->cond);
            emit("  pop rax");
            emit("  cmp rax, 0");
            emit("  je .L%d", l2);
        }

        gen_stmt(node->then);

        if (node->inc)
        {
            gen_expr(node->inc);
            emit("  pop rax"); // Discard inc result
        }

        emit("  jmp .L%d", l1);
        emit(".L%d:", l2);
        return;
    case ND_BLOCK:
        for (Node *n = node->body; n; n = n->next)
            gen_stmt(n);
        return;
    default:
        gen_expr(node);
        emit("  pop rax"); // Discard the result
    }
}

// Generate code for a function
static void gen_function(Function *fn)
{
    emit("%.*s:", fn->len, fn->name);

    // Prologue
    emit("  push rbp");
    emit("  mov rbp, rsp");
    emit("  sub rsp, %d", fn->stack_size);

    // Push arguments to the stack
    int i = 0;
    for (LVar *param = fn->params; param && i < 6; param = param->next)
    {
        emit("  mov [rbp-%d], %s", param->offset, argreg[i]);
        i++;
    }

    // Generate code for function body - fix for the type mismatch
    for (Node *node = fn->body; node; node = node->next)
        gen_stmt(node);

    // Epilogue
    emit("  mov rsp, rbp");
    emit("  pop rbp");
    emit("  ret");
}

#define MAX_ASM_LINES 4096
#define MAX_ASM_LINE_LEN 128
static char asm_lines[MAX_ASM_LINES][MAX_ASM_LINE_LEN];
static int asm_line_count = 0;

static void emit(const char *fmt, ...)
{
    if (asm_line_count >= MAX_ASM_LINES)
        return;
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(asm_lines[asm_line_count], MAX_ASM_LINE_LEN, fmt, ap);
    va_end(ap);
    asm_line_count++;
}

// Advanced peephole optimizer: includes stack, loads/stores, arithmetic, control flow, dead code, move chains, nops, label deduplication
static void peephole_optimize_and_output()
{
    // First pass: merge stack adjustments across more than two lines
    char merged[MAX_ASM_LINES][MAX_ASM_LINE_LEN];
    int merged_count = 0;
    int i = 0;
    while (i < asm_line_count)
    {
        // Merge consecutive sub/add rsp, N
        int n = 0, j = i;
        while (j < asm_line_count)
        {
            int val;
            if (sscanf(asm_lines[j], "  sub rsp, %d", &val) == 1)
                n -= val;
            else if (sscanf(asm_lines[j], "  add rsp, %d", &val) == 1)
                n += val;
            else
                break;
            j++;
        }
        if (j > i)
        {
            if (n < 0)
                snprintf(merged[merged_count++], MAX_ASM_LINE_LEN, "  sub rsp, %d", -n);
            else if (n > 0)
                snprintf(merged[merged_count++], MAX_ASM_LINE_LEN, "  add rsp, %d", n);
            i = j;
            continue;
        }
        strcpy(merged[merged_count++], asm_lines[i]);
        i++;
    }
    // Second pass: remove stack adjustments before ret if not needed, remove nops, and do all previous optimizations
    char cleaned[MAX_ASM_LINES][MAX_ASM_LINE_LEN];
    int cleaned_count = 0;
    for (i = 0; i < merged_count; i++)
    {
        // Remove nops
        if (strcmp(merged[i], "  nop") == 0)
            continue;
        // Remove stack adjustment before ret if mov rsp, rbp is present
        if (i + 2 < merged_count &&
            strncmp(merged[i], "  mov rsp, rbp", 14) == 0 &&
            strncmp(merged[i + 1], "  pop rbp", 9) == 0 &&
            strncmp(merged[i + 2], "  ret", 5) == 0)
        {
            strcpy(cleaned[cleaned_count++], merged[i]);
            strcpy(cleaned[cleaned_count++], merged[i + 1]);
            strcpy(cleaned[cleaned_count++], merged[i + 2]);
            i += 2;
            continue;
        }
        // Remove mov reg, reg
        char reg1[8], reg2[8];
        if (sscanf(merged[i], "  mov %7s, %7s", reg1, reg2) == 2 && strcmp(reg1, reg2) == 0)
            continue;
        // Remove push/pop reg pairs (same reg)
        if (i + 1 < merged_count)
        {
            char reg_push[8], reg_pop[8];
            if (sscanf(merged[i], "  push %7s", reg_push) == 1 &&
                sscanf(merged[i + 1], "  pop %7s", reg_pop) == 1 &&
                strcmp(reg_push, reg_pop) == 0)
            {
                i++;
                continue;
            }
        }
        // Remove add reg, 0 and sub reg, 0
        char reg3[8];
        int imm;
        if ((sscanf(merged[i], "  add %7s, %d", reg3, &imm) == 2 && imm == 0) ||
            (sscanf(merged[i], "  sub %7s, %d", reg3, &imm) == 2 && imm == 0))
            continue;
        // Remove imul reg, 1 and mul reg, 1
        if ((sscanf(merged[i], "  imul %7s, %d", reg3, &imm) == 2 && imm == 1) ||
            (sscanf(merged[i], "  mul %7s, %d", reg3, &imm) == 2 && imm == 1))
            continue;
        // Remove double negation: neg reg; neg reg
        if (i + 1 < merged_count)
        {
            char reg4[8], reg5[8];
            if (sscanf(merged[i], "  neg %7s", reg4) == 1 &&
                sscanf(merged[i + 1], "  neg %7s", reg5) == 1 &&
                strcmp(reg4, reg5) == 0)
            {
                i++;
                continue;
            }
        }
        // Remove add/sub rsp, N followed by the opposite (already merged above)
        // Remove mov reg, imm followed by mov reg, imm (keep only the last)
        if (i + 1 < merged_count)
        {
            char reg6[8], reg7[8];
            int imm1, imm2;
            if (sscanf(merged[i], "  mov %7s, %d", reg6, &imm1) == 2 &&
                sscanf(merged[i + 1], "  mov %7s, %d", reg7, &imm2) == 2 &&
                strcmp(reg6, reg7) == 0)
            {
                continue;
            }
        }
        // Remove xor reg, reg followed by mov reg, 0 (redundant zeroing)
        if (i + 1 < merged_count)
        {
            char reg8[8], reg9[8];
            int imm3;
            if (sscanf(merged[i], "  xor %7s, %7s", reg8, reg9) == 2 &&
                strcmp(reg8, reg9) == 0 &&
                sscanf(merged[i + 1], "  mov %7s, %d", reg8, &imm3) == 2 && imm3 == 0)
            {
                i++;
                continue;
            }
            if (sscanf(merged[i], "  mov %7s, %d", reg8, &imm3) == 2 && imm3 == 0 &&
                sscanf(merged[i + 1], "  xor %7s, %7s", reg9, reg8) == 2 && strcmp(reg8, reg9) == 0)
            {
                i++;
                continue;
            }
        }
        // Remove cmp reg, 0 followed by test reg, reg (redundant zero check)
        if (i + 1 < merged_count)
        {
            char reg10[8], reg11[8];
            if (sscanf(merged[i], "  cmp %7s, 0", reg10) == 1 &&
                sscanf(merged[i + 1], "  test %7s, %7s", reg11, reg11) == 2 && strcmp(reg10, reg11) == 0)
            {
                i++;
                continue;
            }
            if (sscanf(merged[i], "  test %7s, %7s", reg10, reg11) == 2 && strcmp(reg10, reg11) == 0 &&
                sscanf(merged[i + 1], "  cmp %7s, 0", reg11) == 1 && strcmp(reg10, reg11) == 0)
            {
                i++;
                continue;
            }
        }
        // Remove jumps to next instruction (jmp .Lx; .Lx:)
        if (i + 1 < merged_count)
        {
            char label[32];
            if (sscanf(merged[i], "  jmp %31s", label) == 1 &&
                strstr(merged[i + 1], label) && strchr(merged[i + 1], ':'))
            {
                i++;
                continue;
            }
        }
        // Remove unreachable code after ret/jmp until next label
        if (strncmp(merged[i], "  ret", 5) == 0 || strncmp(merged[i], "  jmp ", 6) == 0)
        {
            strcpy(cleaned[cleaned_count++], merged[i]);
            i++;
            while (i < merged_count && merged[i][0] != '.')
                i++;
            continue;
        }
        // Remove nop
        if (strcmp(merged[i], "  nop") == 0)
            continue;
        // Output the line if not optimized away
        strcpy(cleaned[cleaned_count++], merged[i]);
    }
    // Third pass: remove unused labels (labels not referenced)
    int used[MAX_ASM_LINES] = {0};
    for (i = 0; i < cleaned_count; i++)
    {
        if (cleaned[i][0] == '.')
        {
            // Check if label is referenced
            int referenced = 0;
            for (int j = 0; j < cleaned_count; j++)
            {
                if (j == i)
                    continue;
                if (strstr(cleaned[j], cleaned[i]) && strchr(cleaned[j], 'j'))
                {
                    referenced = 1;
                    break;
                }
            }
            if (!referenced)
                continue;
        }
        puts(cleaned[i]);
    }
    asm_line_count = 0;
}

// Generate x86-64 assembly for a program
void codegen(Function *prog)
{
    // Print out the assembly header
    fprintf(stderr, "[DEBUG] Entering codegen for function: %.*s\n", prog->len, prog->name);
    emit(".intel_syntax noprefix");

    // Generate code for each function
    for (Function *fn = prog; fn; fn = fn->next)
    {
        fprintf(stderr, "[DEBUG] Generating code for function: %.*s\n", fn->len, fn->name);
        // Print the function name with .global directive
        emit(".global %.*s", fn->len, fn->name);
        gen_function(fn);
    }

    peephole_optimize_and_output();
    fprintf(stderr, "Assembly generation complete\n");
}