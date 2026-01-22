@echo off
title Khadi Vasthra Admin Server
color 0A
echo ========================================
echo   Khadi Vasthra Admin Panel Server
echo ========================================
echo.

cd /d "%~dp0"

REM Try to use PHP from PATH first, then try XAMPP location
if exist "C:\xampp\php\php.exe" (
    echo Starting PHP server on port 8080...
    echo.
    echo Admin Panel URL: http://localhost:8080
    echo Login Password: admin123
    echo.
    echo Press Ctrl+C to stop the server
    echo ========================================
    echo.
    "C:\xampp\php\php.exe" -S localhost:8080 -t .
) else (
    echo ERROR: PHP not found!
    echo.
    echo Please install XAMPP or ensure PHP is in your PATH.
    echo Expected location: C:\xampp\php\php.exe
    echo.
    pause
    exit /b 1
)

pause

