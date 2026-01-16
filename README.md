# Hardware Shop POS System - Backend API Repository

## 📋 Repository Overview

**Repository Name:** `hardware-pos-api`  
**Technology Stack:** Node.js + Express.js + TypeScript + PostgreSQL  
**Purpose:** RESTful API backend for multi-tenant hardware shop POS system  
**License:** Proprietary  
**Version:** 1.0.0

---

## 🎯 Project Description

The Hardware Shop POS System Backend API is a robust, scalable RESTful API built with Node.js, Express.js, and PostgreSQL. It provides comprehensive backend services for managing hardware shop operations with enterprise-grade security, multi-tenancy, and real-time data processing.

### Key Features

- **🔐 JWT Authentication & Authorization** - Secure token-based authentication with role-based access control
- **🏢 Multi-Tenant Architecture** - Complete data isolation between shops
- **📦 Comprehensive Product Management** - Products, variants, categories, brands, and pricing
- **📊 Advanced Inventory Control** - Real-time stock tracking, FIFO/LIFO/Weighted Average costing
- **💰 Complete Sales Management** - Invoices, quotations, returns, credit notes
- **🛒 Purchase Order Management** - PO creation, GRN processing, supplier management
- **👥 Customer & Supplier Management** - Complete CRM and supplier tracking
- **💳 Multi-Payment Processing** - Cash, card, bank transfer, mobile payments, credit sales
- **📈 Business Intelligence** - Real-time reports, analytics, and dashboards
- **🧾 Tax Compliance** - Sri Lankan VAT/NBT calculation and reporting
- **🔔 Real-Time Notifications** - WebSocket support for live updates
- **📝 Comprehensive Audit Logging** - Full activity tracking and history
- **🔄 Automated Background Jobs** - Scheduled tasks for reports, backups, notifications
- **🌐 RESTful API Design** - Clean, consistent API architecture

---

## 🏗️ Architecture

### Technology Stack

#### Core Framework
- **Node.js 18.x+** - JavaScript runtime
- **Express.js 4.x** - Web application framework
- **TypeScript 5.x** - Type-safe development

#### Database
- **PostgreSQL 15+** - Primary relational database
- **pg / node-postgres** - PostgreSQL client
- **Knex.js** - SQL query builder and migrations
- **Redis 7.x** - Caching and session storage

#### Authentication & Security
- **jsonwebtoken (JWT)** - Token generation and verification
- **bcrypt** - Password hashing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **cors** - CORS middleware
- **express-validator** - Input validation

#### File Handling
- **multer** - File upload handling
- **sharp** - Image processing and optimization
- **AWS S3 SDK** - Cloud storage integration

#### Real-Time Communication
- **Socket.io** - WebSocket support
- **Bull** - Job queue management

#### Utilities
- **winston** - Logging framework
- **morgan** - HTTP request logger
- **dotenv** - Environment variable management
- **joi / zod** - Schema validation
- **date-fns** - Date manipulation
- **nodemailer** - Email sending
- **pdf-lib / puppeteer** - PDF generation
- **fast-csv / papaparse** - CSV processing

#### Testing
- **Jest** - Testing framework
- **Supertest** - HTTP testing
- **Faker** - Test data generation

---

## 📁 Project Structure

