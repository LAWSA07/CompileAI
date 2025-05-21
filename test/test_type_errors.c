// Negative type checking tests

struct S
{
  int x;
};
struct T
{
  int y;
};

int main()
{
  struct S s1, s2;
  struct T t1;
  int i;
  int *p;

  s1 = i;    // Error: int to struct
  i = s1;    // Error: struct to int
  p = i;     // Error: int to pointer
  i = p;     // Error: pointer to int
  s1 = t1;   // Error: incompatible structs
  return s1; // Error: struct to int in return
}

void foo(int a, int b) {}

int test_calls()
{
  // foo(1, "str");    // Error: wrong argument type
  // foo(1);           // Error: too few arguments
  // foo(1, 2, 3);     // Error: too many arguments
  return 0;
}