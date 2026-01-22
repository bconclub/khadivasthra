# Deploy to Shared Server - Quick Guide

## 📁 What Files to Upload to `public_html/`

For your shared server (like "raddy"), upload the following:

### ✅ Step 1: Upload Next.js Frontend Site

**Upload ALL contents from the `out/` folder to `public_html/`**

```
public_html/
├── index.html                    ← Main homepage
├── 404.html                     ← Error page
├── favicon.ico                  ← Site icon
├── _next/                       ← Next.js assets (JS, CSS)
├── admin/                       ← Admin page (frontend)
├── cart/                        ← Cart page
├── contact/                     ← Contact page
├── products/                    ← Products listing pages
├── product/                     ← Individual product pages
├── images/                      ← All images
├── data/                        ← JSON data files
├── Cover KV.webp               ← Cover image
├── KV Logo Colour.webp         ← Logo
└── ... (all other files from out/)
```

**Important:** Upload the **contents** of `out/` folder, not the `out/` folder itself!

### ✅ Step 2: Upload Admin Backend (PHP)

**Upload the entire `admin/` folder to `public_html/admin/`**

```
public_html/admin/
├── api/                         ← PHP API endpoints
│   ├── auth.php
│   ├── categories.php
│   ├── products.php
│   ├── settings.php
│   └── upload.php
├── data/                        ← Data storage (must be writable)
│   ├── categories.json
│   ├── products.json
│   └── settings.json
├── includes/                    ← PHP includes
│   ├── config.php
│   ├── auth-check.php
│   └── functions.php
├── uploads/                     ← Image uploads (must be writable)
├── index.php                    ← Admin login page
├── dashboard.php                ← Admin dashboard
└── ... (all other admin files)
```

---

## 🔧 Setup Steps

### 1. Upload Files via FTP/cPanel File Manager

**Method 1: Via FTP (FileZilla, etc.)**
- Connect to your server via FTP
- Navigate to `public_html/`
- Upload all files from `out/` folder
- Upload `admin/` folder

**Method 2: Via cPanel File Manager**
- Login to cPanel
- Go to File Manager
- Navigate to `public_html/`
- Upload files (may need to extract zip first)

### 2. Set File Permissions

**Required permissions:**

```
Folders (Directories):
- public_html/admin/data/     → 755 (or 775)
- public_html/admin/uploads/  → 755 (or 775)

Files:
- public_html/admin/data/*.json → 644 (or 664)
- public_html/admin/*.php       → 644
```

**Via cPanel File Manager:**
1. Right-click on `admin/data/` folder → Change Permissions → Check 755
2. Right-click on `admin/uploads/` folder → Change Permissions → Check 755
3. Right-click on each JSON file in `admin/data/` → Change Permissions → Check 644

**Via FTP:**
- Most FTP clients allow you to change permissions
- Look for "CHMOD" or "Permissions" option

### 3. Change Admin Password (IMPORTANT!)

**Before going live, change the default password:**

1. **Generate a password hash:**
   ```bash
   php -r "echo password_hash('your_strong_password', PASSWORD_DEFAULT);"
   ```
   
   Or use online tool: https://phppasswordhash.com/

2. **Edit `public_html/admin/includes/config.php`:**
   ```php
   define('ADMIN_PASSWORD_HASH', 'your_new_hash_here');
   ```

3. **Save and upload the updated file**

### 4. Test Your Site

**Frontend:**
- Visit: `https://yourdomain.com/`
- Check homepage loads
- Test navigation links
- Check product pages

**Admin Panel:**
- Visit: `https://yourdomain.com/admin/`
- Login with your new password
- Test adding a product
- Test image upload

---

## 📋 Complete File List

### What Goes to `public_html/` (Root):

```
✅ Everything from out/ folder:
   - index.html
   - 404.html
   - favicon.ico
   - _next/ (entire folder)
   - admin/ (frontend HTML)
   - cart/
   - contact/
   - products/
   - product/
   - images/
   - data/
   - api/ (PHP files)
   - All image files (.webp, .png)
   - All other files and folders
```

### What Goes to `public_html/admin/`:

```
✅ Everything from admin/ folder:
   - api/
   - data/
   - includes/
   - uploads/
   - index.php
   - dashboard.php
   - All other PHP files
```

---

## ⚠️ Important Notes

1. **Don't upload:**
   - `node_modules/` folder
   - `src/` folder (source code)
   - `.git/` folder
   - `package.json`, `tsconfig.json`, etc. (dev files)
   - `out/` folder itself (upload its contents)

2. **File Structure:**
   - Make sure `admin/` folder is INSIDE `public_html/`
   - Path should be: `public_html/admin/`

3. **PHP Requirements:**
   - Server must have PHP 8.0 or higher
   - Must support file uploads
   - Must allow writing to `admin/data/` and `admin/uploads/`

4. **Security:**
   - Change default password immediately
   - Enable HTTPS/SSL
   - Keep PHP files permissions at 644

---

## 🚀 Quick Upload Checklist

- [ ] Upload all contents from `out/` to `public_html/`
- [ ] Upload entire `admin/` folder to `public_html/admin/`
- [ ] Set `admin/data/` folder permissions to 755
- [ ] Set `admin/uploads/` folder permissions to 755
- [ ] Change admin password in `admin/includes/config.php`
- [ ] Test website homepage loads
- [ ] Test admin login works
- [ ] Test product upload works

---

## 🆘 Troubleshooting

**"404 Not Found" on pages:**
- Check `.htaccess` file exists (should be in `out/` folder)
- Make sure server supports URL rewriting

**"500 Internal Server Error":**
- Check PHP version (needs 8.0+)
- Check file permissions
- Check PHP error logs in cPanel

**"Cannot write to data folder":**
- Set `admin/data/` permissions to 755 or 775
- Contact hosting support if still not working

**"Image upload fails":**
- Set `admin/uploads/` permissions to 755
- Check PHP upload_max_filesize setting

---

## 📞 Need Help?

If you encounter issues:
1. Check cPanel error logs
2. Verify PHP version in cPanel
3. Contact your hosting provider support
4. Double-check file permissions