```
hardware-pos-api/
├── src/
│   ├── config/                     # Configuration files
│   │   ├── database.ts            # Database configuration
│   │   ├── redis.ts               # Redis configuration
│   │   ├── aws.ts                 # AWS S3 configuration
│   │   ├── jwt.ts                 # JWT settings
│   │   ├── email.ts               # Email configuration
│   │   └── index.ts               # Config exports
│   │
│   ├── database/                   # Database layer
│   │   ├── migrations/            # Knex migrations
│   │   │   ├── 001_create_users_table.ts
│   │   │   ├── 002_create_shops_table.ts
│   │   │   ├── 003_create_products_table.ts
│   │   │   └── ... (39 migration files)
│   │   │
│   │   ├── seeds/                 # Database seeders
│   │   │   ├── 001_demo_shop.ts
│   │   │   ├── 002_demo_products.ts
│   │   │   └── 003_demo_customers.ts
│   │   │
│   │   ├── models/                # Database models (if using ORM)
│   │   │   ├── User.ts
│   │   │   ├── Shop.ts
│   │   │   ├── Product.ts
│   │   │   └── ...
│   │   │
│   │   └── connection.ts          # Database connection pool
│   │
│   ├── modules/                    # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts # HTTP handlers
│   │   │   ├── auth.service.ts    # Business logic
│   │   │   ├── auth.repository.ts # Data access
│   │   │   ├── auth.routes.ts     # Route definitions
│   │   │   ├── auth.validators.ts # Input validation
│   │   │   ├── auth.types.ts      # TypeScript types
│   │   │   └── auth.test.ts       # Unit tests
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── users.validators.ts
│   │   │   ├── users.types.ts
│   │   │   └── users.test.ts
│   │   │
│   │   ├── shops/
│   │   │   ├── shops.controller.ts
│   │   │   ├── shops.service.ts
│   │   │   ├── shops.repository.ts
│   │   │   ├── shops.routes.ts
│   │   │   └── ...
│   │   │
│   │   ├── products/
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── products.repository.ts
│   │   │   ├── products.routes.ts
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   ├── brands.controller.ts
│   │   │   ├── brands.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── inventory/
│   │   │   ├── stock.controller.ts
│   │   │   ├── stock.service.ts
│   │   │   ├── stock.repository.ts
│   │   │   ├── adjustments.controller.ts
│   │   │   ├── adjustments.service.ts
│   │   │   ├── transfers.controller.ts
│   │   │   ├── transfers.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── sales/
│   │   │   ├── invoices.controller.ts
│   │   │   ├── invoices.service.ts
│   │   │   ├── invoices.repository.ts
│   │   │   ├── quotations.controller.ts
│   │   │   ├── quotations.service.ts
│   │   │   ├── returns.controller.ts
│   │   │   ├── returns.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── purchases/
│   │   │   ├── purchase-orders.controller.ts
│   │   │   ├── purchase-orders.service.ts
│   │   │   ├── grn.controller.ts
│   │   │   ├── grn.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── customers/
│   │   │   ├── customers.controller.ts
│   │   │   ├── customers.service.ts
│   │   │   ├── customers.repository.ts
│   │   │   ├── loyalty.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── suppliers/
│   │   │   ├── suppliers.controller.ts
│   │   │   ├── suppliers.service.ts
│   │   │   ├── suppliers.repository.ts
│   │   │   └── ...
│   │   │
│   │   ├── payments/
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── credit-notes.service.ts
│   │   │   └── ...
│   │   │
│   │   ├── reports/
│   │   │   ├── sales-reports.controller.ts
│   │   │   ├── sales-reports.service.ts
│   │   │   ├── inventory-reports.controller.ts
│   │   │   ├── inventory-reports.service.ts
│   │   │   ├── tax-reports.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── ...
│   │   │
│   │   └── notifications/
│   │       ├── notifications.controller.ts
│   │       ├── notifications.service.ts
│   │       ├── email.service.ts
│   │       ├── sms.service.ts
│   │       └── ...
│   │
│   ├── middleware/                 # Custom middleware
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── role.middleware.ts     # Role-based access
│   │   ├── tenant.middleware.ts   # Multi-tenancy
│   │   ├── validation.middleware.ts # Input validation
│   │   ├── error.middleware.ts    # Error handling
│   │   ├── logger.middleware.ts   # Request logging
│   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   └── upload.middleware.ts   # File upload
│   │
│   ├── utils/                      # Utility functions
│   │   ├── logger.ts              # Winston logger
│   │   ├── response.ts            # Standardized responses
│   │   ├── errors.ts              # Custom error classes
│   │   ├── validators.ts          # Validation helpers
│   │   ├── calculations.ts        # Business calculations
│   │   ├── formatters.ts          # Data formatters
│   │   ├── pdf-generator.ts       # PDF creation
│   │   ├── barcode-generator.ts   # Barcode creation
│   │   └── constants.ts           # Application constants
│   │
│   ├── jobs/                       # Background jobs
│   │   ├── daily-summary.job.ts   # Daily reports
│   │   ├── low-stock-alert.job.ts # Stock notifications
│   │   ├── backup.job.ts          # Database backup
│   │   ├── cleanup.job.ts         # Data cleanup
│   │   └── queue.ts               # Job queue setup
│   │
│   ├── types/                      # TypeScript types
│   │   ├── express.d.ts           # Express extensions
│   │   ├── common.types.ts        # Common types
│   │   ├── api.types.ts           # API types
│   │   └── models.types.ts        # Model types
│   │
│   ├── routes/                     # Route aggregation
│   │   ├── v1/
│   │   │   ├── index.ts           # V1 API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── products.routes.ts
│   │   │   └── ...
│   │   │
│   │   └── index.ts               # Main router
│   │
│   ├── app.ts                      # Express app setup
│   └── server.ts                   # Server entry point
│
├── tests/                          # Test files
│   ├── unit/                      # Unit tests
│   │   ├── services/
│   │   ├── controllers/
│   │   └── utils/
│   │
│   ├── integration/               # Integration tests
│   │   ├── auth.test.ts
│   │   ├── products.test.ts
│   │   └── sales.test.ts
│   │
│   ├── e2e/                       # End-to-end tests
│   │   └── complete-sale.test.ts
│   │
│   └── fixtures/                  # Test data
│       ├── products.json
│       └── users.json
│
├── scripts/                        # Utility scripts
│   ├── seed-database.ts           # Database seeding
│   ├── generate-docs.ts           # API documentation
│   └── backup-db.sh               # Backup script
│
├── docs/                           # Documentation
│   ├── api/                       # API documentation
│   │   ├── authentication.md
│   │   ├── products.md
│   │   ├── sales.md
│   │   └── ...
│   │
│   ├── database/                  # Database docs
│   │   ├── schema.md
│   │   └── erd.png
│   │
│   └── deployment/                # Deployment guides
│       ├── docker.md
│       └── production.md
│
├── .env.example                    # Environment template
├── .env.development               # Dev environment
├── .env.test                      # Test environment
├── .env.production                # Production environment
├── .gitignore
├── .eslintrc.json                 # ESLint config
├── .prettierrc                    # Prettier config
├── jest.config.js                 # Jest configuration
├── tsconfig.json                  # TypeScript config
├── knexfile.ts                    # Knex configuration
├── package.json
├── Dockerfile                     # Docker configuration
├── docker-compose.yml             # Docker Compose
├── .dockerignore
└── README.md                      # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 15.x
- **Redis** >= 7.x
- **npm** >= 9.x or **yarn** >= 1.22.x
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/hardware-pos-api.git
cd hardware-pos-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Database Setup**

Create PostgreSQL database:
```bash
createdb hardware_pos_db
```

4. **Environment Setup**

Create `.env.development`:
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hardware_pos_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (Optional)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=hardware-pos-uploads

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@hardwarepos.com

# SMS (Optional)
SMS_PROVIDER=twilio
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=HardwarePOS

# Application
APP_NAME=Hardware POS System
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

5. **Run Database Migrations**
```bash
npm run migrate
```

6. **Seed Database (Optional)**
```bash
npm run seed
```

7. **Start Development Server**
```bash
npm run dev
```

API will be available at `http://localhost:3000`

