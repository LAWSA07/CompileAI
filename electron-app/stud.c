#include <stdio.h>

struct Student {
    char name[50];
    int age;
    float grade;
};

int main() {
    struct Student s = {"John", 19, 88.5};  // hardcoded data
    FILE *fptr;

    fptr = fopen("student.txt", "w");
    if (fptr == NULL) {
        printf("Error opening file!\n");
        return 1;
    }

    fprintf(fptr, "Name: %s\nAge: %d\nGrade: %.2f\n", s.name, s.age, s.grade);
    fclose(fptr);

    printf("Student record saved to 'student.txt'\n");

    return 0;
}