@echo off
setlocal enabledelayedexpansion
set PREPROC=preprocess.exe
set TESTDIR=%~dp0
set FAIL=0

rem Clean up previous output files
del /q %TESTDIR%*_out.c >nul 2>&1

for %%F in (%TESTDIR%test_macro_*.c) do (
    set NAME=%%~nF
    rem Only process files that do not contain 'expected' or '_out'
    echo !NAME! | findstr /i /c:"expected" /c:"_out" >nul
    if errorlevel 1 (
        set BASE=!NAME:~11!
        set EXPECTED=test_macro_expected!BASE!.c
        %PREPROC% %%F > %TESTDIR%!NAME!_out.c 2>nul
        fc /b %TESTDIR%!NAME!_out.c %TESTDIR%!EXPECTED! >nul
        if errorlevel 1 (
            echo [FAIL] !NAME! does not match expected output
            set FAIL=1
        ) else (
            echo [PASS] !NAME!
        )
    )
)

if %FAIL%==0 (
    echo All macro preprocessor tests passed.
    exit /b 0
) else (
    echo Some macro preprocessor tests failed.
    exit /b 1
) 