---

## 📜 Available Scripts

### Development
```bash
npm run dev           # Start dev server with hot reload
npm run dev:debug     # Start with debugging enabled
```

### Database
```bash
npm run migrate       # Run all pending migrations
npm run migrate:make  # Create new migration
npm run migrate:rollback # Rollback last migration
npm run migrate:latest # Run latest migrations
npm run seed          # Run database seeders
npm run seed:make     # Create new seeder
```

### Building
```bash
npm run build         # Compile TypeScript to JavaScript
npm run clean         # Remove build directory
```

### Testing
```bash
npm run test          # Run all tests
npm run test:unit     # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e      # Run end-to-end tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Code Quality
```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting errors
npm run format        # Format code with Prettier
npm run type-check    # Check TypeScript types
```

### Production
```bash
npm run start         # Start production server
npm run pm2:start     # Start with PM2
npm run pm2:stop      # Stop PM2 process
npm run pm2:restart   # Restart PM2 process
```

### Utilities
```bash
npm run docs:generate # Generate API documentation
npm run backup:db     # Backup database
npm run restore:db    # Restore database
```

---

## 🔧 Configuration

### Environment Variables

#### Core Settings
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | ✅ | development |
| `PORT` | Server port | ✅ | 3000 |
| `API_VERSION` | API version prefix | ❌ | v1 |

#### Database
| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | ✅ |
| `DB_PORT` | PostgreSQL port | ✅ |
| `DB_NAME` | Database name | ✅ |
| `DB_USER` | Database user | ✅ |
| `DB_PASSWORD` | Database password | ✅ |

#### Security
| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | ✅ |
| `JWT_EXPIRES_IN` | Token expiration | ✅ |
| `BCRYPT_ROUNDS` | Password hashing rounds | ❌ |
| `CORS_ORIGIN` | Allowed CORS origins | ✅ |

---

## 🔐 API Authentication

### JWT Token Flow

```
1. Login → POST /api/v1/auth/login
   Returns: { accessToken, refreshToken }

