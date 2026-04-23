# Atkias Zone Backend - Postman Collection

## 📋 Overview

This Postman collection contains all API endpoints for the Atkias Zone e-commerce backend. The collection includes authentication, CRUD operations for all modules, and example data.

## 🚀 Quick Start

### 1. Import the Collection

- Open Postman
- Click "Import" button
- Select "File"
- Choose `AtkiasZone_Postman_Collection.json`

### 2. Set Environment Variables

Create a new environment in Postman with:

- `baseUrl`: `http://localhost:5000` (or your server URL)
- `token`: (will be auto-populated after login)

### 3. Run the Seed Script

Before testing, make sure to seed your database:

```bash
npm run seed
```

### 4. Start Testing

1. **Login First**: Run the "Admin Login" request in the Authentication folder
2. **Token Auto-Save**: The login request automatically saves the token to the `token` variable
3. **Test Protected Routes**: All authenticated requests will use the saved token

## 📁 Collection Structure

### 🔐 Authentication

- **Admin Login**: Get access token (use seeded admin credentials)
- **Get My Profile**: View current admin profile
- **Change Password**: Update admin password

### 👥 Admin Management

- Create, read, update admin accounts
- Only accessible by ADMIN role

### 📂 Categories

- Full CRUD operations for product categories
- Public read access, admin-only write access

### 🏷️ Brands

- Manage product brands
- Public read access, admin-only modifications

### 📦 Products

- Complete product management
- Advanced filtering and search
- Category discount application

### 🎫 Coupons

- Coupon creation and management
- Public coupon application
- Admin-only coupon management

### 📋 Orders

- Order creation and tracking
- Admin order management
- Status updates

### ⭐ Reviews

- Customer review submission
- Admin review moderation
- Product review retrieval

### 📢 Banners

- Homepage banner management
- Public banner display
- Admin banner controls

### 🏠 Homepage Sections

- Dynamic homepage content management
- Section and item management
- Position-based ordering

### 📢 Announcements

- Site-wide announcements
- Admin announcement management

### 📺 YouTube Videos

- Video content management
- YouTube integration

### 📎 File Upload

- Single and multiple file uploads
- Image and document handling

## 🔑 Default Admin Credentials

After running `npm run seed`, you can login with:

- **Email**: `superadmin@atkiaszone.com`
- **Password**: `superadmin123`

## 📝 Request Examples

### Authentication Header

All protected routes require:

```
Authorization: Bearer {{token}}
```

### Common Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## 🧪 Testing Tips

1. **Start with Authentication**: Always login first to get a token
2. **Check IDs**: Replace placeholder IDs (like `:categoryId`) with actual IDs from your database
3. **Environment Variables**: Update `baseUrl` if your server runs on a different port
4. **Error Handling**: Check response status codes and error messages
5. **Data Dependencies**: Create categories/brands before creating products that reference them

## 🔄 Workflow Examples

### Adding a New Product

1. Create/Login as Admin → Get token
2. Create Category (if needed)
3. Create Brand (if needed)
4. Create Product with categoryId and brandId
5. Upload product images
6. Add product to homepage sections (optional)

### Order Management

1. Customer places order (no auth required)
2. Admin views all orders
3. Admin updates order status
4. Customer tracks order with tracking number

## 📊 API Response Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## 🆘 Troubleshooting

- **401 Unauthorized**: Check if token is valid and properly set
- **404 Not Found**: Verify endpoint URLs and IDs
- **400 Bad Request**: Check request body format and required fields
- **Token Expired**: Re-login to get a new token

---

**Note**: This collection assumes your backend is running on `http://localhost:5000`. Update the `baseUrl` environment variable if your server runs on a different URL/port.
