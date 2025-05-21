#ifndef _STDLIB_H
#define _STDLIB_H

#include <stddef.h>

#define EXIT_SUCCESS 0
#define EXIT_FAILURE 1
#define NULL ((void *)0)

typedef struct
{
  int quot, rem;
} div_t;
typedef struct
{
  long quot, rem;
} ldiv_t;
typedef struct
{
  long long quot, rem;
} lldiv_t;

void *malloc(size_t size);
void *calloc(size_t nmemb, size_t size);
void *realloc(void *ptr, size_t size);
void free(void *ptr);
void abort(void);
void exit(int status);
int atexit(void (*func)(void));
int system(const char *command);
char *getenv(const char *name);
int atoi(const char *nptr);
long atol(const char *nptr);
long long atoll(const char *nptr);
double atof(const char *nptr);
int rand(void);
void srand(unsigned int seed);

#endif // _STDLIB_H