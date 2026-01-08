# Setup After Installing XAMPP

## ✅ Step 1: Add PHP to PATH

### Option A: Use PowerShell Script (Easiest)

1. **Right-click** `add-php-to-path.ps1` → **Run with PowerShell**
   - If you get an error, right-click → **Run as Administrator**

2. **Or run manually in PowerShell (as Administrator):**
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\xampp\php", "User")
   ```

3. **Close and reopen PowerShell** for changes to take effect

4. **Test PHP:**
   ```powershell
   php -v
   ```
   You should see PHP version info!

---

## ✅ Step 2: Start Admin Panel

### Method 1: Use PHP Built-in Server (Recommended)

1. Open PowerShell in the `admin` folder:
   ```powershell
   cd C:\Users\user\Builds\Khadivasthra\admin
   ```

2. Start PHP server:
   ```powershell
   php -S localhost:8080 -t .
   ```

3. Open browser: **http://localhost:8080**
   - Password: **admin123**

---

### Method 2: Use XAMPP Web Server

1. **Copy admin folder to XAMPP:**
   - Copy `C:\Users\user\Builds\Khadivasthra\admin`
   - To: `C:\xampp\htdocs\khadivasthra\admin`

2. **Start XAMPP:**
   - Open XAMPP Control Panel
   - Click "Start" next to Apache

3. **Access Admin:**
   - Open browser: **http://localhost/khadivasthra/admin/**
   - Password: **admin123**

---

## 🚀 Quick Start Commands

After adding PHP to PATH:

```powershell
# Navigate to admin folder
cd admin

# Start PHP server
php -S localhost:8080 -t .

# Keep this terminal open!
# Access admin at: http://localhost:8080
```

---

## ✅ Verify Everything Works

1. **Check PHP:**
   ```powershell
   php -v
   ```
   Should show: `PHP 8.x.x`

2. **Start Server:**
   ```powershell
   cd admin
   php -S localhost:8080 -t .
   ```
   Should show: `Development Server (http://localhost:8080) started`

3. **Test in Browser:**
   - Go to: http://localhost:8080
   - Should see login page
   - Login with: `admin123`

---

## 🔧 Troubleshooting

### "php: command not found" after adding to PATH
- **Close and reopen PowerShell** (required!)
- Or restart your computer
- Verify: `echo $env:Path` (should include `C:\xampp\php`)

### Port 8080 already in use
- Use different port: `php -S localhost:8081 -t .`
- Or find what's using it: `netstat -ano | findstr :8080`

### XAMPP Apache won't start
- Check if port 80 is in use
- Change Apache port in XAMPP Control Panel → Config → httpd.conf

---

## 📝 Summary

**For Development (Recommended):**
- Use PHP built-in server: `php -S localhost:8080 -t .`
- Access: http://localhost:8080

**For Production-like Setup:**
- Use XAMPP Apache
- Copy admin to `C:\xampp\htdocs\`
- Access: http://localhost/khadivasthra/admin/

