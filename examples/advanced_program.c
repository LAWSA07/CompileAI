/*
 * Advanced demonstration program for LAWSA compiler
 * This program demonstrates features that would be available 
 * after implementing the enhancements in ROADMAP.md
 */

// Structure definition
struct Point {
    int x;
    int y;
};

// Array manipulation function
int sum_array(int arr[], int size) {
    int total = 0;
    int i;
    
    for (i = 0; i < size; i = i + 1) {
        total = total + arr[i];
    }
    
    return total;
}

// Function using pointers
void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

// Function using structs
int distance_squared(struct Point p1, struct Point p2) {
    int dx = p1.x - p2.x;
    int dy = p1.y - p2.y;
    return dx * dx + dy * dy;
}

// Main program demonstrating all features
int main() {
    // Variable declarations
    int numbers[5];
    int a;
    int b;
    struct Point origin;
    struct Point point;
    
    // Array initialization
    numbers[0] = 10;
    numbers[1] = 20;
    numbers[2] = 30;
    numbers[3] = 40;
    numbers[4] = 50;
    
    // Call array function
    int array_sum = sum_array(numbers, 5);
    
    // Pointer usage
    a = 5;
    b = 10;
    swap(&a, &b);
    
    // Struct usage
    origin.x = 0;
    origin.y = 0;
    
    point.x = 3;
    point.y = 4;
    
    // Calculate using struct function
    int dist = distance_squared(origin, point);
    
    // Verify everything works (should return 25)
    return dist;
} 