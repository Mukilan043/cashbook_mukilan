# Cash Book Application

A full-stack web application for managing cash inflow and outflow with user authentication, multiple cashbooks, balance tracking, transaction history, and PDF report generation.

## Features

- **User Authentication**: Sign up and login with email, mobile, and username
- **Guest Access**: Visitors can view the app before signing up
- **Multiple Cashbooks**: Create and manage multiple cashbooks per user
- **Cash Inflow/Outflow**: Record transactions via sidebar forms
- **View & Manage**: View all transactions, edit or delete entries
- **View History**: Chronological view of transactions grouped by date with running balance
- **Generate Report**: Export PDF reports with summary and transaction details
- **Balance Tracking**: Real-time balance calculation (Total Inflow - Total Outflow)
- **Sorting**: Sort transactions by date, amount, description, or type
- **Mobile Responsive**: Fully responsive design for mobile, tablet, and desktop
- **Offline (PWA)**: Installable app that can reload offline after first load, with cached viewing of previously loaded cashbooks/transactions

## Tech Stack

### Backend
- Node.js with Express.js
- SQLite database
- JWT authentication
- PDFKit for PDF generation
- bcryptjs for password hashing

### Frontend
- React with React Router
- Tailwind CSS for styling
- Axios for API calls
- date-fns for date formatting
- Context API for state management

## Project Structure

```
cash-book-app/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── cashbooks.js       # Cashbook CRUD routes
│   │   └── transactions.js    # Transaction CRUD routes
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   ├── cashbookController.js  # Cashbook logic
│   │   └── transactionController.js  # Transaction logic
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── database/
│   │   └── db.js              # SQLite setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app component
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── components/        # React components
│   │   ├── services/
│   │   │   └── api.js         # API service
│   │   └── index.jsx
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set environment variables:
```bash
# Create .env file
JWT_SECRET=your-secret-key-here
PORT=5000
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create `.env` file for API URL:
```bash
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

5. Build for production:
```bash
npm run build
```

### Offline / PWA

- The frontend is installable as a PWA (Add to Home Screen / Install App).
- Offline works best in production build/preview (service worker is generated on build).
- Offline mode supports **viewing previously loaded data** (cashbooks/transactions/balance). Creating/updating still needs the backend.

To test offline locally:
```bash
cd frontend
npm run build
npm run preview -- --host
```
Open the preview URL, login and open a cashbook once (to cache), then go Offline in your browser and reload.

## Database

The application uses SQLite database stored in `backend/database/cashbook.db`. The database is automatically created on first run with the following tables:

- **users**: User accounts (username, email, mobile, password)
- **cashbooks**: User cashbooks (name, description, user_id)
- **transactions**: Transactions (type, amount, description, date, cashbook_id)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Cashbooks
- `GET /api/cashbooks` - Get all cashbooks for user (requires auth)
- `GET /api/cashbooks/:id` - Get single cashbook (requires auth)
- `POST /api/cashbooks` - Create new cashbook (requires auth)
- `PUT /api/cashbooks/:id` - Update cashbook (requires auth)
- `DELETE /api/cashbooks/:id` - Delete cashbook (requires auth)

### Transactions
- `GET /api/transactions/cashbook/:cashbookId` - Get all transactions (requires auth)
- `GET /api/transactions/cashbook/:cashbookId/:id` - Get single transaction (requires auth)
- `POST /api/transactions/cashbook/:cashbookId` - Create transaction (requires auth)
- `PUT /api/transactions/cashbook/:cashbookId/:id` - Update transaction (requires auth)
- `DELETE /api/transactions/cashbook/:cashbookId/:id` - Delete transaction (requires auth)
- `GET /api/transactions/cashbook/:cashbookId/balance` - Get balance (requires auth)
- `GET /api/transactions/cashbook/:cashbookId/reports/generate` - Generate PDF (requires auth)

## Usage

### For First-Time Users

1. **Visit the app** - You'll see the guest view
2. **Sign Up** - Click "Sign Up" and provide:
   - Username
   - Email
   - Mobile number
   - Password (min 6 characters)
3. **Login** - After signup, you'll be automatically logged in

### For Existing Users

1. **Login** - Use your email and password
2. **Create Cashbook** - Click "Add New Cashbook" on the home page
3. **Select Cashbook** - Choose a cashbook from the dropdown
4. **Add Transactions**:
   - Click "Cash Inflow" or "Cash Outflow" buttons
   - Sidebar opens on the right (mobile: full screen)
   - Fill in amount, description (optional), and date
   - Submit
5. **Manage Transactions**:
   - Click "View Manage" to see all transactions
   - Edit or delete transactions
   - Use search and filters
   - Sort by date, amount, description, or type
6. **View History**:
   - Click "View History" for chronological view
   - See running balance for each transaction
   - Filter by type and sort options
7. **Generate Reports**:
   - Navigate to report page
   - Select date range and type filter
   - Generate and download PDF

### User Profile

- Click "Profile" button to view:
  - Your credentials (username, email, mobile)
  - All your cashbooks
  - Logout option

## Deployment

### Backend Deployment

1. Set environment variables on your server:
   - `JWT_SECRET` - A secure random string
   - `PORT` - Server port (default: 5000)

2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start backend/server.js --name cashbook-api
```

### Frontend Deployment

1. Build the production version:
```bash
cd frontend
npm run build
```

2. The `dist` folder contains the production build

3. Serve with a web server (nginx, Apache, or serve):
```bash
npm install -g serve
serve -s dist
```

4. Update `VITE_API_URL` in `.env` to point to your backend server

## Notes

- All amounts must be positive numbers
- Date is required for all transactions
- Description is optional
- Balance is calculated as: Total Inflow - Total Outflow
- PDF reports include summary and detailed transaction list
- JWT tokens expire after 7 days
- Passwords are hashed using bcrypt
- Each user can have multiple cashbooks
- Transactions are scoped to specific cashbooks

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- SQL injection protection via parameterized queries
- CORS enabled for frontend-backend communication
- Input validation on both frontend and backend

## Troubleshooting

- **Database errors**: Delete `backend/database/cashbook.db` to reset
- **Authentication issues**: Clear browser localStorage
- **CORS errors**: Ensure backend CORS is configured correctly
- **Port conflicts**: Change PORT in backend or frontend config
