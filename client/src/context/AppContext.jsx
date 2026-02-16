import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

export const AppContext = createContext();

// ✅ Global Config
axios.defaults.withCredentials = true;
const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState({ token: null, role: null });
  const [authReady, setAuthReady] = useState(false);
  
  // ✅ STATE FOR ADMIN & FACULTY
  const [adminInfo, setAdminInfo] = useState(null);
  const [facultyInfo, setFacultyInfo] = useState(null); // <--- ADDED THIS
  const [studentInfo, setStudentInfo] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // ✅ 1. Check Auth (Updated to handle Faculty)
const checkAuth = useCallback(async () => {
  try {
    const role = sessionStorage.getItem("role");
    
    // 1. CRITICAL: Clear all previous user data immediately 
    // to prevent "leaking" data between sessions
    setAdminInfo(null);
    setFacultyInfo(null);
    setStudentInfo(null);

    if (!role) {
      setUser({ token: null, role: null }); // Reset user state too
      setAuthReady(true);
      return;
    }

    const { data } = await axios.get(`/api/${role}/is-auth`);

    if (data.success) {
      setUser({ token: "cookie-auth", role });
      
      // 2. Set only the relevant info for the current role
      if (role === "admin" && data.admin) {
        setAdminInfo(data.admin);
      } else if (role === "faculty" && data.faculty) {
        setFacultyInfo(data.faculty);
      } else if (role === "student" && data.student) {
        // Ensure student info is also handled if your API returns it
        setStudentInfo(data.student);
      }

    } else {
      setUser({ token: null, role: null });
      sessionStorage.removeItem("role");
    }
  } catch (error) {
    console.error("Auth check error:", error);
    setUser({ token: null, role: null });
    // Clear everything on error for security
    setAdminInfo(null);
    setFacultyInfo(null);
    setStudentInfo(null);
  } finally {
    setAuthReady(true);
  }
}, []);

  // ✅ 2. Run checkAuth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ✅ Manual login helper (Updated)
  const login = (role, token, data = null) => {
    sessionStorage.setItem("role", role);
    setUser({ token, role });
    
    if (role === "admin" && data) setAdminInfo(data);
    if (role === "faculty" && data) setFacultyInfo(data); // <--- Added
    
    setAuthReady(true);
  };

  const logout = async () => {
    const role = sessionStorage.getItem("role");
    try {
      if(role) await axios.post(`/api/${role}/logout`);
    } catch (error) {
      console.error(error);
    } finally {
      sessionStorage.clear();
      setUser({ token: null, role: null });
      setAdminInfo(null);
      setFacultyInfo(null); // <--- Clear faculty info
      toast.success("Logged out");
      navigate("/");
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        checkAuth,
        login,
        logout,
        sidebarOpen,
        setSidebarOpen,
        profileOpen,
        setProfileOpen,
        
        // Admin
        adminInfo,
        setAdminInfo,
        
        // ✅ Faculty (Exported!)
        facultyInfo,
        setFacultyInfo,
        
        // Student
        studentInfo,
        setStudentInfo,

        axios,
        backendUrl
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);