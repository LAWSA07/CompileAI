/* tokenize.c - cleaned and refactored */
#include "lawsa.h"
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>
#include "preprocess.h"

// Add at the very top of the file
__attribute__((constructor)) static void file_loaded_notice() { fprintf(stderr, "[DEBUG] tokenize.c loaded\n"); }

// Custom strndup
static char *my_strndup(const char *s, size_t n)
{
    char *new = malloc(n + 1);
    if (!new)
        return NULL;
    memcpy(new, s, n);
    new[n] = '\0';
    return new;
}

// Parser state
static Token *prev_token = NULL;

static int is_active = 1;

bool consume(char *op)
{
    if (token->kind != TK_RESERVED || token->len != strlen(op) ||
        memcmp(token->str, op, token->len) != 0)
        return false;
    prev_token = token;
    token = token->next;
    return true;
}

void unget_token(void)
{
    if (prev_token)
    {
        token = prev_token;
        prev_token = NULL;
    }
}

Token *consume_ident(void)
{
    if (token->kind != TK_IDENT)
        return NULL;
    Token *t = token;
    token = token->next;
    return t;
}

bool consume_keyword(char *kw)
{
    if (token->kind != TK_KEYWORD || token->len != strlen(kw) ||
        memcmp(token->str, kw, token->len) != 0)
        return false;
    token = token->next;
    return true;
}

void expect(char *op)
{
    if (token->kind != TK_RESERVED || token->len != strlen(op) ||
        memcmp(token->str, op, token->len) != 0)
    {
        if (token->kind == TK_EOF)
            error_at(token, "expected '%s', but got EOF", op);
        else
            error_at(token, "expected '%s', but got '%.*s'", op, token->len, token->str);
    }
    token = token->next;
}

int expect_number(void)
{
    if (token->kind != TK_NUM)
        error_at(token, "expected a number");
    int val = token->val;
    token = token->next;
    return val;
}

char *expect_ident(void)
{
    if (token->kind != TK_IDENT)
        error_at(token, "expected an identifier");
    char *s = my_strndup(token->str, token->len);
    token = token->next;
    return s;
}
bool at_eof(void)
{
    return token->kind == TK_EOF;
}

// Token construction
static Token *new_token(TokenKind kind, Token *cur,
                        char *str, int len,
                        const char *file, int line, int col)
{
    Token *tok = calloc(1, sizeof(Token));
    tok->kind = kind;
    tok->str = str;
    tok->len = len;
    tok->file = file;
    tok->line = line;
    tok->column = col;
    cur->next = tok;
    return tok;
}

// Identifier tests
static bool is_ident1(char c) { return isalpha(c) || c == '_'; }
static bool is_ident2(char c) { return is_ident1(c) || isdigit(c); }

// Keywords
static bool is_keyword(const char *p, int len)
{
    static const char *kw[] = {"if", "else", "while", "for", "return",
        "void", "char", "short", "int", "long", "float", "double",
        "signed", "unsigned", "const", "volatile",
        "struct", "union", "enum", "typedef",
        "sizeof", "static", "extern", "register", "break",
        "continue", "switch", "case", "default", "do", "goto"};
    for (int i = 0; i < sizeof(kw) / sizeof(*kw); i++)
        if (strlen(kw[i]) == len && !strncmp(p, kw[i], len))
            return true;
    return false;
}

// Whitespace & comments
static char *skip_whitespace(char *p)
{
    while (*p)
    {
        if (isspace(*p))
        {
            p++;
            continue;
        }
        if (p[0] == '/' && p[1] == '/')
        {
            p += 2;
            while (*p && *p != '\n')
                p++;
            continue;
        }
        if (p[0] == '/' && p[1] == '*')
        {
            p += 2;
            while (*p && !(p[0] == '*' && p[1] == '/'))
                p++;
            if (*p)
            p += 2;
            continue;
        }
        break;
    }
    return p;
}

// File inclusion guards
#define MAX_INCLUDED_FILES 128
static char *included_files[MAX_INCLUDED_FILES];
static int included_file_count;
static bool is_file_included(const char *fn)
{
    for (int i = 0; i < included_file_count; i++)
        if (!strcmp(included_files[i], fn))
            return true;
    return false;
}
static void add_included_file(const char *fn)
{
    if (included_file_count < MAX_INCLUDED_FILES)
        included_files[included_file_count++] = strdup(fn);
}

static char *resolve_include_path(const char *incfile, const char *fn)
{
    if (fn[0] == '/' || (fn[1] == ':' && fn[2] == '\\'))
        return strdup(fn);
    char *dir = strdup(incfile);
    char *s = strrchr(dir, '/');
    if (!s)
        s = strrchr(dir, '\\');
    if (s)
        *(s + 1) = 0;
    else
        dir[0] = 0;
    char *res = malloc(strlen(dir) + strlen(fn) + 1);
    sprintf(res, "%s%s", dir, fn);
    free(dir);
    return res;
}

