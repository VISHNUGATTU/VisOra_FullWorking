import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAppContext } from "./context/AppContext";
import axios from "axios";

// Auth & Navbars
import Login from "./components/Login";
import AdminNavbar from "./components/navbars/adminNavbar";
import StudentNavbar from "./components/navbars/studentNavbar";
import FacultyNavbar from "./components/navbars/facultyNavbar";

// Admin Pages
import AdminHome from "./components/home/adminHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FacultyManagement from "./pages/admin/FacultyManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import AdminReports from "./pages/admin/AdminReports";
import AdminLogs from "./pages/admin/AdminLogs"
import Notifications from "./pages/admin/AdminNotifications";
import Settings from "./pages/admin/AdminSettings";
import AdminProfile from "./pages/admin/AdminProfile";
import EditProfile from "./pages/admin/AdminEditProfile";
import AddStudent from "./pages/admin/AddStudent";
import UpdateStudent from "./pages/admin/UpdateStudent";
import DeleteStudent from "./pages/admin/DeleteStudent";
import AddFaculty from "./pages/admin/AddFaculty";
import UpdateFaculty from "./pages/admin/UpdateFaculty";
import DeleteFaculty from "./pages/admin/DeleteFaculty";
import PromoteYear from "./pages/admin/PromoteYear";
import AlertFaculty from "./pages/admin/AlertFaculty";

// Faculty Pages
import FacultyHome from "./components/home/facultyHome";
import ManualAttendance from "./pages/faculty/ManualAttendance";
import FacultyReports from "./pages/faculty/FacultyReports";
import FacultyLogs from "./pages/faculty/FacultyLogs"
import FacultyNotifications from "./pages/faculty/FacultyNotifications";
import FacultySettings from "./pages/faculty/FacultySettings";
import FacultyProfile from "./pages/faculty/FacultyProfile";
import FacultyEditProfile from "./pages/faculty/FacultyEditProfile";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultySchedule from "./pages/faculty/FacultySchedule";
import AddSchedule from "./pages/faculty/AddSchedule";
import ChangeFacultyPassword from "./pages/faculty/ChangeFacultyPassword"

// Student Pages (ADD THESE IMPORTS)
import StudentHome from "./components/home/studentHome";
import StudentDashboard from "./pages/student/StudentDashboard"; // Path to the file we built
import AttendanceHistory from "./pages/student/AttendanceHistory"; // Path to the file we built
import StudentSchedule from "./pages/student/StudentSchedule"; 
import StudentProfile from "./pages/student/StudentProfile";
import StudentSettings from "./pages/student/StudentSettings";
import StudentNotifications from "./pages/student/StudentNotifications";  
import StudentReports from "./pages/student/StudentReports"
import StudentLogs from "./pages/student/StudentLogs";


const ProtectedRoute = ({ children, role }) => {
  const { user, authReady } = useAppContext();

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-400 font-mono tracking-tighter animate-pulse">VERIFYING SECURE SESSION...</p>
      </div>
    );
  }

  if (!user.token) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  axios.defaults.withCredentials = true;

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Login />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/*" element={
          <ProtectedRoute role="admin">
            <AdminNavbar>
              <Routes>
                <Route path="home" element={<AdminHome />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="faculty-management" element={<FacultyManagement />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="logs" element={<AdminLogs/>}/>
                <Route path="notifications" element={<Notifications />} />
                <Route path="alert-faculty" element={<AlertFaculty />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="edit-profile" element={<EditProfile />} />
                <Route path="student-management" element={<StudentManagement />} />
                <Route path="promote-batch" element={<PromoteYear />} />
                <Route path="student-management/add" element={<AddStudent />} />
                <Route path="student-management/update" element={<UpdateStudent />} />
                <Route path="student-management/delete" element={<DeleteStudent />} />
                <Route path="faculty-management/add" element={<AddFaculty />} />
                <Route path="faculty-management/update" element={<UpdateFaculty />} />
                <Route path="faculty-management/delete" element={<DeleteFaculty />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AdminNavbar>
          </ProtectedRoute>
        } />

        {/* FACULTY ROUTES */}
        <Route path="/faculty/*" element={
          <ProtectedRoute role="faculty">
            <FacultyNavbar>
              <Routes>
                <Route path="home" element={<FacultyHome />} />
                <Route path="dashboard" element={<FacultyDashboard />} />
                <Route path="schedule" element={<FacultySchedule />} />
                <Route path="manual-attendance" element={<ManualAttendance />} />
                <Route path="reports" element={<FacultyReports />} />
                <Route path="logs" element={<FacultyLogs/>}/>
                <Route path="notifications" element={<FacultyNotifications />} />
                <Route path="settings" element={<FacultySettings />} />
                <Route path="profile" element={<FacultyProfile />} />
                <Route path="edit-profile" element={<FacultyEditProfile />} />
                <Route path="add-schedule" element={<AddSchedule />} />
                <Route path="change-password" element={<ChangeFacultyPassword />} />
                <Route path="*" element={<Navigate to="home" replace />} />
              </Routes>
            </FacultyNavbar>
          </ProtectedRoute>
        } />

        {/* STUDENT ROUTES - UPDATED TO NESTED PATTERN */}
        <Route path="/student/*" element={
          <ProtectedRoute role="student">
            <StudentNavbar>
              <Routes>
                <Route path="home" element={<StudentHome />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="attendance-history" element={<AttendanceHistory />} />
                <Route path="schedule" element={<StudentSchedule />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="settings" element={<StudentSettings />} />
                <Route path="notifications" element={<StudentNotifications />} />
                <Route path="logs" element={<StudentLogs />} />
                <Route path="reports" element={<StudentReports/>}/>
                <Route path="*" element={<Navigate to="home" replace />} />
              </Routes>
            </StudentNavbar>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;