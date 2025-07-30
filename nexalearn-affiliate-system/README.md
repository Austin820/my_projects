# NexaLearn Affiliate System

A complete full-stack affiliate marketing system built with Node.js, Express, SQLite, and Bootstrap. This system allows teachers to refer students and earn commissions, with full admin oversight.

## 🚀 Features

### Teacher Portal
- **Account Management**: Signup, login, and profile management
- **Referral System**: Generate unique referral links and track referrals
- **Commission Tracking**: Real-time tracking of earnings and credits
- **Credit Redemption**: Request payouts via multiple payment methods
- **Dashboard Analytics**: View referral statistics and performance

### Student Portal
- **Account Registration**: Signup with optional referral codes
- **Referral Integration**: Automatic credit assignment to referring teachers
- **Profile Management**: Manage personal information and view referral status

### Admin Portal
- **System Overview**: Dashboard with key metrics and statistics
- **Teacher Management**: View all teachers and their performance
- **Redemption Management**: Approve or reject credit redemption requests
- **Analytics**: Track top performers and system-wide statistics

## 🏗️ Project Structure

```
nexalearn-affiliate-system/
├── backend/                    # Node.js Express Server
│   ├── routes/                # API route handlers
│   │   ├── teacherRoutes.js   # Teacher API endpoints
│   │   ├── studentRoutes.js   # Student API endpoints
│   │   └── adminRoutes.js     # Admin API endpoints
│   ├── db/                    # Database files
│   │   ├── init.sql          # Database schema
│   │   └── database.db       # SQLite database (generated)
│   ├── server.js             # Main server file
│   └── package.json          # Dependencies and scripts
├── frontend/                  # Frontend web application
│   ├── public/               # HTML pages
│   │   ├── teacher-login.html
│   │   ├── teacher-signup.html
│   │   ├── teacher-dashboard.html
│   │   ├── student-login.html
│   │   ├── student-signup.html
│   │   ├── admin-login.html
│   │   ├── admin-signup.html
│   │   └── admin-dashboard.html
│   ├── scripts/              # JavaScript files
│   │   ├── teacher-login.js
│   │   ├── teacher-signup.js
│   │   ├── teacher-dashboard.js
│   │   ├── student-login.js
│   │   ├── student-signup.js
│   │   ├── admin-login.js
│   │   ├── admin-signup.js
│   │   └── admin-dashboard.js
│   └── styles/
│       └── styles.css        # Custom CSS styles
└── README.md                 # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager
- SQLite3 (for database management, optional)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd nexalearn-affiliate-system/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   ```bash
   npm run init-db
   ```
   Or manually:
   ```bash
   sqlite3 db/database.db < db/init.sql
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

The backend server will start on `http://localhost:3000`

### Frontend Setup

The frontend is a static web application that can be served in multiple ways:

1. **Using the backend server** (Recommended):
   The backend automatically serves the frontend files. Access the application at:
   ```
   http://localhost:3000
   ```

2. **Using a local web server**:
   ```bash
   cd nexalearn-affiliate-system/frontend
   python -m http.server 8080
   ```
   Then access at `http://localhost:8080`

3. **Using Live Server extension** in VS Code or similar IDE

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Teacher Endpoints

#### POST `/teacher/signup`
Create a new teacher account.
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "phone": "string" // optional
}
```

#### POST `/teacher/login`
Authenticate teacher and get JWT token.
```json
{
  "username": "string",
  "password": "string"
}
```

#### GET `/teacher/dashboard`
Get teacher dashboard data (requires authentication).
```json
{
  "success": true,
  "data": {
    "teacher": {...},
    "referrals": [...],
    "redemptions": [...],
    "referral_link": "string"
  }
}
```

#### POST `/teacher/redeem`
Request credit redemption (requires authentication).
```json
{
  "amount": "number",
  "payment_method": "string",
  "payment_details": "string"
}
```

### Student Endpoints

#### POST `/student/signup`
Create a new student account.
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string",
  "phone": "string", // optional
  "referral_code": "string" // optional
}
```

#### POST `/student/login`
Authenticate student and get JWT token.
```json
{
  "username": "string",
  "password": "string"
}
```

### Admin Endpoints