2. Authenticated Request → Header: Authorization: Bearer {accessToken}

3. Refresh Token → POST /api/v1/auth/refresh
   Body: { refreshToken }
   Returns: { accessToken }
```

### Role-Based Authorization

```typescript
// Example protected route
router.get('/products',
  authenticate,              // Verify JWT
  authorize(['owner', 'manager', 'cashier']), // Check role
  getProducts
);
```

---

## 📡 API Endpoints

### Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.hardwarepos.com/api/v1
```

### Core Endpoints

#### Authentication
```
POST   /auth/register           # Register new shop
POST   /auth/login              # User login
POST   /auth/refresh            # Refresh access token
POST   /auth/logout             # Logout
POST   /auth/forgot-password    # Request password reset
POST   /auth/reset-password     # Reset password
POST   /auth/verify-email       # Verify email
```

#### Users
```
GET    /users                   # List users
POST   /users                   # Create user
GET    /users/:id               # Get user
PUT    /users/:id               # Update user
DELETE /users/:id               # Delete user
PATCH  /users/:id/activate      # Activate user
PATCH  /users/:id/deactivate    # Deactivate user
```

#### Products
```
GET    /products                # List products
POST   /products                # Create product
GET    /products/:id            # Get product
PUT    /products/:id            # Update product
DELETE /products/:id            # Delete product
POST   /products/bulk-import    # Bulk import
POST   /products/bulk-update    # Bulk price update
GET    /products/:id/history    # Price history
POST   /products/:id/variants   # Add variant
```

#### Categories & Brands
```
GET    /categories              # List categories
POST   /categories              # Create category
PUT    /categories/:id          # Update category
DELETE /categories/:id          # Delete category

GET    /brands                  # List brands
POST   /brands                  # Create brand
PUT    /brands/:id              # Update brand
DELETE /brands/:id              # Delete brand
```

#### Inventory
```
GET    /inventory/stock         # View stock levels
POST   /inventory/adjustments   # Create adjustment
GET    /inventory/adjustments   # List adjustments
POST   /inventory/transfers     # Create transfer
GET    /inventory/transfers     # List transfers
PATCH  /inventory/transfers/:id/approve # Approve transfer
GET    /inventory/movements     # Stock movements
GET    /inventory/low-stock     # Low stock report
```

#### Sales
```
POST   /sales/invoices          # Create invoice
GET    /sales/invoices          # List invoices
GET    /sales/invoices/:id      # Get invoice
POST   /sales/quotations        # Create quotation
GET    /sales/quotations        # List quotations
PATCH  /sales/quotations/:id/convert # Convert to invoice
POST   /sales/returns           # Create return
GET    /sales/returns           # List returns
```

#### Purchases
```
POST   /purchases/orders        # Create PO
GET    /purchases/orders        # List POs
GET    /purchases/orders/:id    # Get PO
PATCH  /purchases/orders/:id/approve # Approve PO
POST   /purchases/grn           # Create GRN
GET    /purchases/grn           # List GRNs
POST   /purchases/invoices      # Record supplier invoice
```

#### Customers
```
GET    /customers               # List customers
POST   /customers               # Create customer
GET    /customers/:id           # Get customer
PUT    /customers/:id           # Update customer
DELETE /customers/:id           # Delete customer
GET    /customers/:id/transactions # Transaction history
GET    /customers/:id/loyalty   # Loyalty points
```

#### Suppliers
```
GET    /suppliers               # List suppliers
POST   /suppliers               # Create supplier
GET    /suppliers/:id           # Get supplier
PUT    /suppliers/:id           # Update supplier
DELETE /suppliers/:id           # Delete supplier
GET    /suppliers/:id/products  # Supplied products
```

#### Payments
```
POST   /payments                # Record payment
GET    /payments                # List payments
GET    /payments/:id            # Get payment
POST   /credit-notes            # Issue credit note
GET    /credit-notes            # List credit notes
```

