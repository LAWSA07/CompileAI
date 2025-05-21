// Test: Structs, unions, enums, typedefs, member access, nested types

typedef int myint;
typedef struct Point
{
  int x;
  int y;
} Point;
typedef union Data
{
  int i;
  char c;
} Data;
enum Color
{
  RED,
  GREEN = 5,
  BLUE
};

struct Box
{
  Point p1;
  Point p2;
  enum Color color;
};

int sum_point(Point pt)
{
  return pt.x + pt.y;
}

int main()
{
  Point a = {1, 2};
  Point b = {3, 4};
  struct Box box;
  box.p1 = a;
  box.p2 = b;
  box.color = BLUE;
  Data d;
  d.i = 42;
  myint result = sum_point(box.p1) + sum_point(box.p2) + d.i + box.color;
  // Invalid: struct arithmetic (should trigger error)
  // result += box.p1 + box.p2;
  // Invalid: assign int to struct (should trigger error)
  // box.p1 = 123;
  return result;
}

// Function pointer declaration, assignment, and call
int add(int a, int b) { return a + b; }
int (*fp)(int, int) = add;
int fp_result = 0;
void test_func_ptr()
{
  fp_result = fp(10, 20);
}

// Multi-dimensional array declaration and access
int mdarr[2][3] = {{1, 2, 3}, {4, 5, 6}};
int md_sum()
{
  int sum = 0;
  for (int i = 0; i < 2; i = i + 1)
    for (int j = 0; j < 3; j = j + 1)
      sum = sum + mdarr[i][j];
  return sum;
}

// Compound literal initializer
struct Point make_point(int x, int y)
{
  return (struct Point){x, y};
}

// Error recovery: multiple errors in one file
void error_recovery()
{
  int *p;
  int arr[2];
  p = 42;         // Error: int to pointer
  arr = p;        // Error: array assignment
  arr[0] = "str"; // Error: string literal to int
}

// Pointer arithmetic/conversions
void pointer_arith()
{
  int arr[3];
  int *p = arr;
  p = p + 1; // Valid
  p = 42;    // Error: int to pointer
  int i = p; // Error: pointer to int
}
