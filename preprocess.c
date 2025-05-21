#include "preprocess.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <ctype.h>

// Add at the very top of the file
__attribute__((constructor)) static void file_loaded_notice() { fprintf(stderr, "[DEBUG] preprocess.c loaded\n"); }

// Macro table and related structures (move from tokenize.c)
typedef struct MacroDef
{
  struct MacroDef *next;
  char *name;
  char *value;
  int is_function;
  char **params;
  int param_count;
} MacroDef;

static MacroDef *macro_table = NULL;

static void add_macro(const char *name, const char *value, int is_function, char **params, int param_count)
{
  MacroDef *m = malloc(sizeof(MacroDef));
  m->name = strdup(name);
  m->value = strdup(value);
  m->is_function = is_function;
  m->params = NULL;
  m->param_count = param_count;
  if (is_function && param_count > 0 && params)
  {
    m->params = malloc(sizeof(char *) * param_count);
    for (int i = 0; i < param_count; i++)
      m->params[i] = strdup(params[i]);
  }
  m->next = macro_table;
  macro_table = m;
}

static void undef_macro(const char *name)
{
  MacroDef **p = &macro_table;
  while (*p)
  {
    if (strcmp((*p)->name, name) == 0)
    {
      MacroDef *t = *p;
      *p = t->next;
      free(t->name);
      free(t->value);
      if (t->is_function)
      {
        for (int i = 0; i < t->param_count; i++)
          free(t->params[i]);
        free(t->params);
      }
      free(t);
      return;
    }
    p = &(*p)->next;
  }
}

static const char *find_macro(const char *name)
{
  for (MacroDef *m = macro_table; m; m = m->next)
    if (strcmp(m->name, name) == 0 && !m->is_function)
      return m->value;
  return NULL;
}

// Helper: skip whitespace
static const char *skip_ws(const char *p)
{
  while (*p == ' ' || *p == '\t')
    p++;
  return p;
}

// Helper: copy and expand macros in a line
static void expand_macros(const char *line, char *out, size_t *outpos)
{
  const char *p = line;
  while (*p)
  {
    if (isalpha(*p) || *p == '_')
    {
      const char *start = p;
      while (isalnum(*p) || *p == '_')
        p++;
      size_t len = p - start;
      char name[128];
      if (len < sizeof(name))
      {
        strncpy(name, start, len);
        name[len] = 0;
        const char *val = find_macro(name);
        if (val)
        {
          size_t vlen = strlen(val);
          memcpy(out + *outpos, val, vlen);
          *outpos += vlen;
          continue;
        }
      }
      memcpy(out + *outpos, start, len);
      *outpos += len;
      continue;
    }
    out[(*outpos)++] = *p++;
  }
}

// Helper: expand function-like macros in a line
static int expand_function_macro(const char *line, char *out, size_t *outpos)
{
  for (MacroDef *m = macro_table; m; m = m->next)
  {
    if (!m->is_function || m->param_count < 1)
      continue;
    const char *p = line;
    while (*p)
    {
      // Look for macro name followed by '('
      if ((p == line || !isalnum(*(p - 1))) && strncmp(p, m->name, strlen(m->name)) == 0 && p[strlen(m->name)] == '(')
      {
        // Copy everything before macro name
        size_t prefix_len = p - line;
        memcpy(out + *outpos, line, prefix_len);
        *outpos += prefix_len;
        p += strlen(m->name); // move past macro name
        if (*p != '(')
          break;
        p++; // skip '('
        // Parse argument list (handle nested parens)
        const char *args[32] = {0};
        int arg_lens[32] = {0};
        int argc = 0;
        const char *arg_start = p;
        int depth = 1;
        while (*p && depth > 0)
        {
          if (*p == '(')
            depth++;
          else if (*p == ')')
            depth--;
          if ((depth == 1 && *p == ',' && argc < 32) || (depth == 0 && argc < 32))
          {
            int len = p - arg_start;
            args[argc] = arg_start;
            arg_lens[argc] = len;
            argc++;
            arg_start = p + 1;
          }
          p++;
        }
        // Now p points just after the closing ')'
        // Expand macro body with arguments
        char expanded[1024];
        const char *val = m->value;
        size_t epos = 0;
        for (const char *q = val; *q;)
        {
          int matched = 0;
          for (int i = 0; i < m->param_count; i++)
          {
            size_t plen = strlen(m->params[i]);
            if (strncmp(q, m->params[i], plen) == 0 && !isalnum(q[plen]))
            {
              if (i < argc && args[i])
              {
                // Trim whitespace from argument
                const char *a = args[i];
                int alen = arg_lens[i];
                while (alen > 0 && isspace(*a))
                {
                  a++;
                  alen--;
                }
                while (alen > 0 && isspace(a[alen - 1]))
                  alen--;
                memcpy(expanded + epos, a, alen);
                epos += alen;
              }
              q += plen;
              matched = 1;
              break;
            }
          }
          if (!matched)
            expanded[epos++] = *q++;
        }
        expanded[epos] = 0;
        // Recursively expand the expanded macro body
        char recursive[1024];
        size_t recpos = 0;
        expand_function_macro(expanded, recursive, &recpos);
        recursive[recpos] = 0;
        memcpy(out + *outpos, recursive, recpos);
        *outpos += recpos;
        // Recursively expand the rest of the line after the macro call
        expand_function_macro(p, out, outpos);
        return 1; // Expanded
      }
      p++;
    }
  }
  // If no macro expanded, copy the line as is
  size_t len = strlen(line);
  memcpy(out + *outpos, line, len);
  *outpos += len;
  out[*outpos] = 0;
  return 0;
}