// Tokenizer entry
Token *tokenize(char *p)
{
    fprintf(stderr, "[DEBUG] Entering tokenize()\n");
    Token head = {0}, *cur = &head;
    const char *file = "<input>";
    int line = 1, col = 1;
    int token_count = 0;
    while (*p)
    {
        if (++token_count > 1000000)
        {
            error("Tokenizer recursion or token overflow");
            break;
        }
        // Skip lines where the first non-whitespace character is '#'
        char *line_start = p;
        while (*p == ' ' || *p == '\t')
            p++;
        if (*p == '#')
        {
            while (*p && *p != '\n' && *p != '\r')
                p++;
            if (*p == '\r' && *(p + 1) == '\n')
            {
                p += 2;
                line++;
                col = 1;
            }
            else if (*p == '\n' || *p == '\r')
            {
                p++;
                line++;
                col = 1;
            }
            continue;
        }
        p = line_start; // Reset p to start of line for normal tokenization
        fprintf(stderr, "[DEBUG] Top of while(*p) loop, char='%c'\n", *p);
        char *old_p = p;
        p = skip_whitespace(p);
        col += (int)(p - old_p);
        if (!*p)
            break;
        // Multi-letter punctuators
        if (strncmp(p, "==", 2) == 0 || strncmp(p, "!=", 2) == 0 ||
            strncmp(p, "<=", 2) == 0 || strncmp(p, ">=", 2) == 0 ||
            strncmp(p, "+=", 2) == 0 || strncmp(p, "-=", 2) == 0 ||
            strncmp(p, "*=", 2) == 0 || strncmp(p, "/=", 2) == 0 ||
            strncmp(p, "++", 2) == 0 || strncmp(p, "--", 2) == 0 ||
            strncmp(p, "&&", 2) == 0 || strncmp(p, "||", 2) == 0 ||
            strncmp(p, "<<", 2) == 0 || strncmp(p, ">>", 2) == 0)
        {
            cur = new_token(TK_RESERVED, cur, p, 2, file, line, col);
            p += 2;
            col += 2;
            continue;
        }
        // Single-letter punctuators
        if (strchr("+-*/()<>=;{},&[].|^~?:!%", *p))
        {
            cur = new_token(TK_RESERVED, cur, p, 1, file, line, col);
            p++;
            col++;
            continue;
        }
        // Numeric literals
        if (isdigit(*p))
        {
            char *q = p;
            int tok_col = col;
            long val = strtol(p, &p, 10);
            cur = new_token(TK_NUM, cur, q, p - q, file, line, tok_col);
            cur->val = val;
            col += (int)(p - q);
            continue;
        }
        // Char literals
        if (*p == '\'')
        {
            char *start = p;
            int tok_col = col;
            p++;
            col++;
            int c;
            if (*p == '\\')
            {
                p++;
                col++;
                switch (*p)
                {
                case 'n':
                    c = '\n';
                    break;
                case 't':
                    c = '\t';
                    break;
                case 'r':
                    c = '\r';
                    break;
                case '0':
                    c = '\0';
                    break;
                case '\'':
                    c = '\'';
                    break;
                case '"':
                    c = '"';
                    break;
                case '\\':
                    c = '\\';
                    break;
                default:
                    error_at(token, "unknown escape sequence: \\%c", *p);
                }
                p++;
                col++;
            }
            else if (*p)
            {
                c = *p;
                p++;
                col++;
            }
            else
            {
                error_at(token, "unterminated char literal");
            }
            if (*p != '\'')
                error_at(token, "unterminated char literal");
            p++;
            col++;
            cur = new_token(TK_NUM, cur, start, p - start, file, line, tok_col);
            cur->val = c;
            continue;
        }
        // Identifiers/keywords
        if (is_ident1(*p))
        {
            char *start = p;
            int tok_col = col;
            do
            {
                p++;
                col++;
            } while (is_ident2(*p));
            int len = p - start;
            if (is_keyword(start, len))
                cur = new_token(TK_KEYWORD, cur, start, len, file, line, tok_col);
            else
                cur = new_token(TK_IDENT, cur, start, len, file, line, tok_col);
            continue;
        }
        // String literal
        if (*p == '"')
        {
            int tok_col = col;
            p++;
            col++;
            char *str = p;
            while (*p && *p != '"')
            {
                if (*p == '\n')
                {
                    line++;
                    col = 1;
                }
                else
                    col++;
                p++;
            }
            if (*p != '"')
                error_at(token, "unterminated string literal");
            cur = new_token(TK_STR, cur, str, p - str, file, line, tok_col);
            p++;
            col++;
            continue;
        }
        // Newline
        if (*p == '\n')
        {
            p++;
            line++;
            col = 1;
            continue;
        }
        // Unknown char
        error_at(token, "invalid token");
        p++;
        col++;
    }
    new_token(TK_EOF, cur, p, 0, file, line, col);
    // Debug: print the first 10 tokens at the end of tokenization
    Token *dbg = head.next;
    int dbg_count = 0;
    fprintf(stderr, "[TOKENIZER DEBUG] First tokens:\n");
    while (dbg && dbg->kind != TK_EOF && dbg_count < 10)
    {
        fprintf(stderr, "  kind=%d, str='%.*s'\n", dbg->kind, dbg->len, dbg->str);
        dbg = dbg->next;
        dbg_count++;
    }
    // After tokenization, preprocess the token list
       return head.next;
}
