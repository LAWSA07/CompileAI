#include <stdio.h>
#include <stdlib.h>
#include "myheader.h"
#include "myheader2.h"
// Bitfield struct test
struct BitfieldTest
{
  unsigned int a : 3;
  unsigned int b : 5;
  unsigned int c : 7;
  unsigned int d : 1;
};

int bitfield_sum()
{
  struct BitfieldTest bf;
  bf.a = 5;                         // 3 bits, should store 5
  bf.b = 17;                        // 5 bits, should store 17
  bf.c = 100;                       // 7 bits, should store 100
  bf.d = 1;                         // 1 bit, should store 1
  return bf.a + bf.b + bf.c + bf.d; // Expect 5+17+100+1 = 123
}

// Flexible array member test
struct FlexArr
{
  int count;
  char data[];
};

int flexarr_sum(int n)
{
  struct FlexArr *fa = (struct FlexArr *)malloc(sizeof(struct FlexArr) + n);
  fa->count = n;
  for (int i = 0; i < n; i++)
    fa->data[i] = i + 1;
  int sum = 0;
  for (int i = 0; i < n; i++)
    sum += fa->data[i];
  free(fa);
  return sum;
}

// Pointer arithmetic test
int pointer_arith_test()
{
  int arr[10];
  int *p = arr;
  int *q = arr + 5;
  int *r = 2 + arr;
  int *s = p + 3;
  int *t = s - 2;
  int diff = q - p;  // should be 5
  int diff2 = s - t; // should be 3 - 1 = 2
  return (q == &arr[5]) && (r == &arr[2]) && (s == &arr[3]) && (t == &arr[1]) && (diff == 5) && (diff2 == 2);
}

// Struct assignment test
struct SAssign
{
  int x;
  int y;
};
int struct_assign_test()
{
  struct SAssign a = {42, 99};
  struct SAssign b;
  b = a;
  return (b.x == 42 && b.y == 99);
}

// Float/double test
int float_double_test()
{
  float f = 1.5f;
  double d = 2.25;
  float f2 = f + 2.5f;
  double d2 = d * 2.0;
  // Check approximate equality due to floating point
  int ok = (f > 1.49f && f < 1.51f) && (d > 2.24 && d < 2.26) && (f2 > 3.99f && f2 < 4.01f) && (d2 > 4.49 && d2 < 4.51);
  return ok;
}

#define MY_MACRO 77
int macro_test()
{
  int x = MY_MACRO;
  return x == 77;
}

int include_test()
{
  int x = HEADER_MACRO;
  return x == 12345;
}

#define COND_MACRO
int condcomp_test()
{
  int x = 0;
#ifdef COND_MACRO
  x = 42;
#else
  x = 99;
#endif
#ifndef NOT_DEFINED
  x += 1;
#else
  x += 1000;
#endif
  return x == 43;
}

#define SQUARE(x) ((x) * (x))
int funclike_macro_test()
{
  int a = 5;
  int b = SQUARE(a);
  int c = SQUARE(3 + 1);
  return (b == 25) && (c == 16);
}

#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define SUM3(x, y, z) ((x) + (y) + (z))

int macro_multiarg_test()
{
  int m = MAX(10, 20);
  int s = SUM3(1, 2, 3);
  int n = MAX(1 + 2, 3 * 4);
  return (m == 20) && (s == 6) && (n == 12);
}

#define FOO FOO
#define A B
#define B A
#define X 42
#define Y X
#define Z Y

int macro_hygiene_test()
{
  // FOO should not expand infinitely; should be treated as identifier
  // int foo = FOO; // Should just be 'FOO', not infinite
  // A and B should not expand infinitely; should be treated as identifier
  // int ab = A + B; // Should just be 'A + B', not infinite
  // Z should expand to 42 through Y and X
  int z = Z;
  return (z == 42);
}

int include_guard_test()
{
  int a = HEADER_MACRO;
  int b = HEADER2_MACRO;
  // HEADER_MACRO should be defined only once, HEADER2_MACRO should be defined
  return (a == 12345) && (b == 67890);
}

#define TEMP_MACRO 111
#undef TEMP_MACRO

int preprocessor_directives_test()
{
  int a = 0;
#ifdef TEMP_MACRO
  a = 1;
#else
  a = 2;
#endif
  int b = 0;
#define COND1
#if defined(COND1)
  b = 10;
#elif defined(COND2)
  b = 20;
#else
  b = 30;
#endif
#pragma message("This is a pragma test")
  // #error "This is an error test" // Uncomment to test error abort
  return (a == 2) && (b == 10);
}

int main()
{
  int bitfield_result = bitfield_sum();
  printf("bitfield_result = %d\n", bitfield_result);
  int flex_sum = flexarr_sum(10);
  printf("flexarr_sum(10) = %d\n", flex_sum); // Expect 55
  int ptr_arith = pointer_arith_test();
  printf("pointer_arith_test = %d\n", ptr_arith); // Expect 1
  int struct_assign = struct_assign_test();
  printf("struct_assign_test = %d\n", struct_assign); // Expect 1
  int float_double = float_double_test();
  printf("float_double_test = %d\n", float_double); // Expect 1
  int macro_result = macro_test();
  printf("macro_test = %d\n", macro_result); // Expect 1
  int include_result = include_test();
  printf("include_test = %d\n", include_result); // Expect 1
  int condcomp_result = condcomp_test();
  printf("condcomp_test = %d\n", condcomp_result); // Expect 1
  int funclike_macro_result = funclike_macro_test();
  printf("funclike_macro_test = %d\n", funclike_macro_result); // Expect 1
  int macro_multiarg_result = macro_multiarg_test();
  printf("macro_multiarg_test = %d\n", macro_multiarg_result); // Expect 1
  int macro_hygiene_result = macro_hygiene_test();
  printf("macro_hygiene_test = %d\n", macro_hygiene_result); // Expect 1
  int include_guard_result = include_guard_test();
  printf("include_guard_test = %d\n", include_guard_result); // Expect 1
  int preproc_dir_result = preprocessor_directives_test();
  printf("preprocessor_directives_test = %d\n", preproc_dir_result); // Expect 1
  return bitfield_result + flex_sum + ptr_arith + struct_assign + float_double + macro_result + include_result + condcomp_result + funclike_macro_result + macro_multiarg_result + macro_hygiene_result + include_guard_result + preproc_dir_result;
}