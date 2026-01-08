# Admin Panel on Same Domain (/admin)

This guide shows how to serve the admin panel at `yourdomain.com/admin` on the same domain as your Next.js app.

---

## 🎯 Goal

- **Next.js App**: `https://yourdomain.com/` (all routes except /admin)
- **Admin Panel**: `https://yourdomain.com/admin/` (PHP backend)

---

## 📋 Solution Overview

You need to configure your web server to:
1. Serve Next.js for all routes **except** `/admin`
2. Serve PHP files for `/admin` routes
3. Handle both on the same domain

---

## 🚀 Production Setup

### Option 1: Nginx Configuration (Recommended)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/khadivasthra;
    index index.html index.php;
    
    # Admin panel - PHP routes (MUST come before Next.js)
    location /admin {
        alias /var/www/khadivasthra/admin;
        
        # Try to serve file, then directory, then PHP
        try_files $uri $uri/ /admin/index.php?$query_string;
        
        # PHP processing
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }
    
    # Next.js app - all other routes
    location / {
        try_files $uri $uri/ /_next/static/$uri /index.html;
        
        # Proxy to Next.js server (if running separately)
        # Or serve static files if using `next export`
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Next.js static files
    location /_next/static {
        alias /var/www/khadivasthra/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### Option 2: Apache Configuration

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/khadivasthra
    
    # Admin panel - PHP routes
    <Directory "/var/www/khadivasthra/admin">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # PHP processing
        <FilesMatch \.php$>
            SetHandler "proxy:unix:/var/run/php/php8.2-fpm.sock|fcgi://localhost"
        </FilesMatch>
    </Directory>
    
    # Next.js app - all other routes
    <Directory "/var/www/khadivasthra">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Rewrite rules for Next.js
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy Next.js API routes (if using Next.js API)
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
```

---

### Option 3: Vercel/Netlify with Serverless Functions

If using Vercel or Netlify, you can use serverless functions to proxy PHP:

**Vercel:**
```typescript
// vercel.json
{
  "rewrites": [
    {
      "source": "/admin/:path*",
      "destination": "https://your-php-server.com/admin/:path*"
    }
  ]
}
```

**Note:** This requires a separate PHP server. For true same-domain setup, use Option 1 or 2.

---

## 🔧 Development Setup

For local development, Next.js rewrites are already configured in `next.config.ts`:

```typescript
async rewrites() {
  return [
    {
      source: '/admin/:path*',
      destination: 'http://localhost:8080/:path*',
    },
  ];
}
```

### Start Both Servers:

**Terminal 1 - Next.js:**
```bash
npm run dev
```

**Terminal 2 - PHP Admin:**
```bash
cd admin
php -S localhost:8080 -t .
```

### Access:
- **Next.js App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin (proxied to PHP)

---

## 📝 File Structure for Production

```
/var/www/khadivasthra/
├── .next/              # Next.js build output
├── admin/              # PHP admin panel
│   ├── api/
│   ├── data/
│   ├── includes/
│   ├── uploads/
│   └── ...
├── public/             # Next.js public files
├── src/                # Next.js source
└── package.json
```

---

## 🔒 Security Considerations

### 1. Update Admin Config for Same Domain

Update `admin/includes/config.php`:

```php
// CORS - Allow same domain
header('Access-Control-Allow-Origin: https://yourdomain.com');
header('Access-Control-Allow-Credentials: true');

// Secure cookies (HTTPS only)
ini_set('session.cookie_secure', 1);
```

### 2. Protect Admin Routes

Add to `admin/.htaccess`:

```apache
# Prevent directory listing
Options -Indexes

# Protect sensitive files
<FilesMatch "\.(json|log|md)$">
    Order allow,deny
    Deny from all
</FilesMatch>
```

### 3. Rate Limiting (Optional)

Add rate limiting to prevent brute force attacks on login.

---

## ✅ Testing Checklist

After setup, test:

- [ ] Next.js homepage loads: `https://yourdomain.com/`
- [ ] Next.js products page: `https://yourdomain.com/products`
- [ ] Admin login: `https://yourdomain.com/admin/`
- [ ] Admin dashboard: `https://yourdomain.com/admin/dashboard.php`
- [ ] Admin API: `https://yourdomain.com/admin/api/products.php`
- [ ] Image uploads work
- [ ] Sessions persist correctly
- [ ] HTTPS works for both

---

## 🐛 Troubleshooting

### "404 Not Found" for /admin
- Check web server configuration
- Verify admin folder path is correct
- Check file permissions

### "500 Internal Server Error"
- Check PHP error logs
- Verify PHP-FPM is running
- Check file permissions (755 for folders, 644 for files)

### Next.js routes not working
- Verify Next.js server is running
- Check proxy configuration
- Ensure Next.js routes come after /admin in config

### Session/Cookie issues
- Verify `session.cookie_secure` is set correctly
- Check domain settings in PHP config
- Ensure CORS headers are correct

---

## 📚 Additional Resources

- [Nginx PHP-FPM Setup](https://www.nginx.com/resources/wiki/start/topics/examples/phpfcgi/)
- [Apache PHP Configuration](https://httpd.apache.org/docs/2.4/howto/php.html)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🎉 Summary

With this setup:
- ✅ Admin panel accessible at `yourdomain.com/admin`
- ✅ Next.js app accessible at `yourdomain.com`
- ✅ Both on same domain with HTTPS
- ✅ Proper routing and security

