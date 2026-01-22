# Quick Setup: Admin on Same Domain (/admin)

## ✅ What's Configured

1. **Next.js rewrites** - Proxies `/admin` to PHP server (development)
2. **Server configs** - Nginx and Apache examples for production
3. **Admin config** - Updated for same-domain CORS

---

## 🚀 Development (Local)

### Already Working!

1. **Start Next.js:**
   ```bash
   npm run dev
   ```

2. **Start PHP Admin:**
   ```bash
   cd admin
   php -S localhost:8080 -t .
   ```

3. **Access:**
   - **Next.js App**: http://localhost:3000
   - **Admin Panel**: http://localhost:3000/admin ✅

The rewrite in `next.config.ts` automatically proxies `/admin` to the PHP server!

---

## 🌐 Production (Same Domain)

### Option 1: Nginx (Recommended)

1. **Copy config:**
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/khadivasthra
   ```

2. **Update paths:**
   - Change `yourdomain.com` to your domain
   - Update SSL certificate paths
   - Update file paths to match your server

3. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/khadivasthra /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 2: Apache

1. **Copy config:**
   ```bash
   sudo cp apache.conf.example /etc/apache2/sites-available/khadivasthra.conf
   ```

2. **Update paths** (same as Nginx)

3. **Enable site:**
   ```bash
   sudo a2ensite khadivasthra
   sudo systemctl reload apache2
   ```

---

## 📋 File Structure

```
/var/www/khadivasthra/
├── .next/              # Next.js build
├── admin/              # PHP admin (accessible at /admin)
│   ├── api/
│   ├── data/
│   └── ...
├── public/             # Next.js public files
└── src/                # Next.js source
```

---

## ✅ Testing

After deployment:

- [ ] `https://yourdomain.com/` → Next.js homepage
- [ ] `https://yourdomain.com/products` → Next.js products
- [ ] `https://yourdomain.com/admin/` → Admin login ✅
- [ ] `https://yourdomain.com/admin/dashboard.php` → Admin dashboard ✅

---

## 🔒 Security Notes

1. **Change default password** before going live
2. **Enable HTTPS** (required for production)
3. **Update CORS** in `admin/includes/config.php` if needed
4. **Set file permissions** (755 for folders, 644 for files)

---

## 📚 Full Documentation

See `admin/SAME_DOMAIN_SETUP.md` for detailed instructions.

