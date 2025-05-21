#include "stdio.h"
#include <stdio.h>
#include <stdarg.h>

struct _FILE
{
  int dummy;
};
FILE _stdin, _stdout, _stderr;
FILE *stdin = &_stdin;
FILE *stdout = &_stdout;
FILE *stderr = &_stderr;

int printf(const char *format, ...)
{
  va_list args;
  va_start(args, format);
  int ret = vprintf(format, args);
  va_end(args);
  return ret;
}