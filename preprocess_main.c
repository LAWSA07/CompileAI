#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "preprocess.h"

// Helper to read file into buffer
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

int main(int argc, char **argv)
{
  char *input = NULL;
  const char *input_file = NULL;
  if (argc >= 2)
  {
    input_file = argv[1];
    input = read_file(input_file);
    if (!input)
    {
      fprintf(stderr, "[preprocess_main] Could not open input file: %s\n", input_file);
      return 1;
    }
  }
  else
  {
    // Read from stdin
    size_t cap = 4096, len = 0;
    input = malloc(cap);
    if (!input)
    {
      fprintf(stderr, "[preprocess_main] Out of memory\n");
      return 1;
    }
    int c;
    while ((c = getchar()) != EOF)
    {
      if (len + 1 >= cap)
      {
        cap *= 2;
        char *tmp = realloc(input, cap);
        if (!tmp)
        {
          free(input);
          fprintf(stderr, "[preprocess_main] Out of memory\n");
          return 1;
        }
        input = tmp;
      }
      input[len++] = (char)c;
    }
    input[len] = 0;
    input_file = "<stdin>";
  }
  char *out = preprocess_input(input_file, input);
  if (out)
  {
    printf("%s", out);
    free(out);
  }
  free(input);
  return 0;
}