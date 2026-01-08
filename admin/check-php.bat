@echo off
echo Checking PHP installation...
echo.

php -v >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] PHP is installed!
    echo.
    php -v
    echo.
    echo You can now start the server with:
    echo   php -S localhost:8080 -t .
    echo.
) else (
    echo [ERROR] PHP is not installed or not in PATH
    echo.
    echo Please install PHP:
    echo   1. Download XAMPP: https://www.apachefriends.org/
    echo   2. Or download PHP: https://windows.php.net/download/
    echo.
    echo See INSTALL_PHP_WINDOWS.md for detailed instructions
    echo.
)

pause

