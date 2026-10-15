# VisOra: Neural Identity Engine (Indian Patent App No: 202641036876)

VisOra is an enterprise-grade AI-powered **Invisible Auditor** and neural identity verification platform published by the **Indian Patent Office (App No: 202641036876)**. Moving beyond conventional facial recognition, VisOra combines continuous optical tracking, capillary pulse liveness detection (rPPG), and multi-sensor fusion to eradicate proxy attendance and biometric spoofing at massive scale.

---

## 🧠 Patented Core Architecture

### 1. InsightFace Neural Core (RetinaFace + ArcFace)
- **512-Dimensional Deep Embeddings**: Sub-millisecond facial feature vectors extracted via ArcFace backbone normalized with unit $L_2$ norm.
- **FAISS Vector Search**: `IndexFlatIP` vector index providing cosine similarity search in $<2\text{ ms}$ over tens of thousands of student biometric vectors.

### 2. CPU Optimization & Continuous Optical Tracking
- **Adaptive Dynamic Tiling (SAHI)**: Slices high-resolution (1080p / 4K) surveillance frames into overlapping sub-patches with automated coordinate re-mapping and seam Non-Maximum Suppression (NMS) to detect distant, small classroom faces without GPU degradation.
- **7-State Bounding-Box Kalman Filter**: Predicts and tracks facial bounding boxes $[x, y, s, r, \dot{x}, \dot{y}, \dot{s}]$ at **>5,000x CPU throughput** (~0.08 ms prediction vs ~460 ms neural detection).
- **Hungarian Track Association**: Optimal bipartite matching with quality-aware Laplacian sharpness filtering and persistent track identity locks.

### 3. Dual-Layer Anti-Spoofing & Multi-Sensor Fusion
- **Remote Photoplethysmography (rPPG)**: Decomposes skin chrominance signals (CHROM) to extract capillary blood volume pulse (BVP). Computes cardiac pulse via Butterworth bandpass filtering (45–150 BPM) and FFT spectral concentration signal-to-noise ratio (SNR).
- **Multi-Sensor Fusion Engine**: Fuses Face Similarity ($40\%$), rPPG Vitality ($35\%$), Thermal Skin Temp ($15\%$), and PIR Motion ($10\%$) with hard veto logic that immediately rejects paper photo attacks, digital replay attacks, and abnormal surface temperatures ($<31^\circ\text{C}$ or $>41.5^\circ\text{C}$).

### 4. Seamless Node.js & React 19 Integration
- **Biometric Vector Auto-Sync**: MongoDB student records auto-generate and synchronize FAISS face vectors upon student photo registration or batch admin sync.
- **Live Biometric HUD Scanner**: Real-time faculty attendance viewport with holographic reticles, live BPM heart rate counters, and 1-click batch attendance submission.

---

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

### Development (Start All 3 Services)

1. **Start the Python Neural Engine (FastAPI + FAISS + InsightFace)**:
   ```bash
   python engine/main.py
   # Runs on http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
   ```

2. **Start the Node.js / Express Backend**:
   ```bash
   cd server
   npm run server
   # Runs on http://localhost:5000
   ```

3. **Start the React Frontend**:
   ```bash
   cd client
   npm run dev
   # Runs on http://localhost:5173
   ```

4. **Access the Application**:
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

For support, email gattuvishnuphani@gmail.com or join our Slack channel.

## Acknowledgments

- Icons by [Lucide React](https://lucide.dev/)
- UI components inspired by modern design systems
- Special thanks to the open-source community
