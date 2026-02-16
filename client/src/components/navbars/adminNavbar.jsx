import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  FiMenu, FiHome, FiUsers, FiUser, FiLogOut,
  FiChevronDown, FiX, FiSettings, FiBell, FiFileText,
  FiPieChart,
  FiActivity // <--- Imported new icon for Logs
} from "react-icons/fi";
import axios from "axios";
import { useAppContext } from "../../context/AppContext";
import logo from "../../assets/VisOra_logo.png"; 

const AdminNavbar = ({ children }) => {
  const {
    logout,
    sidebarOpen,
    setSidebarOpen,
    profileOpen,
    setProfileOpen,
    adminInfo,
    setAdminInfo,
    user,
    authReady,
  } = useAppContext();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [imgError, setImgError] = useState(false); 
  const dropdownRef = useRef(null);

  /* ================= FETCH ADMIN PROFILE ================= */
  useEffect(() => {
    const fetchAdmin = async () => {
      if (!authReady) return;
      if (!user?.token || user.role !== 'admin') {
        setLoadingProfile(false);
        return;
      }

      try {
        setLoadingProfile(true);
        const res = await axios.get(`/api/admin/is-auth`);
        if (res.data.success) {
          setAdminInfo(res.data.admin);
        }
      } catch (err) {
        console.error("Error fetching admin profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchAdmin();
  }, [authReady, user?.token, user?.role, setAdminInfo]);

  /* ================= CLOSE PROFILE ON OUTSIDE CLICK ================= */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen, setProfileOpen]);

  if (!authReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Helper to determine which image to show
  const getProfileImage = () => {
    if (adminInfo?.image && !imgError) {
      return adminInfo.image;
    }
    const name = adminInfo?.name || "Admin";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`;
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-400 transition-transform duration-300 shadow-xl
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950/30">
          <Link to="/admin/home" className="flex items-center gap-2">
            {logo ? <img src={logo} alt="VisOra" className="h-10 w-auto" /> : <span className="text-white font-bold text-xl">VisOra</span>}
          </Link>
          {/* Close button inside sidebar (Mobile Only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <FiX size={22} />
          </button>
        </div>

        <nav className="mt-6 space-y-1 pl-4 pr-2">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Main Menu</p>
          <SideItem to="/admin/home" icon={<FiHome />} text="Home" />
          <SideItem to="/admin/dashboard" icon={<FiPieChart />} text="Dashboard" />
          <SideItem to="/admin/faculty-management" icon={<FiUsers />} text="Faculty Management" />
          <SideItem to="/admin/student-management" icon={<FiUsers />} text="Student Management" />

          <div className="my-4 border-t border-slate-800 mx-4"></div>

          <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">System</p>
          
          {/* --- CHANGED SECTION START --- */}
          <SideItem to="/admin/reports" icon={<FiFileText />} text="Reports" />
          <SideItem to="/admin/logs" icon={<FiActivity />} text="Logs" />
          {/* --- CHANGED SECTION END --- */}

          <SideItem to="/admin/notifications" icon={<FiBell />} text="Notifications" />
          <SideItem to="/admin/settings" icon={<FiSettings />} text="Settings" />
          <SideItem to="/admin/profile" icon={<FiUser />} text="My Profile" />
        </nav>

        <div className="absolute bottom-6 w-full px-6">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white py-2.5 rounded-lg transition-colors duration-200"
          >
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "ml-0"}`}>
        
        <header className="h-16 bg-white flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-40 border-b border-gray-200">
          <div className="flex items-center gap-4">
            
            {/* Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-colors focus:outline-none"
            >
              <FiMenu size={24} />
            </button>

            {/* Logo shows on Mobile OR when Sidebar is CLOSED on Desktop */}
            <Link 
              to="/admin/home" 
              className={`flex items-center gap-2 ${sidebarOpen ? "lg:hidden" : ""}`}
            >
               {logo ? <img src={logo} alt="VisOra" className="h-10 w-auto" /> : <span className="text-indigo-600 font-bold text-xl">VisOra</span>}
            </Link>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full border border-transparent hover:bg-gray-50 hover:border-gray-200 transition-all focus:outline-none group"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                  {loadingProfile ? "Loading..." : adminInfo?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-500 font-medium lowercase">
                  {user?.role || "admin"}
                </p>
              </div>

              <div className="relative">
                {loadingProfile ? (
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-sm" />
                ) : (
                  <img
                    src={getProfileImage()}
                    alt="Profile"
                    onError={() => setImgError(true)}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-shadow bg-indigo-100"
                  />
                )}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"></span>
              </div>
              
              <FiChevronDown
                className={`text-gray-400 transition-transform duration-200 mx-1 ${profileOpen ? "rotate-180 text-indigo-600" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black ring-opacity-5 py-1 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Signed in as</p>
                  <p className="text-sm text-gray-500 truncate">{adminInfo?.mail || "admin@visora.com"}</p>
                </div>
                <div className="py-1">
                  <DropdownItem to="/admin/profile" icon={<FiUser />} text="My Profile" />
                  <DropdownItem to="/admin/settings" icon={<FiSettings />} text="Settings" />
                </div>
                <div className="border-t border-gray-100 my-1"></div>
                <div className="py-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FiLogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

/* ================= HELPERS ================= */

const SideItem = ({ to, icon, text }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-r-full mr-4 border-l-4
      ${isActive 
          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500" 
          : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`
    }
  >
    <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
    <span>{text}</span>
  </NavLink>
);

const DropdownItem = ({ to, text, icon }) => (
  <NavLink
    to={to}
    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
  >
    {icon && <span className="text-gray-400 hover:text-indigo-600">{icon}</span>}
    {text}
  </NavLink>
);

export default AdminNavbar;