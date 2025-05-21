#ifndef PREPROCESS_H
#define PREPROCESS_H
#include "lawsa.h"

// Preprocess the token list (macro expansion, includes, conditionals)
// Token *preprocess_tokens(Token *tokens, const char *input_file);

// Preprocess the raw input buffer (macros, includes, conditionals)
// Returns a malloc'd buffer containing only valid C code (no preprocessor lines)
char *preprocess_input(const char *input_file, const char *input_buffer);

#endif // PREPROCESS_H