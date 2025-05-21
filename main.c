#include "lawsa.h"
#include "preprocess.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *user_input;
Token *token;
int error_count = 0;

// Reports an error and continue
void error(char *fmt, ...)
{
    fprintf(stderr, "[DEBUG] error() called\n");
    fflush(stderr);
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    fprintf(stderr, "\n");
    error_count++;
}

// Reports an error location and continue
void error_at(Token *tok, char *fmt, ...)
{
    if (!tok)
    {
        fprintf(stderr, "<unknown location>: error: ");
    }
    else
    {
        fprintf(stderr, "%s:%d:%d: error: ", tok->file ? tok->file : "<input>", tok->line, tok->column);
    }
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fprintf(stderr, "\n");
    error_count++;
}

// Read input from stdin
char *read_from_stdin()
{
    char *buffer = NULL;
    size_t buffer_size = 0;
    size_t content_size = 0;
    size_t read_size;
    const size_t chunk_size = 1024;

    // Allocate initial buffer
    buffer = malloc(chunk_size);
    if (!buffer)
    {
        error("Memory allocation failed");
        return NULL;
    }
    buffer_size = chunk_size;

    // Read from stdin in chunks
    while ((read_size = fread(buffer + content_size, 1, chunk_size, stdin)) > 0)
    {
        content_size += read_size;

        // Check if we need more space
        if (content_size + chunk_size > buffer_size)
        {
            buffer_size *= 2;
            buffer = realloc(buffer, buffer_size);
            if (!buffer)
            {
                error("Memory reallocation failed");
                return NULL;
            }
        }
    }

    // Null-terminate the string
    if (content_size < buffer_size)
    {
        buffer[content_size] = '\0';
    }
    else
    {
        buffer = realloc(buffer, buffer_size + 1);
        if (!buffer)
        {
            error("Memory reallocation failed");
            return NULL;
        }
        buffer[content_size] = '\0';
    }

    return buffer;
}

// Remove all preprocessor lines (lines starting with # after optional whitespace)
char *strip_preprocessor_lines(const char *input)
{
    size_t len = strlen(input);
    char *out = malloc(len + 1);
    size_t outpos = 0;
    const char *p = input;
    while (*p)
    {
        const char *line_start = p;
        // Skip leading whitespace
        while (*p == ' ' || *p == '\t')
            p++;
        if (*p == '#')
        {
            // Skip to end of line
            while (*p && *p != '\n' && *p != '\r')
                p++;
            if (*p == '\r' && *(p + 1) == '\n')
                p += 2;
            else if (*p == '\n' || *p == '\r')
                p++;
            continue;
        }
        // Copy this line to output
        while (*line_start && *line_start != '\n' && *line_start != '\r')
            out[outpos++] = *line_start++;
        // Copy line ending
        if (*line_start == '\r' && *(line_start + 1) == '\n')
        {
            out[outpos++] = *line_start++;
            out[outpos++] = *line_start++;
        }
        else if (*line_start == '\n' || *line_start == '\r')
        {
            out[outpos++] = *line_start++;
        }
        p = line_start;
    }
    out[outpos] = 0;
    return out;
}

