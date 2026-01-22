# Khadi Vasthra Admin Panel

PHP-based admin backend for managing website content. Stores data in JSON files (no database required).

## Features

- **Product Management**: Add, edit, delete products with image uploads
- **Category Management**: Manage product categories
- **Site Settings**: Update store information, contact details, social links
- **Simple Authentication**: Password-based login (no username required)
- **Image Upload**: Upload product images (max 2MB, JPG/PNG/WebP/GIF)
- **CSRF Protection**: All forms protected with CSRF tokens
- **Session Management**: 30-minute session timeout

## Installation

1. Ensure PHP 8+ is installed on your server
2. Set proper file permissions:
   ```bash
   chmod 755 admin/
   chmod 755 admin/data/
   chmod 755 admin/uploads/
   chmod 644 admin/data/*.json
   ```

3. **Change the default password** in `admin/includes/config.php`:
   ```php
   // Default password is "admin123"
   // Generate a new hash:
   // php -r "echo password_hash('your_new_password', PASSWORD_DEFAULT);"
   define('ADMIN_PASSWORD_HASH', 'your_new_hash_here');
   ```

## Default Login

- **Password**: `admin123` (CHANGE THIS IMMEDIATELY!)

## File Structure

```
admin/
├── index.php              # Login page
├── dashboard.php          # Admin panel UI
├── api/
│   ├── auth.php          # Authentication API
│   ├── products.php      # Products CRUD API
│   ├── categories.php    # Categories CRUD API
│   ├── settings.php      # Settings API
│   └── upload.php        # Image upload API
├── includes/
│   ├── config.php        # Configuration & password
│   ├── functions.php     # Helper functions
│   └── auth-check.php    # Authentication check
├── data/
│   ├── products.json     # Product data
│   ├── categories.json   # Category data
│   └── settings.json     # Site settings
└── uploads/              # Product images
```

## API Endpoints

### Authentication
- `POST /admin/api/auth.php` - Login/Logout
  - Action: `login` - Login with password
  - Action: `logout` - Logout
  - Action: `check` - Check authentication status

### Products
- `GET /admin/api/products.php` - List all products
- `POST /admin/api/products.php` - Add new product
- `POST /admin/api/products.php` (with `_method=PUT`) - Update product
- `POST /admin/api/products.php` (with `_method=DELETE`) - Delete product

### Categories
- `GET /admin/api/categories.php` - List all categories
- `POST /admin/api/categories.php` - Add new category
- `POST /admin/api/categories.php` (with `_method=PUT`) - Update category
- `POST /admin/api/categories.php` (with `_method=DELETE`) - Delete category

### Settings
- `GET /admin/api/settings.php` - Get site settings
- `POST /admin/api/settings.php` - Update settings

### Upload
- `POST /admin/api/upload.php` - Upload image (returns path)

## Data Structure

### Products JSON
```json
{
  "products": [
    {
      "id": "1",
      "name": "Product Name",
      "slug": "product-name",
      "category": "Category Name",
      "price": 550,
      "description": "Product description",
      "image": "/admin/uploads/image.jpg",
      "isFeatured": true,
      "inStock": true,
      "createdAt": "2024-01-01"
    }
  ]
}
```

### Categories JSON
```json
{
  "categories": [
    {
      "id": "1",
      "name": "Category Name",
      "slug": "category-name",
      "description": "Category description"
    }
  ]
}
```

### Settings JSON
```json
{
  "storeName": "Khadi Vasthra",
  "whatsapp": "91XXXXXXXXXX",
  "address": "Kurumassery, Aluva, Ernakulam",
  "email": "contact@khadivasthra.com",
  "instagram": "khadivasthra"
}
```

## Security

- Password hashed with `password_hash()` (bcrypt)
- CSRF tokens on all forms
- Session timeout: 30 minutes
- Input sanitization on all data
- File upload validation (images only, max 2MB)
- CORS enabled for Next.js frontend

## Next.js Integration

The admin panel stores data in JSON files that can be accessed by your Next.js frontend:

1. **Option 1**: Read JSON files directly
   ```typescript
   // In Next.js API route or page
   import fs from 'fs';
   const products = JSON.parse(fs.readFileSync('admin/data/products.json', 'utf8'));
   ```

2. **Option 2**: Use PHP API endpoints
   ```typescript
   // Fetch from PHP API
   const response = await fetch('http://your-domain.com/admin/api/products.php');
   const data = await response.json();
   ```

3. **Option 3**: Copy JSON files to Next.js public folder
   - Copy `admin/data/products.json` to `public/data/products.json`
   - Access via `/data/products.json` in Next.js

## Troubleshooting

### Permission Errors
- Ensure `admin/data/` and `admin/uploads/` are writable (755 or 775)
- Check that PHP can write to these directories

### Login Not Working
- Verify password hash in `config.php`
- Check PHP session configuration
- Ensure cookies are enabled

### Image Upload Fails
- Check `admin/uploads/` directory permissions (must be writable)
- Verify file size is under 2MB
- Check file type is allowed (JPG, PNG, WebP, GIF)

### API Returns 401 Unauthorized
- Check if session is expired (30 minutes)
- Verify you're logged in
- Check CSRF token is included in requests

## Support

For issues or questions, check:
- PHP error logs
- Browser console for JavaScript errors
- Network tab for API request/response details