#### Reports
```
GET    /reports/dashboard       # Dashboard metrics
GET    /reports/sales           # Sales reports
GET    /reports/inventory       # Inventory reports
GET    /reports/purchases       # Purchase reports
GET    /reports/customers       # Customer reports
GET    /reports/profit-loss     # P&L statement
GET    /reports/tax             # Tax reports
GET    /reports/daily-summary   # Daily summary
```

---

## 📊 Database Schema

### Multi-Tenancy Strategy

All tables include `shop_id` or `tenant_id` for data isolation:

```sql
-- Example: Products table
CREATE TABLE products (
  product_id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(shop_id),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  -- ... other fields
  UNIQUE(shop_id, sku) -- Unique within shop
);
```

### Key Tables

- **users** - User accounts
- **shops** - Shop/tenant data
- **branches** - Physical locations
- **warehouses** - Storage locations
- **products** - Product catalog
- **product_variants** - Product variations
- **stock** - Current stock levels
- **stock_movements** - Inventory transactions
- **sales_invoices** - Sales records
- **purchase_orders** - Purchase orders
- **customers** - Customer data
- **suppliers** - Supplier data

See full ERD in `/docs/database/erd.png`

---

## 🔒 Security Features

### Implemented Security Measures

1. **Authentication**
   - JWT with short-lived access tokens
   - Refresh token rotation
   - Password hashing with bcrypt (10 rounds)

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission checking middleware
   - Tenant isolation

3. **Input Validation**
   - Request validation with express-validator
   - SQL injection prevention (parameterized queries)
   - XSS protection (sanitized inputs)

4. **Rate Limiting**
   - API rate limiting (100 requests/15 min)
   - Login attempt limiting (5 attempts)
   - Account lockout on failed attempts

5. **Security Headers**
   - Helmet.js security headers
   - CORS configuration
   - HTTPS enforcement in production

6. **Data Protection**
   - Sensitive data encryption at rest
   - Password reset token expiration
   - Audit logging

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🧪 Testing

### Test Coverage

- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints
- **E2E Tests**: Complete user workflows

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- products.test.ts
```

### Test Database

Tests use separate test database:
```env
DB_NAME=hardware_pos_test
```

---

## 📈 Performance Optimization

### Implemented Optimizations

1. **Database**
   - Proper indexing on foreign keys
   - Query optimization
   - Connection pooling
   - Prepared statements

2. **Caching**
   - Redis caching for frequently accessed data
   - Product catalog caching
   - Session storage in Redis

3. **API**
   - Response compression (gzip)
   - Pagination for large datasets
   - Selective field returning
   - ETags for conditional requests

4. **Background Jobs**
   - Async processing with Bull queue
   - Email sending in background
   - Report generation offline

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t hardware-pos-api .

# Run container
docker run -p 3000:3000 --env-file .env.production hardware-pos-api
```

### Docker Compose

```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure HTTPS
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Set up logging (CloudWatch, Loggly)
- [ ] Configure rate limiting
- [ ] Enable CORS for frontend domain only
- [ ] Set up CI/CD pipeline
- [ ] Performance monitoring (New Relic, DataDog)

---

## 📊 Monitoring & Logging

### Winston Logger

```typescript
import logger from '@/utils/logger';

logger.info('User logged in', { userId, email });
logger.error('Payment failed', { error, orderId });
logger.warn('Low stock alert', { productId, quantity });
```

### Log Levels

- **error** - Error conditions
- **warn** - Warning conditions
- **info** - Informational messages
- **http** - HTTP requests
- **debug** - Debug messages

### Log Files

- **combined.log** - All logs
- **error.log** - Error logs only
- **http.log** - HTTP request logs

---

## 🔄 Background Jobs

### Scheduled Tasks

```typescript
// Daily summary report (8 AM)
schedule('0 8 * * *', sendDailySummary);

// Low stock alerts (Every 6 hours)
schedule('0 */6 * * *', checkLowStock);

// Database backup (Daily at 2 AM)
schedule('0 2 * * *', backupDatabase);

// Cleanup expired sessions (Hourly)
schedule('0 * * * *', cleanupSessions);
```

---

## 📖 API Documentation

Auto-generated API documentation available at:

```
http://localhost:3000/api-docs
```

Using Swagger/OpenAPI specification.

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/feature-name`
2. Write code following coding standards
3. Write tests (minimum 80% coverage)
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Commit with conventional commit message
7. Push and create pull request

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests written and passing
- [ ] No console.logs
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Security considered
- [ ] Performance optimized

---

### Getting Help

- **Technical Issues**: Create
