# Quick Guide: Deploy Admin Online

## 🚀 Fastest Way to Deploy

### Option 1: Shared Hosting (Easiest)

1. **Get hosting** with PHP support (cPanel, Hostinger, etc.)

2. **Upload admin folder** via FTP/File Manager:
   - Upload entire `admin` folder to `public_html/admin`

3. **Set permissions**:
   - `admin/data/` → 755
   - `admin/uploads/` → 755

4. **Change password** in `admin/includes/config.php`

5. **Access**: `https://yourdomain.com/admin/`

---

### Option 2: VPS/Cloud Server

**DigitalOcean/Railway/Render:**

1. **Create account** and new project

2. **Upload files** via Git or SFTP:
   ```bash
   scp -r admin/ user@your-server:/var/www/html/admin
   ```

3. **Install PHP** (if not pre-installed):
   ```bash
   sudo apt install php php-cli
   ```

4. **Set permissions**:
   ```bash
   chmod 755 admin/data admin/uploads
   ```

5. **Configure web server** (Apache/Nginx)

---

## 🔒 Security (IMPORTANT!)

### Before Going Live:

1. **Change Password:**
   ```bash
   php -r "echo password_hash('your_strong_password', PASSWORD_DEFAULT);"
   ```
   Update in `admin/includes/config.php`

2. **Enable HTTPS** (SSL certificate)

3. **Optional: IP Whitelist** (add to `.htaccess`)

---

## 📍 Access URLs

- **Admin**: `https://yourdomain.com/admin/`
- **Login**: Password you set in config.php

---

## ✅ Test Checklist

- [ ] Can access login page
- [ ] Can login with new password
- [ ] Can view dashboard
- [ ] Can add/edit product
- [ ] Can upload image
- [ ] Data saves correctly

---

## 🆘 Common Issues

**500 Error**: Check PHP version (needs 8.0+)
**Permission Error**: Set folders to 755
**Upload Fails**: Check uploads folder permissions

---

**Need help?** See `DEPLOY_ONLINE.md` for detailed guide.

