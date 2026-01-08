# Quick Fix: PHP Not Found in PowerShell

## Problem
You see: `php : The term 'php' is not recognized...`

## Solution 1: Close and Reopen PowerShell (Recommended)

The PATH was added permanently, but you need to **close and reopen PowerShell** for it to take effect.

1. Close your current PowerShell window
2. Open a new PowerShell window
3. Test: `php -v`
4. Should work now!

---

## Solution 2: Use Full Path (Works Immediately)

Instead of `php`, use the full path:

```powershell
C:\xampp\php\php.exe -S localhost:8080 -t .
```

---

## Solution 3: Add to Current Session (Temporary)

Run this in your current PowerShell:

```powershell
$env:Path += ";C:\xampp\php"
php -v
```

This only works for the current session. Close and reopen PowerShell for permanent fix.

---

## Solution 4: Use the Batch File (Easiest!)

Just **double-click** `START_ADMIN.bat` in the `admin` folder.

It automatically finds PHP and starts the server - no PATH needed!

---

## Verify PHP is Working

After any solution above, test with:

```powershell
php -v
```

You should see:
```
PHP 8.2.12 (cli) ...
```

---

## Start Admin Server

Once PHP works, run:

```powershell
cd admin
php -S localhost:8080 -t .
```

Or just double-click `START_ADMIN.bat`!

