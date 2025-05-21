// Multi-argument macro tests
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define SUM3(x, y, z) ((x) + (y) + (z))
#define SQUARE(x) ((x) * (x))
#define DOUBLE(x) (2 * (x))
#define NESTED(a, b) MAX(SQUARE(a), DOUBLE(b))

int x = MAX(3, 5);
int y = MIN(10, 7);
int z = SUM3(1, 2, 3);
int s = SQUARE(4);
int d = DOUBLE(8);
int n = NESTED(2 + 1, 3 + 1);
// Edge cases
int e1 = MAX((1 + 2), (3 + 4));
int e2 = SUM3(1, (2 + 3), 4);