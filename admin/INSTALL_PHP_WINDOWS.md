# Installing PHP on Windows

## Option 1: Quick Install with XAMPP (Recommended - Easiest)

1. **Download XAMPP:**
   - Go to: https://www.apachefriends.org/download.html
   - Download XAMPP for Windows (PHP 8.x version)
   - Run the installer

2. **Install XAMPP:**
   - Install to default location: `C:\xampp`
   - During installation, select Apache and PHP (MySQL optional)

3. **Add PHP to PATH:**
   - Open PowerShell as Administrator
   - Run this command (adjust path if you installed elsewhere):
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\xampp\php", "User")
   ```
   - Close and reopen PowerShell

4. **Verify Installation:**
   ```powershell
   php -v
   ```

5. **Start PHP Server:**
   ```powershell
   cd admin
   php -S localhost:8080 -t .
   ```

---

## Option 2: Manual PHP Installation

### Step 1: Download PHP
1. Go to: https://windows.php.net/download/
2. Download **PHP 8.2.x Thread Safe ZIP** (or latest version)
3. Extract to: `C:\php`

### Step 2: Add to PATH
1. Press `Win + X` → Select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", find "Path" → Click "Edit"
5. Click "New" → Add: `C:\php`
6. Click OK on all dialogs

### Step 3: Verify
1. Close and reopen PowerShell
2. Run: `php -v`

### Step 4: Start Server
```powershell
cd admin
php -S localhost:8080 -t .
```

---

## Option 3: Use XAMPP Web Server (No Command Line)

If you don't want to use command line:

1. **Install XAMPP** (from Option 1)

2. **Copy Admin Folder:**
   - Copy your `admin` folder to: `C:\xampp\htdocs\khadivasthra\admin`

3. **Start XAMPP:**
   - Open XAMPP Control Panel
   - Start Apache

4. **Access Admin:**
   - Open browser: `http://localhost/khadivasthra/admin/`
   - Password: `admin123`

---

## Quick Test After Installation

After installing PHP, test it:

```powershell
php -v
```

You should see something like:
```
PHP 8.2.x (cli) (built: ...)
```

If you see this, PHP is installed correctly!

---

## Troubleshooting

### "php: command not found" after adding to PATH
- Close and reopen PowerShell/Command Prompt
- Restart your computer if needed
- Verify PATH: `echo $env:Path` (should include PHP path)

### Port 8080 already in use
- Use different port: `php -S localhost:8081 -t .`
- Or find what's using port 8080: `netstat -ano | findstr :8080`

### Permission errors
- Run PowerShell as Administrator
- Check folder permissions for `admin/data/` and `admin/uploads/`