int main(int argc, char **argv)
{
    // Debug: print argc and argv values
    fprintf(stderr, "[DEBUG] argc = %d\n", argc);
    for (int i = 0; i < argc; i++)
    {
        fprintf(stderr, "[DEBUG] argv[%d] = '%s'\n", i, argv[i]);
    }

    // Handle input from either command line argument or stdin
    if (argc > 3)
    {
        error("Usage: %s [program] [-d]", argv[0]);
        return 1;
    }

    // Check for debug flag
    bool debug_mode = false;
    for (int i = 1; i < argc; i++)
    {
        if (strcmp(argv[i], "-d") == 0 || strcmp(argv[i], "--debug") == 0)
        {
            debug_mode = true;
            break;
        }
    }

    if (argc >= 2 && argv[1][0] != '-')
    {
        // Debug: print first 32 bytes of input file
        FILE *f = fopen(argv[1], "rb");
        if (f)
        {
            unsigned char buf[32];
            size_t n = fread(buf, 1, 32, f);
            printf("[DEBUG] First 32 bytes of input file:\n");
            for (size_t i = 0; i < n; ++i)
                printf("%02X ", buf[i]);
            printf("\n[DEBUG] As chars: ");
            for (size_t i = 0; i < n; ++i)
                printf("%c", (buf[i] >= 32 && buf[i] < 127) ? buf[i] : '.');
            printf("\n");
            fclose(f);
        }
        // Read the file contents into user_input
        FILE *src = fopen(argv[1], "rb");
        if (!src)
        {
            error("Could not open input file: %s", argv[1]);
            return 1;
        }
        fseek(src, 0, SEEK_END);
        long fsize = ftell(src);
        fseek(src, 0, SEEK_SET);
        user_input = malloc(fsize + 1);
        if (!user_input)
        {
            error("Memory allocation failed");
            fclose(src);
            return 1;
        }
        fread(user_input, 1, fsize, src);
        user_input[fsize] = 0;
        fclose(src);
        // Skip UTF-8 BOM if present
        if ((unsigned char)user_input[0] == 0xEF &&
            (unsigned char)user_input[1] == 0xBB &&
            (unsigned char)user_input[2] == 0xBF)
        {
            memmove(user_input, user_input + 3, fsize - 2);
            fsize -= 3;
            user_input[fsize] = 0;
        }
        // Check for empty file
        if (fsize == 0 || user_input[0] == 0)
        {
            error("Input file is empty");
            return 1;
        }
        // Debug: print first 32 bytes of user_input
        printf("[DEBUG] First 32 bytes of user_input:\n");
        for (size_t i = 0; i < 32 && user_input[i]; ++i)
            printf("%02X ", (unsigned char)user_input[i]);
        printf("\n[DEBUG] As chars: ");
        for (size_t i = 0; i < 32 && user_input[i]; ++i)
            printf("%c", (user_input[i] >= 32 && user_input[i] < 127) ? user_input[i] : '.');
        printf("\n");

        if (debug_mode)
        {
            fprintf(stderr, "Debug: Processing code from file: %s\n", argv[1]);
        }
    }
    else
    {
        // Input from stdin
        fprintf(stderr, "Reading from stdin...\n");
        user_input = read_from_stdin();
        if (!user_input)
        {
            error("Failed to read from stdin");
            return 1;
        }

        if (debug_mode)
        {
            fprintf(stderr, "Debug: Read %lu bytes from stdin\n", strlen(user_input));
        }
    }

    // Debug print to show user_input before tokenize
    fprintf(stderr, "[DEBUG] user_input before tokenize: %.32s\n", user_input);
    // Preprocess the raw input buffer
    char *preprocessed_input = preprocess_input(argv[1], user_input);
    fprintf(stderr, "[DEBUG] preprocessed_input (first 200 chars):\n%.200s\n", preprocessed_input);
    // Tokenize and preprocess
    fprintf(stderr, "[MAIN DEBUG] About to call tokenize()\n");
    token = tokenize(preprocessed_input);
    fprintf(stderr, "[MAIN DEBUG] tokenize() returned, token=%p\n", (void *)token);
    free(preprocessed_input);

    // Debug: print the first 30 tokens after preprocessing
    Token *dbg = token;
    int dbg_count = 0;
    fprintf(stderr, "[PREPROCESS DEBUG] First tokens after preprocessing:\n");
    while (dbg && dbg->kind != TK_EOF && dbg_count < 30)
    {
        fprintf(stderr, "  kind=%d, str='%.*s'\n", dbg->kind, dbg->len, dbg->str);
        dbg = dbg->next;
        dbg_count++;
    }

    // Debug: print the first few tokens for tracing
    Token *t = token;
    int count = 0;
    fprintf(stderr, "[DEBUG] First tokens after tokenization:\n");
    while (t && t->kind != TK_EOF && count < 20)
    {
        fprintf(stderr, "  %d: kind=%d, str='%.*s'\n", count, t->kind, t->len, t->str);
        t = t->next;
        count++;
    }

    // Parse the program
    parse_program();

    // After parse_program(), print all function names in function_list
    extern Function *function_list;
    fprintf(stderr, "[DEBUG] Functions parsed:\n");
    for (Function *fn = function_list; fn; fn = fn->next)
    {
        fprintf(stderr, "  - %s\n", fn->name);
    }

    // After parse_program(), generate code for all functions
    extern Function *function_list;
    for (Function *fn = function_list; fn; fn = fn->next)
    {
        codegen(fn);
    }

    // Free memory if allocated from stdin
    if (argc == 1 || (argc == 2 && debug_mode))
    {
        free(user_input);
    }

    // If any errors were reported, exit with failure
    if (error_count > 0)
    {
        fprintf(stderr, "Encountered %d error(s).\n", error_count);
        return 1;
    }

    return 0;
}