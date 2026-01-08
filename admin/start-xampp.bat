@echo off
echo ========================================
echo   Khadi Vasthra Admin Panel - XAMPP
echo ========================================
echo.
echo This script will:
echo 1. Check if XAMPP is installed
echo 2. Start Apache
echo 3. Open admin panel in browser
echo.
pause

REM Check if XAMPP exists
if exist "C:\xampp\xampp-control.exe" (
    echo Starting XAMPP Control Panel...
    start "" "C:\xampp\xampp-control.exe"
    echo.
    echo Please start Apache from XAMPP Control Panel
    echo Then access admin at: http://localhost/khadivasthra/admin/
    echo.
) else (
    echo XAMPP not found at C:\xampp
    echo.
    echo Please install XAMPP from: https://www.apachefriends.org/
    echo Or copy admin folder to your web server directory
    echo.
)

pause

