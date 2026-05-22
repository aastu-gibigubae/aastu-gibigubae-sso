# AASTU GibiGubae SSO - Internal Documentation
**Version: 1.0.0 (Initial Internal Release)**

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Documentation](#architecture-documentation)
3. [API Documentation](#api-documentation)
4. [Authentication System](#authentication-system)
5. [Database Layer](#database-layer)
6. [Setup Instructions](#setup-instructions)
7. [Development Workflow](#development-workflow)
8. [Versioning](#versioning)

---

## Project Overview

### Purpose
AASTU GibiGubae SSO is an internal backend authentication and user management service built for the AASTU GibiGubae platform. It provides a comprehensive Single Sign-On (SSO) system with role-based access control, token management, and audit logging capabilities.

### Project Type
- **Backend API Service** - Node.js + Express.js with TypeScript
- **Authentication Provider** - JWT-based token authentication
- **User Management** - Complete user lifecycle management
- **Audit System** - Comprehensive activity logging

### Key Technologies
- **Runtime**: Node.js (ES Module support)
- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Vitest + Supertest
- **Security**: Helmet, CORS, bcrypt
- **Email**: Nodemailer (SMTP-based)

---

## Architecture Documentation

### Folder Structure

```
src/
├── modules/              # Feature modules (authentication, users)
│   ├── auth/            # Authentication module
│   │   ├── auth.controller.ts     # Route handlers
│   │   ├── auth.route.ts          # Route definitions
│   │   └── auth.schema.ts         # Zod validation schemas
│   └── users/           # User management module
│       ├── users.controller.ts    # Route handlers
│       ├── users.route.ts         # Route definitions
│       └── users.schema.ts        # Zod validation schemas
├── middlewares/         # Express middleware
│   ├── authenticate.middleware.ts # JWT verification & RBAC
│   └── error.middleware.ts        # Global error handling
├── services/            # Business logic layer
│   ├── token.service.ts           # Token generation/verification
│   ├── audit.service.ts           # Activity logging
│   ├── error.service.ts           # Error handling utilities
│   └── db.select/       # Database query utilities
│       └── user.select.ts         # User-specific selectors
├── config/              # Configuration management
│   ├── config.ts        # Environment variable validation
│   ├── cookie.option.ts # Cookie settings
│   └── db.ts            # Prisma client initialization
├── generated/           # Prisma client (auto-generated)
├── templates/           # Email templates
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── tests/               # Test suites

prisma/
├── schema.prisma        # Data model definitions
└── migrations/          # Migration history
```

### Architecture Principles

1. **Modular Design**
   - Each module (auth, users) is self-contained with its own controller, routes, and schemas
   - Services are decoupled from controllers for reusability

2. **Separation of Concerns**
   - Controllers: Handle HTTP requests/responses
   - Services: Contain business logic
   - Middlewares: Cross-cutting concerns (auth, error handling)
   - Database layer: Isolated through Prisma

3. **Service-Driven Architecture**
   - Core services (token, audit, error) are centralized and reusable
   - Database interactions flow through Prisma client
   - Validation happens at schema layer (Zod)

4. **Request Lifecycle**
   ```
   HTTP Request
      ↓
   Route Handler (express.Router)
      ↓
   Middleware (authenticate, authorize)
      ↓
   Controller (request validation, orchestration)
      ↓
   Service Layer (business logic, database calls)
      ↓
   Prisma ORM (database operations)
      ↓
   HTTP Response
   ```

---

## API Documentation

### Base URL
```
http://localhost:{PORT}/api/v1
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer {ACCESS_TOKEN}
```

---

### Auth Module
**Endpoint Prefix**: `/auth`

| Method | Endpoint | Description | Protected | Request Body |
|--------|----------|-------------|-----------|--------------|
| POST | `/register` | Create new user account | No | firstName, fatherName, email, phoneNumber, password, passwordConfirm, studentId, admissionYear, department, gender |
| POST | `/login` | Authenticate user | No | phoneNumber, password, rememberMe (optional) |
| POST | `/refresh` | Refresh access token | No | Refresh token from cookies |
| POST | `/verify-email` | Verify user email | No | token (from email link) |
| POST | `/password-reset/request` | Request password reset | No | email |
| POST | `/password-reset/verify` | Verify and reset password | No | token, newPassword, passwordConfirm |
| PATCH | `/update-password` | Update password (authenticated) | **Yes** | oldPassword, newPassword, passwordConfirm |

#### Auth Response Format
**Register Success Response** (201):
```json
{
  "success": true,
  "message": "Register successful",
  "data": {
    "id": "user_id",
    "firstName": "John",
    "phoneNumber": "+251900000000",
    "role": "user",
    "department": "softwareEngineering"
  },
  "accessToken": "eyJhbGc..."
}
```

**Login Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user_id",
    "firstName": "John",
    "phoneNumber": "+251900000000",
    "role": "user"
  },
  "accessToken": "eyJhbGc..."
}
```

**Refresh Token Response** (200):
```json
{
  "success": true,
  "message": "Access token generated successfully",
  "accessToken": "eyJhbGc..."
}
```

**Email Verification Response** (200):
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": { ... },
  "accessToken": "eyJhbGc..."
}
```

**Password Reset Request Response** (201):
```json
{
  "success": true,
  "message": "Password reset instructions sent to your email"
}
```

**Password Reset Verify Response** (201):
```json
{
  "success": true,
  "message": "Password has been reset successfully.",
  "data": { ... },
  "accessToken": "eyJhbGc..."
}
```

**Update Password Response** (200):
```json
{
  "success": true,
  "message": "Password updated successful"
}
```

---

### Users Module
**Endpoint Prefix**: `/users`

| Method | Endpoint | Description | Protected | Required Roles/Permissions |
|--------|----------|-------------|-----------|---------------------------|
| GET | `/me` | Get current user profile | **Yes** | None |
| GET | `/` | Get all users (paginated) | **Yes** | admin, subAdmin with "SEE-USERS" permission |
| PATCH | `/update-profile` | Update user profile | **Yes** | None |
| PATCH | `/update-email` | Update user email | **Yes** | None |

#### Users Response Format
**Get Me Response** (200):
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": "user_id",
    "firstName": "John",
    "fatherName": "Ahmed",
    "email": "john@example.com",
    "phoneNumber": "+251900000000",
    "studentId": "STU001",
    "role": "user",
    "department": "softwareEngineering",
    "admissionYear": 2021,
    "isEmailVerified": true
  }
}
```

**Get All Users Response** (200):
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "user_id",
      "firstName": "John",
      "email": "john@example.com",
      "role": "user"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

**Update Profile Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ... }
}
```

**Update Email Response** (200):
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": { ... }
}
```

---

## Authentication System

### Authentication Flow

#### 1. User Registration → Login → Token Generation
```
User Registration
    ↓ (Create account, hash password)
    ↓
User Login (phone + password)
    ↓ (Verify credentials)
    ↓
Generate Tokens:
  - ACCESS_TOKEN (short-lived, 15min)
  - REFRESH_TOKEN (long-lived, 7d or 30d with rememberMe)
    ↓
Return tokens to client
    ↓
Client stores REFRESH_TOKEN in secure HTTP-only cookie
    ↓
Client uses ACCESS_TOKEN in Authorization header
```

#### 2. Protected Request Handling
```
Client Request (with Bearer token)
    ↓
authenticate middleware
    ↓ (Extract token from Authorization header)
    ↓
tokenService.verifySecurityToken()
    ↓ (Verify JWT signature with public key)
    ↓
Extract userId and check token type (ACCESS_TOKEN)
    ↓
Fetch user from database
    ↓
Attach user context to req.user
    ↓
Pass to controller/route
```

#### 3. Authorization (Role-Based Access Control)
```
Protected Request
    ↓
authenticate middleware (verify token, get user)
    ↓
authorizeRoles middleware (check user.role)
    ↓
authorizePermissions middleware (check user.permissions array)
    ↓
Allow/Deny access
```

### Token Management

#### Token Types & Secrets
| Token Type | Purpose | Secret | Expiry | HttpOnly | Secure |
|------------|---------|--------|--------|----------|--------|
| ACCESS_TOKEN | API authentication | JWT_PRIVATE_KEY | 15 minutes | N/A | N/A |
| REFRESH_TOKEN | Generate new access tokens | JWT_PRIVATE_KEY | 7-30 days | **Yes** | **Yes** |
| EMAIL_TOKEN | Email verification | EMAIL_TOKEN_SECRET | 24 hours | N/A | N/A |
| PASSWORD_TOKEN | Password reset | PASSWORD_TOKEN_SECRET | 1 hour | N/A | N/A |

#### Token Service Methods
```typescript
tokenService.generateSecurityToken(payload, options)    // ACCESS/REFRESH tokens
tokenService.generateEmailVerifyToken(payload, options) // Email verification
tokenService.generatePasswordResetToken(payload, options) // Password reset
tokenService.verifySecurityToken(token)                 // Verify JWT
tokenService.verifyEmailToken(token)                    // Verify email token
tokenService.verifyPasswordToken(token)                 // Verify password token
tokenService.generateHashToken(token)                   // Create hash (for storage)
```

### Roles & Permissions

#### User Roles
| Role | Description | Capabilities |
|------|-------------|--------------|
| `user` | Regular user | Can view own profile, update own data |
| `subAdmin` | Sub-administrator | Can manage users with appropriate permissions |
| `admin` | Full administrator | Full system access |

#### Permission System
- Permissions are stored as a string array: `["SEE-USERS", "CREATE-USER", ...]`
- Admins bypass permission checks (have all permissions implicitly)
- SubAdmins require explicit permissions for restricted actions

---

## Database Layer

### Database Technology
- **Provider**: PostgreSQL
- **ORM**: Prisma v7.8.0
- **Client Location**: `src/generated/prisma/`
- **Schema Location**: `prisma/schema.prisma`

### Data Models

#### User Model
```prisma
model User {
  id                    String     @id @default(cuid())
  firstName             String
  fatherName            String
  grandFatherName       String?
  email                 String?
  christianName         String?
  phoneNumber           String     @unique      // Primary login identifier
  passwordHash          String     // bcrypt hashed
  role                  Role       // user | subAdmin | admin
  permissions           String[]   @default([]) // Fine-grained access control
  gender                Gender     // male | female
  admissionYear         Int
  studentId             String
  isAccountVerified     Boolean    @default(false)
  isEmailVerified       Boolean    @default(false)
  dormitoryBlock        String?
  dormitoryNumber       String?
  department            Department // 15 engineering departments + other
  loginAttempts         Int        @default(0)  // For account lockout
  lastLoginAt           DateTime?
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  // Relations
  actedLogs             AuditLog[] @relation("ActorRelation")
  receivedLogs          AuditLog[] @relation("TargetRelation")
  refreshTokens         RefreshToken[]
}
```

#### AuditLog Model
Complete activity tracking for compliance and debugging:
```prisma
model AuditLog {
  id                String   @id @default(cuid())
  
  // Actor (who performed the action)
  actorId           String?
  actorRole         Role?
  actorEmail        String?
  actorPhoneNumber  String?
  actorFirstName    String?
  actorFatherName   String?
  actorStudentId    String?
  
  // Target (who was affected)
  targetId          String?
  targetRole        Role?
  targetFirstName   String?
  targetFatherName  String?
  targetEmail       String?
  targetPhoneNumber String?
  targetStudentId   String?
  
  // Action details
  action            String   // "LOGIN", "REGISTER", "UPDATE_PROFILE", etc.
  changes           Json?    // Before/after values
  
  // Context
  deviceInfo        String?
  ipAddress         String?
  createdAt         DateTime @default(now())

  // Relations
  actor             User? @relation("ActorRelation", fields: [actorId], references: [id], onDelete: SetNull)
  target            User? @relation("TargetRelation", fields: [targetId], references: [id], onDelete: SetNull)
}
```

#### RefreshToken Model
```prisma
model RefreshToken {
  id                String   @id @default(cuid())
  token             String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId            String
  expiresAt         DateTime
  createdAt         DateTime @default(now())
}
```

### Enums

#### Role
```
user | subAdmin | admin
```

#### Gender
```
male | female
```

#### Department
```
architecture
chemicalEngineering
civilEngineering
electricalAndComputerEngineering
electromechanicalEngineering
environmentalEngineering
mechanicalEngineering
miningEngineering
softwareEngineering
biotechnology
foodScienceAndAppliedNutrition
geology
industrialChemistry
postgraduate
other
```

### Database Interactions

#### Service Layer Integration
```typescript
// Example: User service interaction
const user = await prisma.user.findUnique({
  where: { phoneNumber },
  select: userSafeSelect // Excludes sensitive data
});

// With audit logging
await createAuditLog({
  actorId: req.user.id,
  targetId: user.id,
  action: "LOGIN_SUCCESS",
  ipAddress: req.ip,
  // ... additional context
});
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ with ES Module support
- PostgreSQL 12+ database
- npm or yarn package manager
- Git for version control

### Installation Steps

#### 1. Clone Repository & Install Dependencies
```bash
git clone <repository-url>
cd aastu-gibigubae-sso
npm install
```

#### 2. Environment Configuration
Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aastu_sso"

# JWT Configuration
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Token Expiration
ACCESS_TOKEN_EXPIRATION="15m"
REFRESH_TOKEN_EXPIRATION="7d"
REFRESH_TOKEN_EXPIRATION_REMEMBER_ME="30d"
EMAIL_VERIFICATION_EXPIRY="24h"
PASSWORD_RESET_TOKEN_EXPIRY="1h"

# Token Secrets (different from JWT keys for additional security)
EMAIL_TOKEN_SECRET="your-secret-key-for-email-tokens"
PASSWORD_TOKEN_SECRET="your-secret-key-for-password-tokens"

# Email Configuration (SMTP)
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="587"
EMAIL_SMTP_USER="your-email@gmail.com"
EMAIL_SMTP_PASS="your-app-password"
EMAIL_FROM_NAME="GibiGubae Support"

# Server
PORT=3000
NODE_ENV="development"
```

#### 3. Generate JWT Keys (One-time setup)
```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Format for .env (escape newlines)
cat private.pem | sed 's/$/\\n/' | tr -d '\n' > private_key_formatted.txt
cat public.pem | sed 's/$/\\n/' | tr -d '\n' > public_key_formatted.txt
```

#### 4. Database Setup
```bash
# Create migrations (if schema changed)
npm run db:migrate

# Or push schema directly (development only)
npm run db:push

# Generate Prisma Client
npm run db:generate

# Open Prisma Studio for visual data management
npm run db:studio
```

#### 5. Verify Installation
```bash
npm run build    # Compile TypeScript
npm test         # Run tests
npm run dev      # Start development server
```

### Development Workflow

#### Start Development Server
```bash
npm run dev
```
- Runs with `tsx` for live reload
- Watches for file changes
- Server starts on `http://localhost:3000`

#### Run Tests
```bash
npm test
# or
npm run test -- --watch  # Watch mode
npm run test -- --coverage  # With coverage report
```

#### Build for Production
```bash
npm run build
```
- Compiles TypeScript to `dist/` directory
- Ready for deployment

#### Database Commands
```bash
npm run db:migrate      # Create new migrations
npm run db:push         # Push schema without migrations
npm run db:generate     # Regenerate Prisma client
npm run db:studio       # Open visual database manager
npm run db:reset        # ⚠️ Reset database (dev only, data loss!)
```

### Production Deployment Checklist
- [ ] Set `NODE_ENV=production` in environment
- [ ] Use strong JWT keys (minimum 2048-bit RSA)
- [ ] Configure production database with backups
- [ ] Enable HTTPS/TLS for all connections
- [ ] Set secure cookie flags (`Secure`, `HttpOnly`, `SameSite`)
- [ ] Configure rate limiting for auth endpoints
- [ ] Enable CORS only for trusted domains
- [ ] Set up log aggregation and monitoring
- [ ] Run database migrations before deployment
- [ ] Test token refresh flow under load

---

## Development Workflow

### Project Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Run production build |
| `npm test` | Run Vitest test suite |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run db:migrate` | Create new database migrations |
| `npm run db:push` | Push schema changes without migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio (UI for database) |
| `npm run db:reset` | Reset database and migrations (dev only) |

### Test Structure

Tests use **Vitest** + **Supertest** for integration testing:

```
src/tests/
├── integration/
│   ├── auth/
│   │   ├── register.test.ts
│   │   ├── login.test.ts
│   │   ├── refresh.test.ts
│   │   ├── verifyEmail.test.ts
│   │   ├── passwordReset.test.ts
│   │   ├── passwordVerify.test.ts
│   │   └── updatePassword.test.ts
│   └── users/
│       ├── getMe.test.ts
│       ├── getAll.test.ts
│       ├── updateProfile.test.ts
│       └── updateEmail.test.ts
```

### Common Development Tasks

#### Adding a New Endpoint
1. Create/update route in `modules/{name}/{name}.route.ts`
2. Add handler in `modules/{name}/{name}.controller.ts`
3. Add Zod schema in `modules/{name}/{name}.schema.ts`
4. Add database operations in appropriate service
5. Write tests in `src/tests/integration/`
6. Add endpoint to API documentation

#### Modifying Database Schema
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` and name the migration
3. Review generated migration in `prisma/migrations/`
4. Run `npm run db:push` to apply to dev database
5. Update type definitions if needed
6. Test changes locally

#### Adding a New Service
1. Create service file in `src/services/`
2. Export singleton instance
3. Use in controllers via import
4. Add unit/integration tests

---

## Versioning

### Current Version: 1.0.0

**Release Date**: May 22, 2026  
**Status**: Initial Internal Release (Stable)

### Version Semantics
- **Major.Minor.Patch** (e.g., 1.0.0)
- **Major**: Breaking API changes, major features
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, security patches

### v1.0.0 Changelog

#### Initial Features
- ✅ User registration with email verification
- ✅ Phone number-based login authentication
- ✅ JWT-based access token system
- ✅ Refresh token with "Remember Me" option
- ✅ Password reset via email link
- ✅ Password update for authenticated users
- ✅ Email verification workflow
- ✅ User profile management
- ✅ Email update with verification

#### Infrastructure
- ✅ Express.js server setup with middleware stack
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Cookie-based secure token storage
- ✅ Global error handling middleware
- ✅ Request validation with Zod schemas

#### Authentication & Authorization
- ✅ Bearer token authentication middleware
- ✅ Role-based access control (RBAC)
- ✅ Permission-based authorization
- ✅ Token type validation
- ✅ Automatic logout on invalid tokens

#### Database
- ✅ PostgreSQL integration via Prisma
- ✅ User model with comprehensive fields
- ✅ Audit logging for all actions
- ✅ Refresh token tracking
- ✅ Role and permission management
- ✅ Department enumeration for AASTU structure

#### Additional Features
- ✅ Audit trail for security and compliance
- ✅ Login attempt tracking
- ✅ Last login timestamp
- ✅ Account verification flags
- ✅ Email notification system
- ✅ Environment variable validation

#### Testing
- ✅ Vitest integration testing framework
- ✅ Supertest for HTTP assertions
- ✅ Comprehensive auth endpoint tests
- ✅ User endpoint tests
- ✅ Integration test coverage

### Known Limitations (v1.0.0)
- Email delivery requires SMTP configuration
- Password reset via email only (no SMS)
- No Two-Factor Authentication (2FA)
- No social login integrations
- Manual rate limiting configuration required




---

## Support & Maintenance

### Common Issues

**Issue**: "Authentication required" on protected endpoint
- **Solution**: Verify Bearer token is present in Authorization header
- **Verify**: `Authorization: Bearer {token}` format is correct
- **Check**: Token hasn't expired (use refresh endpoint)

**Issue**: Database connection fails
- **Solution**: Check `DATABASE_URL` in `.env` file
- **Verify**: PostgreSQL server is running
- **Check**: Credentials and hostname are correct

**Issue**: Email not sending
- **Solution**: Verify SMTP configuration in `.env`
- **Verify**: SMTP credentials are correct
- **Check**: App-specific password for Gmail (if using Gmail)

### Contact
For internal issues, contact the AASTU GibiGubae backend team.

---

**Document Version**: 1.0.0  
**Last Updated**: May 22, 2026  
**Internal Use Only**
