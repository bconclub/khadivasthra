#!/usr/bin/env node

/**
 * Cross-platform backend server starter
 * Starts PHP server on port 8080 from the admin directory
 * Automatically kills any existing process on port 8080 before starting
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const adminDir = path.join(__dirname, '..', 'admin');
const isWindows = process.platform === 'win32';
const phpCommand = isWindows ? 'php.exe' : 'php';
const PORT = 8080;

// Check if admin directory exists
if (!fs.existsSync(path.join(adminDir, 'index.php'))) {
  console.error('❌ Error: admin/index.php not found');
  process.exit(1);
}

// Function to kill process on port 8080
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (isWindows) {
      // Windows: Use netstat to find PID and taskkill to kill it
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 0) {
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                pids.add(pid);
              }
            }
          });
          if (pids.size > 0) {
            const pidList = Array.from(pids).join(' ');
            exec(`taskkill /F /PID ${pidList}`, (killError) => {
              if (!killError) {
                console.log(`🔄 Killed existing process(es) on port ${port}`);
              }
              resolve();
            });
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    } else {
      // Linux/Mac: Use lsof to find PID and kill it
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (stdout && stdout.trim()) {
          const pid = stdout.trim();
          exec(`kill -9 ${pid}`, (killError) => {
            if (!killError) {
              console.log(`🔄 Killed existing process ${pid} on port ${port}`);
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  });
}

// Kill any existing process on port 8080 before starting
killProcessOnPort(PORT).then(() => {
  // Wait a moment for the port to be released
  setTimeout(() => {
    // Check if PHP is available
    const php = spawn(phpCommand, ['-S', `localhost:${PORT}`, '-t', '.'], {
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

    console.log(`🚀 Starting PHP backend server on http://localhost:${PORT}`);
  }, 500); // Wait 500ms for port to be released
});
