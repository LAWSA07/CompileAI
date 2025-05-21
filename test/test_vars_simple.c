// Test: All integer types, enums, typedefs

// Typedefs
typedef int myint;
typedef unsigned long ulong_t;

enum Color
{
  RED,
  GREEN = 5,
  BLUE
};

int a = 1;
unsigned int b = 2;
short c = 3;
unsigned short d = 4;
long e = 5;
unsigned long f = 6;
long long g = 7;
unsigned long long h = 8;
myint i = 9;
ulong_t j = 10;
enum Color k = GREEN;

// Invalid: type mismatch (should trigger error in semantic analysis)
// char *p = 123; // pointer assigned from int
// int arr[3] = {1, 2, 3, 4}; // too many initializers

int main()
{
  return a + b + c + d + e + f + g + h + i + j + k;
}
