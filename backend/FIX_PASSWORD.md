# Fix Admin Password Issue

## Problem
The admin user `mamoo@gmail.com` has a password that is not a valid bcrypt hash, causing login to fail with "Password comparison error".

## Solution Options

### Option 1: Use Emergency Reset Endpoint (Development Only)

Make a POST request to reset the password:

```bash
curl -X POST http://localhost:3000/api/auth/emergency-reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mamoo@gmail.com",
    "newPassword": "admin123"
  }'
```

Or use this in your API client (Postman, etc.):
- **URL**: `http://localhost:3000/api/auth/emergency-reset-password`
- **Method**: POST
- **Body**:
```json
{
  "email": "mamoo@gmail.com",
  "newPassword": "admin123"
}
```

### Option 2: Direct Database Update

Run this SQL command in your database:

```sql
UPDATE users 
SET password = '$2b$10$yuQGeN5sy24lsdZsjw26o.iI1q1WcfIKUQ2uGXOxsCyAub9G8wAZa' 
WHERE email = 'mamoo@gmail.com';
```

**New Password**: `admin123`

### Option 3: Generate New Hash

If you want a different password, run:

```bash
node scripts/fix-admin-password.js <your-password> mamoo@gmail.com
```

Then use the generated SQL command.

## After Fixing

1. Try logging in with:
   - **Email**: `mamoo@gmail.com`
   - **Password**: `admin123` (or whatever you set)

2. Once logged in, you can change the password through the admin panel or use the password reset endpoint at `/api/admin/users/reset-password-by-email`

## Security Note

⚠️ **IMPORTANT**: The emergency reset endpoint is only available in development mode. It will be automatically disabled in production. Remove it before deploying to production or add additional security measures.
