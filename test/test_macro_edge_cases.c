// Test: Edge cases
#define EMPTY
#define SPACE_MACRO 123
#define RECURSIVE A
#define A RECURSIVE
int a = EMPTY;
int b = SPACE_MACRO;
// int c = RECURSIVE; // Should not infinitely expand