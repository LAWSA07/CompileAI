#define FOO 42
#define BAR 100
#define SQUARE(x) ((x) * (x))
#ifdef FOO
int a = FOO;
#else
int a = 0;
#endif
#include "test_included.h"
int b = BAR;
int c = SQUARE(5);
#ifndef BAR
int d = 1;
#else
int d = 2;
#endif