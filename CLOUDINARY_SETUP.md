# Cloudinary Integration Setup

This application now uses Cloudinary for reliable, cloud-based image storage instead of local file storage.

## Why Cloudinary?

- ✅ **Reliable**: Images persist permanently in the cloud, not dependent on server disk space
- ✅ **No More Missing Images**: No more broken image links after server restarts or maintenance
- ✅ **Scalable**: Handle unlimited images without server storage concerns
- ✅ **CDN Delivery**: Images served globally through Cloudinary's CDN for faster loading
- ✅ **Auto-Optimization**: Images automatically optimized for different devices and formats
- ✅ **Secure**: HTTPS URLs with access control

## Setup Steps

### 1. Create a Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up (free account available)
3. Verify your email

### 2. Get Your Credentials

1. Log in to your Cloudinary Dashboard
2. In the top-right corner, click your profile → Dashboard
3. Under "Account Details" section, you'll find:
   - **Cloud Name** (e.g., `deaugufze`)
   - **API Key** (e.g., `249233962128247`)
   - **API Secret** (e.g., `4FC5bHJ6lfqZH8e0BJ9916GROS8`) - **Keep this secret!**

### 3. Update Environment Variables

Add these to your `.env` file:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Run Database Migration

```bash
node migrate-to-cloudinary.js
```

This updates your database schema to store full Cloudinary URLs instead of local filenames.

### 5. Restart the Application

```bash
npm start
```

## How It Works

### Image Upload Flow

1. User selects images on the form
2. Images are uploaded directly to Cloudinary
3. Cloudinary returns a secure URL
4. URL is stored in the database
5. Image link is displayed in the admin interface (fetched directly from Cloudinary)

### Key Changes

| Before | After |
|--------|-------|
| Files stored in `/uploads/` | Files stored on Cloudinary cloud |
| DB stores filenames | DB stores full URLs |
| Local server disk required | No local disk needed |
| Images lost if server down | Images always available |
| Manual cleanup needed | Automatic management |

## Database Changes

The migration script updates three columns:

- `po_image`: VARCHAR(255) → TEXT (for full URLs)
- `material_image_1`: VARCHAR(255) → TEXT
- `material_image_2`: VARCHAR(255) → TEXT

## Production Deployment

No need for persistent disk storage for uploads anymore! Simply:

1. Add Cloudinary credentials to production `.env`
2. Run the migration on production database
3. Deploy the application

The application will automatically manage all image storage through Cloudinary.

## Troubleshooting

### Images not loading in admin
- Verify Cloudinary credentials in `.env`
- Check that migration was run: `node migrate-to-cloudinary.js`
- Ensure database credentials are correct

### Upload fails with error
- Check that Cloudinary credentials are correct
- Verify file size is under 5MB
- Ensure file is a valid image format (jpg, png, gif, webp)

### Cloudinary credentials not recognized
- Clear the terminal and restart the server
- Verify `.env` file format (no spaces around `=`)
- Check that `CLOUDINARY_CLOUD_NAME` exactly matches your cloud name

## API Endpoints

The API remains the same, but now returns Cloudinary URLs:

```bash
# Get records with admin role
curl -H "x-mir-role: admin" http://localhost:3000/api/material-inward

# Response now includes full Cloudinary URLs
{
  "records": [
    {
      "inward_no": "MIR-2026-0001",
      "po_image_url": "https://res.cloudinary.com/.../image.jpg",
      ...
    }
  ]
}
```

## Free Plan Limits

Cloudinary's free plan includes:

- 25,000 transformations/month
- Unlimited storage
- Unlimited bandwidth

Perfect for small to medium deployments. Check [Cloudinary pricing](https://cloudinary.com/pricing) for details.

## Support

- Cloudinary Docs: https://cloudinary.com/documentation
- API Reference: https://cloudinary.com/documentation/image_upload_api_reference
