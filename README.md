# VisOra - Attendance Management System

VisOra is a comprehensive attendance management system designed for educational institutions. It provides role-based access for administrators, faculty, and students to manage and track attendance efficiently.

## Features

### Admin Features
- **User Management**: Add, update, and delete faculty and student accounts
- **Student Management**: Comprehensive student profile management
- **Faculty Management**: Faculty profile and role management
- **Year Promotion**: Promote students to the next academic year
- **Reports & Logs**: System-wide reporting and logging capabilities
- **Notifications**: Send notifications to users
- **Settings**: Configure system settings

### Faculty Features
- **Schedule Management**: Create and manage class schedules
- **Attendance Tracking**: Mark attendance manually or automatically
- **Profile Management**: Update personal information
- **Notifications**: Receive and manage notifications
- **Reports**: View attendance reports for assigned classes

### Student Features
- **Attendance History**: View personal attendance records
- **Schedule View**: Access class schedules
- **Profile Management**: Update personal information
- **Notifications**: Receive important announcements
- **Dashboard**: Overview of attendance statistics

## Tech Stack

### Frontend
- **React 19** - Modern JavaScript library for building user interfaces
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library for React
- **React Router DOM** - Declarative routing for React
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Toast notifications
- **Recharts** - Chart library for data visualization
- **Three.js** - 3D graphics library
- **Lucide React** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Cloudinary** - Cloud-based image and video management
- **Multer** - Middleware for handling file uploads
- **CORS** - Cross-Origin Resource Sharing

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or cloud service like MongoDB Atlas)
- **Git**

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VisOra
   ```

2. **Install dependencies for both client and server**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install

   # Go back to root
   cd ..
   ```

3. **Environment Setup**

   Create `.env` files in both `client` and `server` directories.

   **Server `.env` file:**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/visora
   JWT_SECRET=your_jwt_secret_key
   FRONTEND_URL=http://localhost:5173
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
   ```

   **Client `.env` file:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

## Usage

### Development

1. **Start the backend server**
   ```bash
   cd server
   npm run server
   ```

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

### Production

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Start the production server**
   ```bash
   cd server
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/faculty/login` - Faculty login
- `POST /api/student/login` - Student login

### Admin Routes
- `GET /api/admin/dashboard` - Get dashboard data
- `POST /api/admin/add-student` - Add new student
- `PUT /api/admin/update-student/:id` - Update student
- `DELETE /api/admin/delete-student/:id` - Delete student
- `POST /api/admin/add-faculty` - Add new faculty
- `PUT /api/admin/update-faculty/:id` - Update faculty
- `DELETE /api/admin/delete-faculty/:id` - Delete faculty
- `POST /api/admin/promote-year` - Promote students to next year

### Faculty Routes
- `GET /api/faculty/dashboard` - Get faculty dashboard
- `POST /api/faculty/add-schedule` - Add class schedule
- `GET /api/faculty/schedule` - Get faculty schedule
- `POST /api/faculty/mark-attendance` - Mark attendance

### Student Routes
- `GET /api/student/dashboard` - Get student dashboard
- `GET /api/student/attendance-history` - Get attendance history
- `GET /api/student/schedule` - Get student schedule

## Project Structure

```
VisOra/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context for state management
│   │   └── assets/        # Images and other assets
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend Node.js application
│   ├── configs/           # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Custom middlewares
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── server.js          # Main server file
│   └── package.json
├── .gitignore
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@visora.com or join our Slack channel.

## Acknowledgments

- Icons by [Lucide React](https://lucide.dev/)
- UI components inspired by modern design systems
- Special thanks to the open-source community
