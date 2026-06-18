# Material Inward Register

Ready-to-run single-page web application for recording material inward entries with image uploads, MySQL storage, automatic inward numbers, role-based access, admin search, image viewing, and Excel-friendly export.

## Requirements

- Node.js 18 or newer
- MySQL 8 or compatible MySQL server
- Cloudinary account (for image storage)

## Setup

### Get Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com) (free account available)
2. Go to your Dashboard → Settings → Copy:
   - Cloud Name
   - API Key
   - API Secret (keep this secret!)

### Installation Steps

1. Create the database and table:

```sql
SOURCE database.sql;
```

Or run `database.sql` from your MySQL client after opening this folder.

2. Install dependencies:

```bash
npm install
```

3. Create `.env` from the example and update your credentials:

```bash
copy .env.example .env
```

Then edit `.env` and add:
- **MySQL credentials** (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- **Cloudinary credentials** (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)

4. Run the Cloudinary database migration:

```bash
node migrate-to-cloudinary.js
```

This updates your database schema to store full Cloudinary URLs instead of local filenames.

5. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000/register
```

Admin records:

```text
http://localhost:3000/admin
```

## Files

- `public/index.html` - single-page form and admin page
- `public/styles.css` - responsive light theme UI
- `public/app.js` - validation, previews, submit, admin search, image modal
- `server.js` - Express API, MySQL save/search/export, Cloudinary upload handling
- `database.sql` - MySQL database and `material_inward_register` table
- `migrate-to-cloudinary.js` - Database migration script for Cloudinary integration

## Roles

- `/register` - entry form only. Admin records and Excel export are hidden.
- `/admin` - admin records screen. Register/Admin navigation and Excel export are visible.

Admin records show every submitted record by default. Use the `Filled By Name` search field to filter entries by the staff member who submitted them.

The server automatically adds `created_by_role` and `created_by_name` columns to an existing `material_inward_register` table if they are missing.

## API

- `POST /api/material-inward` - create entry with images
- `GET /api/material-inward` - admin-only list/search entries
- `GET /api/material-inward/export` - admin-only Excel export

Inward numbers are generated per year in this format:

```text
MIR-2026-0001
```

## Deploy as a Separate Subdomain

This application is a Node.js + MySQL app. It cannot be hosted as a static GitHub Pages page because it needs the Express backend, file uploads, and MySQL database.

Example target:

```text
https://material.yourdomain.com/register
https://material.yourdomain.com/admin
```

### 1. Prepare Server

Use a VPS, cloud server, cPanel Node.js app, Render/Railway/DigitalOcean, or any host that supports:

- Node.js 18+
- MySQL
- Cloudinary account (for image storage — no local disk storage needed)
- Custom domain/subdomain

### 2. DNS

Create a DNS record for your subdomain:

```text
Type: A
Name: material
Value: your-server-public-ip
```

If your hosting provider gives a hostname instead of an IP, use `CNAME`:

```text
Type: CNAME
Name: material
Value: your-host-provider-domain
```

### 3. Production Env

Copy the production env example:

```bash
cp .env.production.example .env
```

Update:

```text
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
PORT
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

### 4. Install and Create Database

```bash
npm install --omit=dev
mysql -u root -p < database.sql
node migrate-to-cloudinary.js
```

### 5. Run with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Nginx Subdomain Proxy

Use the template:

```text
deploy/nginx-subdomain.conf
```

Replace:

```text
material.yourdomain.com
```

with your real subdomain, then reload Nginx.

### 7. HTTPS

Use SSL on the subdomain. Camera capture from mobile browsers commonly requires HTTPS unless you are on `localhost`.

With Certbot/Nginx:

```bash
certbot --nginx -d material.yourdomain.com
```

### Final URLs

Security entry screen:

```text
https://material.yourdomain.com/register
```

Admin records screen:

```text
https://material.yourdomain.com/admin
```
