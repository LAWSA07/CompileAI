#include "lawsa.h"
// #include "type.h" - comment out to avoid duplicate definitions

Type *int_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = is_unsigned ? TY_UINT : TY_INT;
    ty->size = 4;
    ty->align = 4;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

Type *char_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = is_unsigned ? TY_UCHAR : TY_CHAR;
    ty->size = 1;
    ty->align = 1;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

Type *short_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = is_unsigned ? TY_USHORT : TY_SHORT;
    ty->size = 2;
    ty->align = 2;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

Type *long_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = is_unsigned ? TY_ULONG : TY_LONG;
    ty->size = 8;
    ty->align = 8;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

Type *longlong_type(bool is_unsigned)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = is_unsigned ? TY_ULONGLONG : TY_LONGLONG;
    ty->size = 8;
    ty->align = 8;
    ty->qualifiers.is_unsigned = is_unsigned;
    return ty;
}

Type *float_type()
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_FLOAT;
    ty->size = 4;
    return ty;
}

Type *double_type()
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_DOUBLE;
    ty->size = 8;
    return ty;
}

Type *longdouble_type()
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_LONGDOUBLE;
    ty->size = 16;
    ty->align = 16;
    return ty;
}

Type *enum_type(const char *tag)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_ENUM;
    ty->size = 4;
    ty->align = 4;
    ty->enum_tag = tag;
    return ty;
}

Type *typedef_type(char *name, Type *aliased)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_TYPEDEF;
    ty->typedef_name = name;
    ty->typedef_type = aliased;
    ty->size = aliased->size;
    ty->align = aliased->align;
    return ty;
}

Type *pointer_to(Type *base)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_PTR;
    ty->ptr_to = base;
    ty->size = 8;
    return ty;
}

Type *array_of(Type *base, int size)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_ARRAY;
    ty->ptr_to = base;
    ty->size = base->size * size;
    ty->array_size = size;
    return ty;
}

Type *void_type()
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_VOID;
    ty->size = 0;
    ty->align = 1;
    return ty;
}

Type *function_type(Type *return_type)
{
    Type *ty = calloc(1, sizeof(Type));
    ty->kind = TY_FUNC;
    ty->return_type = return_type;
    ty->params = NULL;
    ty->param_count = 0;
    ty->is_variadic = false;
    ty->size = 8; // Function pointers are 8 bytes on x86-64
    return ty;
}

void add_param_type(Type *func, Type *param)
{
    if (func->kind != TY_FUNC)
        return;

    // Allocate or resize parameter array
    if (func->params == NULL)
    {
        func->params = calloc(8, sizeof(Type *)); // Start with 8 slots
    }
    else if (func->param_count % 8 == 0)
    {
        // Double capacity when needed
        size_t new_size = (func->param_count + 8) * sizeof(Type *);
        func->params = realloc(func->params, new_size);
    }

    // Add parameter
    func->params[func->param_count++] = param;
}

/* Remove this duplicate function
int size_of(Type *ty) {
    if (ty == NULL)
        return 0;
    return ty->size;
}
*/

bool is_integer_type(Type *ty)
{
    // Resolve typedefs if needed
    while (ty && ty->kind == TY_TYPEDEF)
        ty = ty->typedef_type;
    return ty && (ty->kind == TY_CHAR || ty->kind == TY_UCHAR ||
                  ty->kind == TY_SHORT || ty->kind == TY_USHORT ||
                  ty->kind == TY_INT || ty->kind == TY_UINT ||
                  ty->kind == TY_LONG || ty->kind == TY_ULONG ||
                  ty->kind == TY_LONGLONG || ty->kind == TY_ULONGLONG ||
                  ty->kind == TY_ENUM);
}

bool is_compatible(Type *a, Type *b)
{
    if (!a || !b)
        return false;
    // Resolve typedefs
    while (a->kind == TY_TYPEDEF)
        a = a->typedef_type;
    while (b->kind == TY_TYPEDEF)
        b = b->typedef_type;

    // Disallow assignment to arrays
    if (a->kind == TY_ARRAY || b->kind == TY_ARRAY)
        return false;
    // Disallow assignment to incomplete types
    if ((a->kind == TY_STRUCT || a->kind == TY_UNION) && a->size == 0)
        return false;
    if ((b->kind == TY_STRUCT || b->kind == TY_UNION) && b->size == 0)
        return false;
    // Disallow assignment to const (if tracked)
    if (a->qualifiers.is_const)
        return false;
    // Struct/union: must be the same type (pointer equality)
    if ((a->kind == TY_STRUCT || a->kind == TY_UNION) && (b->kind == TY_STRUCT || b->kind == TY_UNION))
        return a == b;
    // Integer types: allow implicit conversions
    if (is_integer_type(a) && is_integer_type(b))
        return true;
    // Pointer types: allow assignment if types are compatible or one is void*
    if (a->kind == TY_PTR && b->kind == TY_PTR)
    {
        if (a->ptr_to->kind == TY_VOID || b->ptr_to->kind == TY_VOID)
            return true;
        return is_compatible(a->ptr_to, b->ptr_to);
    }
    // Allow assignment between pointer and NULL (int 0)
    if ((a->kind == TY_PTR && b->kind == TY_INT) || (b->kind == TY_PTR && a->kind == TY_INT))
        return true;
    // Disallow assignment to string literals (if tracked as const char*)
    if ((a->kind == TY_PTR && a->ptr_to && a->ptr_to->kind == TY_CHAR && a->qualifiers.is_const) ||
        (b->kind == TY_PTR && b->ptr_to && b->ptr_to->kind == TY_CHAR && b->qualifiers.is_const))
        return false;
    // Function pointers: must match signature
    if (a->kind == TY_FUNC && b->kind == TY_FUNC)
        return a == b;
    return false;
}