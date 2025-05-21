#ifndef TYPE_H
#define TYPE_H

// Type kind
typedef enum
{
    TY_VOID,
    TY_CHAR,
    TY_SHORT,
    TY_INT,
    TY_LONG,
    TY_LONGLONG,
    TY_UCHAR,
    TY_USHORT,
    TY_UINT,
    TY_ULONG,
    TY_ULONGLONG,
    TY_FLOAT,
    TY_DOUBLE,
    TY_LONGDOUBLE,
    TY_ENUM,
    TY_PTR,
    TY_ARRAY,
    TY_STRUCT,
    TY_UNION,
    TY_FUNC,
    TY_TYPEDEF
} TypeKind;

// Type qualifiers
typedef struct
{
    bool is_const;
    bool is_volatile;
    bool is_signed;   // For explicit signed
    bool is_unsigned; // For explicit unsigned
} TypeQualifiers;

// Type
typedef struct Type Type;
struct Type
{
    TypeKind kind;
    int size;                  // Type size
    int align;                 // Alignment
    TypeQualifiers qualifiers; // Qualifiers

    // Pointer
    Type *ptr_to; // Pointer base type

    // Array
    int array_size;   // Array size
    int element_size; // Size of each element

    // Struct/Union
    struct Member *members;
    int member_count;
    char *tag; // Struct/union tag name

    // Enum
    struct EnumConst *enum_consts;
    int enum_const_count;
    char *enum_tag;

    // Typedef
    char *typedef_name;
    Type *typedef_type;

    // Function
    Type *return_type; // Return type
    Type **params;     // Parameter types
    int param_count;   // Number of parameters
    bool is_variadic;  // Is variadic function?

    // Variable
    char *name; // Variable name
};

// Struct member
typedef struct Member Member;
struct Member
{
    Member *next;
    Type *ty;
    char *name;
    int offset;
    int bit_width;  // For bitfields
    int bit_offset; // For bitfields
};

// Enum constant
typedef struct EnumConst EnumConst;
struct EnumConst
{
    EnumConst *next;
    char *name;
    int value;
};

// Function declarations for type creation and checking
Type *int_type(bool is_unsigned);
Type *char_type(bool is_unsigned);
Type *void_type();
Type *pointer_to(Type *base);
Type *array_of(Type *base, int size);
Type *function_type(Type *return_type);
Type *long_type(bool is_unsigned);
Type *longdouble_type();
Type *enum_type(const char *tag);
void add_param_type(Type *func, Type *param);
bool is_compatible(Type *a, Type *b);
bool is_integer_type(Type *ty);
int size_of(Type *ty);
Type *float_type();
Type *double_type();

#endif // TYPE_H