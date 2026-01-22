#!/bin/bash

# Check if PHP is available
if ! command -v php &> /dev/null; then
    echo "⚠️  PHP not found in PATH"
    echo "Please install PHP or ensure it is in your PATH"
    echo "On Ubuntu/Debian: sudo apt install php-cli"
    echo "On Fedora/RHEL: sudo dnf install php-cli"
    exit 1
fi

# Navigate to admin directory
cd "$(dirname "$0")/../admin" || exit 1

# Check if admin directory exists
if [ ! -f "index.php" ]; then
    echo "❌ Error: admin/index.php not found"
    exit 1
fi

# Start PHP server
echo "🚀 Starting PHP backend server on http://localhost:8080"
php -S localhost:8080 -t .
