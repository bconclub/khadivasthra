# Deploy Admin Panel Online

## Overview
To make the admin panel accessible online, you need to deploy it to a web server with PHP support.

---

## Hosting Requirements

### Required:
- ✅ PHP 8.0 or higher
- ✅ Web server (Apache/Nginx)
- ✅ File upload permissions
- ✅ Write permissions for `data/` and `uploads/` folders

### Recommended:
- ✅ HTTPS/SSL certificate (for security)
- ✅ Domain or subdomain
- ✅ Regular backups

---

## Deployment Steps

### Step 1: Choose a Hosting Provider

**Popular Options:**
- **Shared Hosting**: cPanel, Hostinger, Bluehost (easiest)
- **VPS**: DigitalOcean, Linode, AWS (more control)
- **Platform as a Service**: Heroku, Railway, Render

### Step 2: Upload Admin Folder

1. **Upload the entire `admin` folder** to your web server
2. **Recommended location**: `public_html/admin` or `www/admin`
3. **Keep folder structure intact**:
   ```
   admin/
   ├── api/
   ├── data/
   ├── includes/
   ├── uploads/
   ├── index.php
   ├── dashboard.php
   └── ...
   ```

### Step 3: Set File Permissions

**Via FTP/File Manager:**
- `admin/data/` → **755** (readable/writable)
- `admin/uploads/` → **755** (readable/writable)
- `admin/data/*.json` → **644** (readable/writable)
- All PHP files → **644** (readable)

**Via SSH (if available):**
```bash
chmod 755 admin/data
chmod 755 admin/uploads
chmod 644 admin/data/*.json
```

### Step 4: Configure Paths (if needed)

If your admin is in a subdirectory, update paths in `admin/includes/config.php`:

```php
// If admin is at: yourdomain.com/admin/
// Paths should be relative, which they already are ✅

// If admin is at: admin.yourdomain.com/
// Paths should still work ✅
```

### Step 5: Change Default Password! 🔒

**IMPORTANT:** Change the default password before going live!

1. Generate new password hash:
   ```bash
   php -r "echo password_hash('your_strong_password', PASSWORD_DEFAULT);"
   ```

2. Update `admin/includes/config.php`:
   ```php
   define('ADMIN_PASSWORD_HASH', 'your_new_hash_here');
   ```

### Step 6: Test Access

1. Visit: `https://yourdomain.com/admin/`
2. Login with your new password
3. Test creating/editing a product
4. Test image upload

---

## Security Checklist

### Before Going Live:

- [ ] **Change default password** (`admin123`)
- [ ] **Enable HTTPS/SSL** (required for production)
- [ ] **Restrict access** (optional: IP whitelist, .htaccess)
- [ ] **Set proper file permissions**
- [ ] **Disable directory listing** (already done in .htaccess)
- [ ] **Regular backups** of `data/` folder
- [ ] **Update PHP version** to latest stable

---

## Access URLs

### After Deployment:
- **Admin Panel**: `https://yourdomain.com/admin/`
- **Login**: `https://yourdomain.com/admin/index.php`
- **Dashboard**: `https://yourdomain.com/admin/dashboard.php`

---

## Optional: Subdomain Setup

Instead of `/admin/`, use a subdomain:

1. **Create subdomain**: `admin.yourdomain.com`
2. **Point to**: `public_html/admin` folder
3. **Access**: `https://admin.yourdomain.com`

**Benefits:**
- Cleaner URL
- Easier to secure separately
- Can use different SSL certificate

---

## Optional: IP Whitelist (Extra Security)

Add to `admin/.htaccess`:

```apache
# Restrict access to specific IPs
<RequireAll>
    Require ip YOUR_IP_ADDRESS
    Require ip YOUR_OFFICE_IP
</RequireAll>
```

Or allow all but log access:

```apache
# Log all admin access
LogFormat "%h %l %u %t \"%r\" %>s %b" adminlog
CustomLog logs/admin_access.log adminlog
```

---

## Backup Strategy

### Regular Backups:
1. **Backup `admin/data/` folder** (contains all products, categories, settings)
2. **Backup `admin/uploads/` folder** (product images)
3. **Frequency**: Daily or weekly (depending on update frequency)

### Backup Script Example:
```bash
#!/bin/bash
# Backup admin data
tar -czf backup-$(date +%Y%m%d).tar.gz admin/data/ admin/uploads/
```

---

## Troubleshooting

### "500 Internal Server Error"
- Check PHP error logs
- Verify file permissions
- Check PHP version (needs 8.0+)

### "Permission Denied"
- Set correct folder permissions (755 for folders, 644 for files)
- Check ownership (should match web server user)

### "Cannot write to data folder"
- Check `admin/data/` permissions (must be 755 or 775)
- Verify web server user has write access

### "Image upload fails"
- Check `admin/uploads/` permissions (must be 755 or 775)
- Verify `upload_max_filesize` in PHP settings (should be 2MB+)

---

## Next.js Integration

After deploying admin online, update your Next.js app to fetch data from the online API:

```typescript
// In your Next.js app
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com/admin/api';

// Fetch products
const response = await fetch(`${API_BASE}/products.php`);
const data = await response.json();
```

Or continue using JSON files directly (copy from admin/data/ to your Next.js public folder).

---

## Quick Deploy Checklist

- [ ] Upload `admin` folder to web server
- [ ] Set correct file permissions
- [ ] Change default password
- [ ] Enable HTTPS/SSL
- [ ] Test login and basic functions
- [ ] Test image upload
- [ ] Set up regular backups
- [ ] Update Next.js to use online API (optional)

---

## Support

If you need help with deployment:
1. Check hosting provider documentation
2. Contact hosting support for PHP/server configuration
3. Review PHP error logs for specific issues