#define MAX_COND_DEPTH 32

static char *read_file(const char *filename)
{
  FILE *f = fopen(filename, "rb");
  if (!f)
    return NULL;
  fseek(f, 0, SEEK_END);
  long fsize = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *buf = malloc(fsize + 1);
  if (!buf)
  {
    fclose(f);
    return NULL;
  }
  fread(buf, 1, fsize, f);
  buf[fsize] = 0;
  fclose(f);
  return buf;
}

static void print_macro_table(void)
{
  fprintf(stderr, "[MACRO TABLE]\n");
  for (MacroDef *m = macro_table; m; m = m->next)
  {
    fprintf(stderr, "  name='%s' is_function=%d param_count=%d value='%s'\n", m->name, m->is_function, m->param_count, m->value);
    if (m->is_function && m->param_count > 0)
    {
      fprintf(stderr, "    params:");
      for (int i = 0; i < m->param_count; i++)
        fprintf(stderr, " '%s'", m->params[i]);
      fprintf(stderr, "\n");
    }
  }
  fflush(stderr);
}

char *preprocess_input(const char *input_file, const char *input_buffer)
{
  fprintf(stderr, "[PREPROC DEBUG] Entered preprocess_input\n");
  // Macro table is static, clear it first
  while (macro_table)
  {
    MacroDef *next = macro_table->next;
    free(macro_table->name);
    free(macro_table->value);
    if (macro_table->is_function)
    {
      for (int i = 0; i < macro_table->param_count; i++)
        free(macro_table->params[i]);
      free(macro_table->params);
    }
    free(macro_table);
    macro_table = next;
  }
  size_t inlen = strlen(input_buffer);
  char *out = malloc(inlen * 2 + 1); // Output may be longer due to macro expansion
  size_t outpos = 0;
  const char *p = input_buffer;
  int cond_stack[MAX_COND_DEPTH];
  int cond_top = 0;
  int is_active = 1;
  while (*p)
  {
    const char *line_start = p;
    // Find end of line
    const char *line_end = p;
    while (*line_end && *line_end != '\n' && *line_end != '\r')
      line_end++;
    size_t linelen = line_end - line_start;
    // Copy line to temp buffer
    char line[1024];
    if (linelen >= sizeof(line))
      linelen = sizeof(line) - 1;
    strncpy(line, line_start, linelen);
    line[linelen] = 0;
    fprintf(stderr, "[PREPROC DEBUG] Processing line: %s\n", line);
    // Check for preprocessor directive
    const char *q = skip_ws(line);
    if (*q == '#')
    {
      q++;
      q = skip_ws(q);
      if (strncmp(q, "include", 7) == 0 && isspace(q[7]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #include\n");
        q += 7;
        q = skip_ws(q);
        if (*q == '"' || *q == '<')
        {
          char endch = (*q == '"') ? '"' : '>';
          q++;
          const char *fname_start = q;
          while (*q && *q != endch)
            q++;
          size_t fnamelen = q - fname_start;
          if (*q == endch)
          {
            char filename[256];
            if (fnamelen >= sizeof(filename))
              fnamelen = sizeof(filename) - 1;
            strncpy(filename, fname_start, fnamelen);
            filename[fnamelen] = 0;
            char *filebuf = read_file(filename);
            if (!filebuf)
            {
              fprintf(stderr, "[preprocess] Failed to open include file: %s\n", filename);
            }
            else
            {
              char *included = preprocess_input(filename, filebuf);
              size_t out_len = strlen(included);
              memcpy(out + outpos, included, out_len);
              outpos += out_len;
              free(filebuf);
              free(included);
            }
          }
          else
          {
            fprintf(stderr, "[preprocess] Malformed #include directive: %s\n", line);
          }
        }
        else
        {
          fprintf(stderr, "[preprocess] Malformed #include directive: %s\n", line);
        }
        goto next_line;
      }
      if (strncmp(q, "define", 6) == 0 && isspace(q[6]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #define\n");
        q += 6;
        q = skip_ws(q);
        // Parse macro name
        const char *name_start = q;
        while (*q && (isalnum(*q) || *q == '_'))
          q++;
        size_t namelen = q - name_start;
        if (namelen == 0)
        {
          fprintf(stderr, "[preprocess] Malformed #define directive: %s\n", line);
          goto next_line;
        }
        char macro_name[128];
        if (namelen >= sizeof(macro_name))
          namelen = sizeof(macro_name) - 1;
        strncpy(macro_name, name_start, namelen);
        macro_name[namelen] = 0;
        q = skip_ws(q);
        // Check if next char is '('
        if (*q == '(')
        {
          q++;
          q = skip_ws(q);
          // Parse parameter list
          char **params = NULL;
          int param_count = 0;
          while (*q && *q != ')')
          {
            const char *param_start = q;
            while (*q && *q != ',' && *q != ')')
              q++;
            size_t param_len = q - param_start;
            if (*q == ',')
            {
              q++;
              q = skip_ws(q);
            }
            if (param_len > 0)
            {
              // Trim whitespace from parameter name
              while (param_len > 0 && isspace(*param_start))
              {
                param_start++;
                param_len--;
              }
              while (param_len > 0 && isspace(param_start[param_len - 1]))
                param_len--;
              params = realloc(params, sizeof(char *) * (param_count + 1));
              params[param_count] = malloc(param_len + 1);
              strncpy(params[param_count], param_start, param_len);
              params[param_count][param_len] = 0;
              param_count++;
            }
          }
          if (*q == ')')
            q++;
          // Skip whitespace after ')'
          q = skip_ws(q);
          // Parse macro value (rest of line)
          char macro_val[512];
          size_t vallen = 0;
          if (*q)
          {
            const char *val_start = q;
            while (*q)
              q++;
            vallen = q - val_start;
            if (vallen >= sizeof(macro_val))
              vallen = sizeof(macro_val) - 1;
            strncpy(macro_val, val_start, vallen);
            macro_val[vallen] = 0;
          }
          else
          {
            macro_val[0] = 0;
          }
          fprintf(stderr, "[DEBUG] add_macro: name='%s' value='%s' is_function=%d\n", macro_name, macro_val, 1);
          fflush(stderr);
          add_macro(macro_name, macro_val, 1, params, param_count);
          print_macro_table();
          goto next_line;
        }
        else
        {
          // Parse macro value (rest of line)
          char macro_val[512];
          size_t vallen = 0;
          if (*q)
          {
            const char *val_start = q;
            while (*q)
              q++;
            vallen = q - val_start;
            if (vallen >= sizeof(macro_val))
              vallen = sizeof(macro_val) - 1;
            strncpy(macro_val, val_start, vallen);
            macro_val[vallen] = 0;
          }
          else
          {
            macro_val[0] = 0;
          }
          fprintf(stderr, "[DEBUG] add_macro: name='%s' value='%s' is_function=%d\n", macro_name, macro_val, 0);
          fflush(stderr);
          add_macro(macro_name, macro_val, 0, NULL, 0);
          print_macro_table();
          goto next_line;
        }
      }
      if (strncmp(q, "undef", 5) == 0 && isspace(q[5]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #undef\n");
        q += 5;
        q = skip_ws(q);
        const char *name_start = q;
        while (*q && (isalnum(*q) || *q == '_'))
          q++;
        size_t namelen = q - name_start;
        if (namelen == 0)
        {
          fprintf(stderr, "[preprocess] Malformed #undef directive: %s\n", line);
          goto next_line;
        }
        char macro_name[128];
        if (namelen >= sizeof(macro_name))
          namelen = sizeof(macro_name) - 1;
        strncpy(macro_name, name_start, namelen);
        macro_name[namelen] = 0;
        undef_macro(macro_name);
        goto next_line;
      }
      if (strncmp(q, "ifdef", 5) == 0 && isspace(q[5]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #ifdef\n");
        q += 5;
        q = skip_ws(q);
        const char *name_start = q;
        while (*q && (isalnum(*q) || *q == '_'))
          q++;
        size_t namelen = q - name_start;
        char macro_name[128] = {0};
        if (namelen > 0 && namelen < sizeof(macro_name))
        {
          strncpy(macro_name, name_start, namelen);
          macro_name[namelen] = 0;
        }
        int cond = (namelen > 0) ? (find_macro(macro_name) != NULL) : 0;
        if (cond_top < MAX_COND_DEPTH)
          cond_stack[cond_top++] = is_active;
        is_active = is_active && cond;
        goto next_line;
      }
      if (strncmp(q, "ifndef", 6) == 0 && isspace(q[6]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #ifndef\n");
        q += 6;
        q = skip_ws(q);
        const char *name_start = q;
        while (*q && (isalnum(*q) || *q == '_'))
          q++;
        size_t namelen = q - name_start;
        char macro_name[128] = {0};
        if (namelen > 0 && namelen < sizeof(macro_name))
        {
          strncpy(macro_name, name_start, namelen);
          macro_name[namelen] = 0;
        }
        int cond = (namelen > 0) ? (find_macro(macro_name) != NULL) : 0;
        if (cond_top < MAX_COND_DEPTH)
          cond_stack[cond_top++] = is_active;
        is_active = is_active && !cond;
        goto next_line;
      }
      if (strncmp(q, "else", 4) == 0 && isspace(q[4]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #else\n");
        if (cond_top > 0)
        {
          int prev = cond_stack[cond_top - 1];
          is_active = prev && !is_active;
        }
        else
        {
          fprintf(stderr, "[preprocess] Unmatched #else directive: %s\n", line);
        }
        goto next_line;
      }
      if (strncmp(q, "endif", 5) == 0 && isspace(q[5]))
      {
        fprintf(stderr, "[PREPROC DEBUG] Found #endif\n");
        if (cond_top > 0)
          is_active = cond_stack[--cond_top];
        else
          fprintf(stderr, "[preprocess] Unmatched #endif directive: %s\n", line);
        goto next_line;
      }
      // Unknown or malformed directive: skip
      fprintf(stderr, "[preprocess] Unknown or malformed directive: %s\n", line);
      goto next_line;
    }
    // Skip comment lines (// ...)
    if (strncmp(q, "//", 2) == 0)
    {
      goto next_line;
    }
    else if (is_active)
    {
      // Only output the fully expanded version of the line, not the original
      char expanded_line[2048];
      char temp_line[2048];
      size_t expanded_pos = 0;
      size_t temp_pos = 0;
      // Start with the original line
      strncpy(temp_line, line, sizeof(temp_line) - 1);
      temp_line[sizeof(temp_line) - 1] = 0;
      int changed;
      // Recursively expand function-like macros until no more changes
      do
      {
        expanded_pos = 0;
        changed = expand_function_macro(temp_line, expanded_line, &expanded_pos);
        expanded_line[expanded_pos] = 0;
        if (changed)
        {
          strncpy(temp_line, expanded_line, sizeof(temp_line) - 1);
          temp_line[sizeof(temp_line) - 1] = 0;
        }
      } while (changed);
      // Now expand object-like macros in the final result
      expanded_pos = 0;
      expand_macros(temp_line, expanded_line, &expanded_pos);
      expanded_line[expanded_pos] = 0;
      // Debug: print the original and expanded line
      fprintf(stderr, "[PREPROC DEBUG] Original: '%s' | Expanded: '%s'\n", line, expanded_line);
      // Only output if the line is not empty or whitespace
      const char *outptr = skip_ws(expanded_line);
      if (*outptr)
      {
        memcpy(out + outpos, expanded_line, expanded_pos);
        outpos += expanded_pos;
        // Add line ending
        if (*line_end == '\r' && *(line_end + 1) == '\n')
        {
          out[outpos++] = '\r';
          out[outpos++] = '\n';
        }
        else if (*line_end == '\n' || *line_end == '\r')
        {
          out[outpos++] = *line_end;
        }
      }
    }
    else
    {
      fprintf(stderr, "[PREPROC DEBUG] Skipping inactive line due to conditional\n");
    }
  next_line:
    // Move to next line
    if (*line_end == '\r' && *(line_end + 1) == '\n')
      p = line_end + 2;
    else if (*line_end == '\n' || *line_end == '\r')
      p = line_end + 1;
    else
      p = line_end;
  }
  out[outpos] = 0;
  return out;
}