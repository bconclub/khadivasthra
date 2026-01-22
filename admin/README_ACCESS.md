# How to Access Admin Panel

## The Problem
Next.js development server cannot serve PHP files. The admin panel needs a PHP server to run.

## Solution: Run PHP Server Separately

### Option 1: Use PHP Built-in Server (Recommended for Development)

#### Windows:
1. Open Command Prompt or PowerShell
2. Navigate to the admin folder:
   ```bash
   cd admin
   ```
3. Run the start script:
   ```bash
   start-server.bat
   ```
   Or manually:
   ```bash
   php -S localhost:8080 -t .
   ```

#### Mac/Linux:
1. Open Terminal
2. Navigate to the admin folder:
   ```bash
   cd admin
   ```
3. Make script executable (first time only):
   ```bash
   chmod +x start-server.sh
   ```
4. Run the start script:
   ```bash
   ./start-server.sh
   ```
   Or manually:
   ```bash
   php -S localhost:8080 -t .
   ```

### Option 2: Use XAMPP/WAMP/MAMP

1. Copy the `admin` folder to your web server directory:
   - **XAMPP**: `C:\xampp\htdocs\khadivasthra\admin`
   - **WAMP**: `C:\wamp64\www\khadivasthra\admin`
   - **MAMP**: `/Applications/MAMP/htdocs/khadivasthra/admin`

2. Access via: `http://localhost/khadivasthra/admin/`

### Option 3: Use Apache/Nginx with PHP

Configure your web server to:
- Serve PHP files from `/admin` folder
- Proxy Next.js requests to port 3000

## Access URLs

### Development (PHP Built-in Server):
- **Admin Panel**: http://localhost:8080
- **Next.js App**: http://localhost:3000

### Production:
- **Admin Panel**: https://yourdomain.com/admin/
- **Next.js App**: https://yourdomain.com/

## Quick Start

1. **Terminal 1** - Start Next.js:
   ```bash
   npm run dev
   ```

2. **Terminal 2** - Start PHP Server:
   ```bash
   cd admin
   php -S localhost:8080 -t .
   ```

3. **Access Admin**:
   - Open browser: http://localhost:8080
   - Password: `admin123`

## Troubleshooting

### "404 Not Found" Error
- Make sure PHP server is running on port 8080
- Check that you're accessing `http://localhost:8080` (not port 3000)
- Verify PHP is installed: `php -v`

### "Connection Refused"
- Check if port 8080 is already in use
- Try a different port: `php -S localhost:8081 -t .`

### PHP Not Found
- Install PHP 8.0 or higher
- Add PHP to your system PATH
- On Windows: Download from https://windows.php.net/download/

## Production Setup

For production, you'll need:
1. Web server (Apache/Nginx) with PHP support
2. Configure server to serve `/admin` folder with PHP
3. Ensure Next.js and PHP can run simultaneously

Example Nginx configuration:
```nginx
location /admin {
    root /var/www/khadivasthra;
    try_files $uri $uri/ /admin/index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
    fastcgi_index index.php;
    include fastcgi_params;
}
```

