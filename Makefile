CFLAGS=-std=c11 -g -static -fno-common
SRCS=codegen.c main.c parse.c tokenize.c type.c preprocess.c
OBJS=$(SRCS:.c=.o)

lawsa: $(OBJS)
	$(CC) -o $@ $(OBJS) $(LDFLAGS)

$(OBJS): lawsa.h

test: lawsa
	./test.sh

clean:
	-del /Q lawsa.exe *.o *~ tmp*

.PHONY: test clean 