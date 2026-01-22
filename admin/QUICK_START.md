# Quick Start - Admin Panel Access

## ⚠️ IMPORTANT: Next.js Cannot Serve PHP Files

The admin panel uses PHP, which Next.js cannot run. You need to run a **separate PHP server**.

## 🚀 Quick Solution (2 Steps)

### Step 1: Start Next.js (Terminal 1)
```bash
npm run dev
```
Your Next.js app runs on: **http://localhost:3000**

### Step 2: Start PHP Server (Terminal 2)

**Windows:**
```bash
cd admin
php -S localhost:8080 -t .
```

**Mac/Linux:**
```bash
cd admin
php -S localhost:8080 -t .
```

Or use the provided scripts:
- Windows: Double-click `start-server.bat`
- Mac/Linux: Run `./start-server.sh`

## 🔑 Access Admin Panel

1. Open browser: **http://localhost:8080**
2. Password: **admin123**

## 📝 Summary

- **Next.js App**: http://localhost:3000 (your main website)
- **Admin Panel**: http://localhost:8080 (PHP backend)

Both servers run simultaneously on different ports!

## ❓ Troubleshooting

**"php: command not found"**
- Install PHP 8.0+ from https://www.php.net/downloads.php
- Or use XAMPP/WAMP/MAMP

**"Port 8080 already in use"**
- Use a different port: `php -S localhost:8081 -t .`

**Still getting 404?**
- Make sure you're accessing `http://localhost:8080` (not port 3000)
- Check that PHP server is running in the `admin` folder

