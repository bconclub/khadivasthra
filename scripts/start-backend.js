#!/usr/bin/env node

/**
 * Cross-platform backend server starter
 * Starts PHP server on port 8080 from the admin directory
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const adminDir = path.join(__dirname, '..', 'admin');
const isWindows = process.platform === 'win32';
const phpCommand = isWindows ? 'php.exe' : 'php';

// Check if admin directory exists
if (!fs.existsSync(path.join(adminDir, 'index.php'))) {
  console.error('❌ Error: admin/index.php not found');
  process.exit(1);
}

// Check if PHP is available
const php = spawn(phpCommand, ['-S', 'localhost:8080', '-t', '.'], {
  cwd: adminDir,
  stdio: 'inherit',
  shell: isWindows
});

php.on('error', (err) => {
  console.error('⚠️  PHP not found or failed to start');
  console.error('Please install PHP or ensure it is in your PATH');
  if (isWindows) {
    console.error('On Windows: Install XAMPP or add PHP to your PATH');
  } else {
    console.error('On Ubuntu/Debian: sudo apt install php-cli');
    console.error('On Fedora/RHEL: sudo dnf install php-cli');
  }
  process.exit(1);
});

php.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`PHP server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGINT', () => {
  php.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  php.kill('SIGTERM');
  process.exit(0);
});

console.log('🚀 Starting PHP backend server on http://localhost:8080');
