# Deployment Checklist

## Pre-Deployment

- [ ] Choose hosting provider (shared hosting, VPS, cloud)
- [ ] Verify hosting supports PHP 8.0+
- [ ] Get FTP/SFTP access or file manager access
- [ ] Get domain/subdomain ready

## Upload Files

- [ ] Upload entire `admin` folder to web server
- [ ] Maintain folder structure (api/, data/, includes/, etc.)
- [ ] Verify all files uploaded correctly

## Configuration

- [ ] **Generate new password hash:**
  ```bash
  php -r "echo password_hash('your_strong_password', PASSWORD_DEFAULT);"
  ```
- [ ] **Update `admin/includes/config.php`:**
  - [ ] Change `ADMIN_PASSWORD_HASH` to new hash
  - [ ] Set `session.cookie_secure` to `1` (for HTTPS)
  - [ ] Update CORS `Access-Control-Allow-Origin` with your domain

## File Permissions

- [ ] Set `admin/data/` folder to **755**
- [ ] Set `admin/uploads/` folder to **755**
- [ ] Set `admin/data/*.json` files to **644**
- [ ] Set PHP files to **644**

## Security

- [ ] Change default password (admin123)
- [ ] Enable HTTPS/SSL certificate
- [ ] Test login with new password
- [ ] (Optional) Set up IP whitelist in .htaccess

## Testing

- [ ] Access login page: `https://yourdomain.com/admin/`
- [ ] Login with new password
- [ ] View dashboard
- [ ] Add a test product
- [ ] Upload a test image
- [ ] Edit a product
- [ ] Delete a product
- [ ] Test category management
- [ ] Test settings update

## Backup Setup

- [ ] Set up regular backups of `admin/data/` folder
- [ ] Set up backups of `admin/uploads/` folder
- [ ] Test backup restoration process

## Integration

- [ ] Update Next.js app to use online API (if needed)
- [ ] Test API endpoints from Next.js app
- [ ] Verify CORS is working correctly

## Post-Deployment

- [ ] Monitor error logs for first few days
- [ ] Test all features thoroughly
- [ ] Document admin URL and credentials securely
- [ ] Set up monitoring/alerts (optional)

---

## Quick Commands Reference

### Generate Password Hash:
```bash
php -r "echo password_hash('your_password', PASSWORD_DEFAULT);"
```

### Set Permissions (SSH):
```bash
chmod 755 admin/data admin/uploads
chmod 644 admin/data/*.json
```

### Test PHP Version:
```bash
php -v
```

---

## ✅ Ready to Deploy!

Once all items are checked, your admin panel is ready for production use!

