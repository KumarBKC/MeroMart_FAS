# MeroMart - Financial Accounting Software System

This is A complete ERP/POS solution designed for supermarkets and retailers, built with Next.js frontend and PHP/MySQL backend.

## Features

- **User Management**: Role-based access (admin/cashier) with secure authentication
- **Product Management**: Inventory tracking with stock levels, barcodes, and categories
- **Billing System**: Generate bills with itemized billing, discounts, and VAT calculation
- **Expense Management**: Track business expenses with categorization
- **Dashboard**: Real-time business metrics and analytics
- **Reports**: Financial reporting and data export capabilities
- **Settings**: Store configuration and user preferences

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Radix UI components
- **Styling**: Tailwind CSS
- **State Management**: React hooks with localStorage
- **Port**: 3001

### Backend
- **Language**: PHP 8.x
- **Database**: MySQL 8.x
- **Server**: XAMPP (Apache + MySQL + PHP)
- **Authentication**: Session-based with password hashing

##  Prerequisites

- Node.js 18+ and npm/pnpm
- XAMPP or similar local server environment
- MySQL 8.x
- PHP 8.x

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MeroMart
```

### 2. Backend Setup

#### Database Setup
1. Start XAMPP and ensure Apache and MySQL are running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database named `meromart_db`
4. Import the database schema:
   ```bash
   # Option 1: Use the main schema
   mysql -u root -p meromart_db < backend/database_schema.sql
   
   # Option 2: Use the migration script (if updating existing database)
   mysql -u root -p meromart_db < backend/migrate_to_bills.sql
   ```

#### PHP Configuration
1. Copy the backend files to your XAMPP htdocs directory
2. Update database connection in `backend/db.php`:
   ```php
   $host = "localhost";
   $dbname = "meromart_db";
   $username = "root";  // Your MySQL username
   $password = "";      // Your MySQL password
   ```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
# or
pnpm install
```

#### Environment Configuration
Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost/backend
```

#### Start Development Server
```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3001`

##  Default Login

After running the migration script, you can login with:
- **Email**: admin@meromart.com
- **Password**: password
- Or you can just create a new account

## Project Structure

```
MeroMart/
├── backend/                 # PHP API endpoints
│   ├── bills.php           # Bill management API
│   ├── products.php        # Product management API
│   ├── expenses.php        # Expense management API
│   ├── login.php           # Authentication API
│   ├── register.php        # User registration API
│   └── database_schema.sql # Database schema
├── frontend/               # Next.js application
│   ├── app/               # Next.js App Router pages
│   │   ├── dashboard/     # Main dashboard
│   │   ├── bills/         # Bill management
│   │   ├── products/      # Product management
│   │   ├── expenses/      # Expense tracking
│   │   ├── reports/       # Financial reports
│   │   └── settings/      # System settings
│   ├── components/        # Reusable UI components
│   ├── lib/              # Utilities and data layer
│   └── hooks/            # Custom React hooks
└── README.md
```

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `products` - Product catalog and inventory
- `bills` - Sales transactions
- `bill_items` - Individual items in bills
- `expenses` - Business expenses
- `expense_categories` - Expense categorization
- `store_settings` - Store configuration

## API Endpoints

### Authentication
- `POST /backend/login.php` - User login
- `POST /backend/register.php` - User registration

### Products
- `GET /backend/products.php` - Get all products
- `POST /backend/products.php` - Create/update product
- `DELETE /backend/products.php?id={id}` - Delete product

### Bills
- `GET /backend/bills.php` - Get all bills
- `POST /backend/bills.php` - Create new bill
- `PUT /backend/bills.php` - Update bill
- `DELETE /backend/bills.php?id={id}` - Delete bill

### Expenses
- `GET /backend/expenses.php` - Get all expenses
- `POST /backend/expenses.php` - Create/update expense
- `DELETE /backend/expenses.php?id={id}` - Delete expense

## Deployment

### Production Build
```bash
cd frontend
npm run build
npm start
```

### Environment Variables
Set the following environment variables for production:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL
- Database credentials in `backend/db.php`

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `backend/db.php`
   - Ensure database `meromart_db` exists

2. **CORS Errors**
   - Check CORS headers in backend PHP files
   - Verify frontend is running on correct port (3001)

3. **API Endpoint Not Found**
   - Ensure backend files are in correct XAMPP directory
   - Check Apache is running
   - Verify file permissions

### Error Logs
- Backend errors are logged in `backend/error.log`
- Frontend errors appear in browser console

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
