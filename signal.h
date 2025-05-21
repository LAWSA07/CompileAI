#ifndef _SIGNAL_H
#define _SIGNAL_H

typedef void (*sighandler_t)(int);
#define SIG_DFL ((sighandler_t)0)
#define SIG_IGN ((sighandler_t)1)
#define SIG_ERR ((sighandler_t) - 1)

int raise(int sig);
sighandler_t signal(int signum, sighandler_t handler);

#endif // _SIGNAL_H