#### POST `/admin/signup`
Create a new admin account.
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```

#### POST `/admin/login`
Authenticate admin and get JWT token.
```json
{
  "username": "string",
  "password": "string"
}
```

#### GET `/admin/dashboard`
Get admin dashboard data (requires admin authentication).

#### POST `/admin/approve-redemption`
Approve or reject a redemption request (requires admin authentication).
```json
{
  "redemption_id": "number",
  "action": "approve|reject",
  "notes": "string" // optional
}
```

## 🗄️ Database Schema

### Tables

1. **Teachers**
   - `id` (Primary Key)
   - `username` (Unique)
   - `email` (Unique)
   - `password` (Hashed)
   - `full_name`
   - `phone`
   - `credits` (Decimal)
   - `total_referrals` (Integer)
   - `created_at`, `updated_at`

2. **Students**
   - `id` (Primary Key)
   - `username` (Unique)
   - `email` (Unique)
   - `password` (Hashed)
   - `full_name`
   - `phone`
   - `referred_by` (Foreign Key to Teachers)
   - `referral_code` (Unique)
   - `created_at`, `updated_at`

3. **Admins**
   - `id` (Primary Key)
   - `username` (Unique)
   - `email` (Unique)
   - `password` (Hashed)
   - `full_name`
   - `role`
   - `created_at`, `updated_at`

4. **Referrals**
   - `id` (Primary Key)
   - `teacher_id` (Foreign Key)
   - `student_id` (Foreign Key)
   - `referral_code`
   - `commission_amount` (Default: $50.00)
   - `status` (Default: 'active')
   - `created_at`

5. **CreditRedemptions**
   - `id` (Primary Key)
   - `teacher_id` (Foreign Key)
   - `amount`
   - `payment_method`
   - `payment_details`
   - `status` (pending/approved/rejected)
   - `requested_at`, `approved_at`
   - `approved_by` (Foreign Key to Admins)
   - `notes`

## 🎯 How It Works

### Referral System
1. **Teacher Registration**: Teachers sign up and get access to a unique referral link
2. **Student Referral**: Students sign up using the teacher's referral code/link
3. **Commission**: Teacher automatically receives $50 credit for each successful referral
4. **Tracking**: Both parties can track the referral relationship and status

### Credit System
1. **Earning**: Teachers earn credits through successful student referrals
2. **Redemption**: Teachers can request to redeem credits via multiple payment methods
3. **Approval**: Admins review and approve/reject redemption requests
4. **Processing**: Approved redemptions are processed and credits are deducted

### Admin Management
1. **Overview**: Admins can see system-wide statistics and performance metrics
2. **Monitoring**: Track all teachers, students, and referral activities
3. **Control**: Approve or reject credit redemption requests with notes
4. **Analytics**: View top-performing teachers and system trends

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Configuration
The application uses SQLite by default. To use a different database:
1. Install the appropriate database driver
2. Update the connection configuration in `server.js`
3. Modify the SQL queries to match your database syntax

## 🚀 Deployment

### Backend Deployment
1. Set environment variables for production
2. Install dependencies: `npm install --production`
3. Initialize database: `npm run init-db`
4. Start server: `npm start`

### Frontend Deployment
The frontend can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3
- GitHub Pages
- Or served by the backend

Update the `API_BASE` constant in JavaScript files to point to your production backend URL.

## 🧪 Testing

### Manual Testing
1. **Start the backend server**
2. **Open the frontend** in a web browser
3. **Test the user flows**:
   - Teacher signup/login
   - Student signup with referral
   - Admin dashboard operations
   - Credit redemption process

### API Testing with Postman
Import the API endpoints into Postman or use curl commands:

```bash
# Health check
curl http://localhost:3000/health

# Teacher signup
curl -X POST http://localhost:3000/api/teacher/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testteacher","email":"test@teacher.com","password":"password123","full_name":"Test Teacher"}'

# Teacher login
curl -X POST http://localhost:3000/api/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testteacher","password":"password123"}'
```

## 💡 Features & Highlights

### Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Bootstrap 5**: Modern, clean interface with gradient themes
- **Interactive Elements**: Smooth animations and transitions
- **Real-time Updates**: Auto-refresh dashboards and live data updates

### Security Features
- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation with express-validator
- **SQL Injection Protection**: Parameterized queries

### Performance
- **Efficient Database Design**: Optimized queries and indexing
- **Caching**: Local storage for authentication and user data
- **Lazy Loading**: Data loaded on-demand for better performance

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to database"**
   - Ensure SQLite is installed
   - Check if database.db file exists in `/backend/db/`
   - Run `npm run init-db` to initialize the database

2. **"API calls failing"**
   - Verify backend server is running on port 3000
   - Check API_BASE URL in frontend JavaScript files
   - Ensure CORS is properly configured

3. **"Authentication errors"**
   - Clear browser localStorage
   - Check JWT token expiration
   - Verify correct credentials

### Development Tips
- Use browser developer tools to debug API calls
- Check server logs for detailed error messages
- Test API endpoints with Postman before frontend integration

## 📝 License

This project is created for educational and demonstration purposes. Feel free to use and modify as needed.

## 🤝 Contributing

This is a demonstration project. For production use, consider:
- Adding comprehensive unit tests
- Implementing rate limiting
- Adding email verification
- Enhanced security measures
- Database migrations system
- Logging and monitoring
- Error tracking (e.g., Sentry)

## 📞 Support

For questions or issues related to this demonstration project, please refer to the code comments and this documentation.