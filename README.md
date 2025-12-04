A Note-Taking Application - A note-taking web application with security features including user authentication, role-based access control, SQLi prevention, password hashing, and CSRF protection.


## Project Overview

This application allows users to create, read, update, and delete notes in a secure environment. It consists of industry-standard security practices that prevent common web security vulnerabilities. It supports two user roles: **Admin** (full access to all notes) and **User** (access only to their own notes), as well as users to change its passwords.

## Features and Security Objectives
### Core Functionality
- **User Registration & Login** 
- **Note Management** - Creation, editing, deleting, and searching of notes.
- **Role-Based Access** - Admin and User roles with different permissions.

### Security Features
- **SQL Injection Prevention** - Parameterized queries throughout the application.
- **Cross-Site Scripting (XSS) Protection** - DOMPurify sanitization and HTML escaping.
- **Cross-Site Request Forgery (CSRF) Protection** - Token-based validation on all state-changing operations.
- **Password Security** - bcryptjs hashing with 10 salt rounds.
- **Strong Password Policy** - Minimum 8 characters with uppercase, lowercase, number, and special character.
- **Rate Limiting** - Login (5/15min), Signup (3/hr), Password Change (5/hr).
- **Account Lockout** - 3 failed login attempts = 5 minute lockout and the time increases with additional failed attempts.
- **Session Management** - 3-minute inactivity timeout with client-side validation.
- **Input Validation**
- **Secure Session Handling** - CSRF tokens stored in sessionStorage.


## Project Structure
```
CA2_SWD/
├── backend/
│   ├── server.js          # Backend (Main server file containing authentication logic, CSRF protection, rate limiting, and all API endpoints)
│   ├── package.json       # Backend dependencies
│   └── notes.db           # SQLite database (auto-created by SQLite 3 as defined by the schema in the backend)
├── frontend/
│   ├── index.html         # Main notes interface
│   ├── login.html         # User login page
│   ├── signup.html        # User registration page
│   ├── account.html       # Password change page
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       ├── api.js         # Handles all HTTP requests with CSRF token injection
│       ├── app.js         # Main application logic including session timeout and note management
│       ├── login.js       # Login functionality
│       ├── signup.js      # SignUp functionality
│       └── account.js     # Password changing functionality
└── .gitignore             # Gitignore 
```

## Setup and Installation Instructions
### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- express, cors, sqlite3

### Backend Setup
1. Navigate to backend directory:
```bash
cd backend
```
2. Install dependencies:
```bash
npm install
npm install express cors sqlite3
```
3. Start the server:
```bash
npm start
```
The backend server will run on `http://localhost:5001`

### Frontend Setup
Using Live Server (VS Code Extension):**
- Install "Live Server" extension in VS Code
- Right-click `index.html` or any of the .html files (redirection to login page by default)→ "Open with Live Server"


## Usage Guidelines
### Registration
1. Navigate to signup.html
2. Enter username (3-30 alphanumeric characters, underscore, or hyphen)
3. Enter a valid email address
4. Create password meeting requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (!@#$%^&*...)
5. Retypre password
6. Click "Register"

### Login
1. Navigate to `login.html`
2. Enter your email and password
3. Click "Login"

**Default Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| admin@me.com | Admin@123 | admin |
| tom@me.com | Tom@pass123 | user |
| jerry@me.com | Jerry@pass123 | user |

### Creating Notes
1. After login, click "New Note" button
2. Enter note title
3. Enter note content 
4. Click "Save"

### Searching Notes
1. Enter search term in search bar
2. Click "Search"
3. Results show notes matching title or content

### Editing/Deleting Notes
- **Users**: Can only edit/delete their own notes
- **Admins**: Can edit/delete any note
- Click "Edit" button on note card to modify
- Click "Delete" button to remove (confirmation required)

### Session Management
- Sessions timeout after 3 minutes of inactivity
- Warning notification appears for 5 seconds before redirect
- CSRF tokens expire after 1 hour
- Manual logout available via "Logout" button


## Security Improvements
### Authentication & Authorization
1. **Password Hashing** - All passwords hashed with bcryptjs (10 salt rounds)
2. **Account Lockout** - Automatic 5-minute lock after 3 failed login attempts
3. **Role-Based Access Control** - Admin and User roles with permission checks on all operations
4. **Session Validation** - Server-side validation on every protected endpoint

### Attack Prevention
5. **CSRF Protection** - Cryptographic tokens (32 bytes) required for all state-changing operations
6. **SQL Injection Prevention** - Parameterized queries for all database operations
7. **XSS Protection** - DOMPurify sanitization and HTML escaping on all user input
8. **Rate Limiting** - IP-based throttling on authentication endpoints
9. **Input Validation** - Client and server-side validation with length restrictions

### Data Protection
10. **Input Sanitization** - All user input trimmed and length-limited
11. **Email Normalization** - Emails converted to lowercase for consistency
12. **Session Security** - CSRF tokens stored in sessionStorage (not localStorage)
13. **Inactivity Timeout** - Automatic logout after 3 minutes of inactivity


## Testing Process
### Manual Security Testing
**1. SQL Injection Test:**
- Try login with: `admin@me.com' OR '1'='1`
- Expected: Login fails, no SQL error exposed

**2. XSS Protection Test:**
- Create note with content: `<script>alert('XSS')</script>`
- Expected: Script tag not displayed/rendered, not executed

**3. Rate Limiting Test:**
- Attempt 6 login failures in 15 minutes
- Expected: Account locked after 3 attempts, rate limit after 5 attempts

**4. Session Timeout Test:**
- Login and remain inactive for 5 minutes
- Expected: Warning notification, then redirect to login


### Key Testing Findings
- ✅ SQL injection attempts blocked by parameterized queries
- ✅ XSS attacks prevented by DOMPurify sanitization
- ✅ Rate limiting stops brute force attempts
- ✅ Account lockout and session timeout protects against credential stuffing and unauthorized access
- ✅ Password policy enforces strong passwords
- ✅ CSRF tokens successfully prevent unauthorized requests

## Contributions and References
### Technologies Used
- **Backend:** Node.js, Express.js, SQLite3, bcryptjs
- **Frontend:** JavaScript, HTML5, CSS3
- **Security:** DOMPurify (XSS prevention), crypto module (CSRF tokens)

### Libraries and Frameworks
- [Express.js](https://expressjs.com/) - Web application framework
- [SQLite3](https://www.npmjs.com/package/sqlite3) - Database
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [CORS](https://www.npmjs.com/package/cors) - Cross-Origin Resource Sharing
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitization

### Security References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application security risks
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

## Quick Start Summary

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Start backend server
npm start

# 3. Use Live Server to view the .html files

# 4. Login with test account or create a user
```

## Security Summary

| Security Feature | Status | Implementation |
|-----------------|--------|----------------|
| CSRF Protection | ✅ | Token-based validation on all state-changing operations |
| SQL Injection Prevention | ✅ | Parameterized queries throughout |
| XSS Protection | ✅ | DOMPurify sanitization + HTML escaping |
| Password Hashing | ✅ | bcryptjs with 10 salt rounds |
| Rate Limiting | ✅ | IP-based throttling on endpoints |
| Account Lockout | ✅ | 3 failed attempts = 5 minute lock |
| Session Timeout | ✅ | 5 minutes inactivity |
| Password Policy | ✅ | Strong requirements enforced |
| Input Validation | ✅ | Client and server-side |
| Role-Based Access | ✅ | Admin and User roles |
