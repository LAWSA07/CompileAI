// Test: Malformed macro definitions
#define
#define BAD1(
#define BAD2(a, ) 123
#define BAD3(a b) 456