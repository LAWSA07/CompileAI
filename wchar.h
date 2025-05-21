#ifndef _WCHAR_H
#define _WCHAR_H

typedef long wchar_t;

typedef struct
{
  int count;
} mbstate_t;

size_t wcslen(const wchar_t *s);

#endif // _WCHAR_H