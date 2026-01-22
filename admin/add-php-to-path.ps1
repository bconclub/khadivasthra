# Add XAMPP PHP to PATH
# Run this script as Administrator

Write-Host "Adding XAMPP PHP to PATH..." -ForegroundColor Green

$phpPath = "C:\xampp\php"

if (Test-Path "$phpPath\php.exe") {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$phpPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$phpPath", "User")
        Write-Host "[SUCCESS] PHP added to PATH!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please close and reopen PowerShell/Command Prompt for changes to take effect." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Then test with: php -v" -ForegroundColor Cyan
    } else {
        Write-Host "[INFO] PHP is already in PATH" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] XAMPP PHP not found at: $phpPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check your XAMPP installation path." -ForegroundColor Yellow
    Write-Host "If XAMPP is installed elsewhere, update this script with the correct path." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

