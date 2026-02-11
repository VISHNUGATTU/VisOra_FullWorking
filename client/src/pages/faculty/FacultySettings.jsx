import React from "react";
import {
  FiUser,
  FiLock,
  FiLogOut,
  FiChevronRight,
  FiShield,
  FiInfo,
  FiCalendar,
  FiHelpCircle
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

const FacultySettings = () => {
  const navigate = useNavigate();
  const { axios, facultyInfo, setFacultyInfo } = useAppContext();

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await axios.post("/api/faculty/logout");
      setFacultyInfo(null);
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up p-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your faculty profile and preferences
        </p>
      </div>

      {/* ================= ACCOUNT & PREFERENCES ================= */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="px-6 pt-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Account & Preferences
        </h2>

        <div className="divide-y divide-slate-50 mt-2">

          {/* Edit Profile */}
          <button
            onClick={() => navigate("/faculty/edit-profile")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FiUser size={18} />
              </div>
              <span className="font-medium text-slate-700">Edit Personal Details</span>
            </div>
            <FiChevronRight className="text-slate-400" />
          </button>

          {/* My Schedule */}
          <button
            onClick={() => navigate("/faculty/schedule")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <FiCalendar size={18} />
              </div>
              <span className="font-medium text-slate-700">Manage Schedule</span>
            </div>
            <FiChevronRight className="text-slate-400" />
          </button>

          {/* Change Password */}
          <button
            onClick={() => toast("Change password feature coming soon 🔐")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <FiLock size={18} />
              </div>
              <span className="font-medium text-slate-700">Change Password</span>
            </div>
            <FiChevronRight className="text-slate-400" />
          </button>

        </div>
      </section>

      {/* ================= SECURITY & ACTIONS ================= */}
      <section className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden">
        <h2 className="px-6 pt-6 text-xs font-bold text-red-400 uppercase tracking-wider">
          Security & Actions
        </h2>

        <div className="divide-y divide-slate-50 mt-2">

          {/* Session Info */}
          <div className="flex items-center gap-3 px-6 py-4 text-slate-700">
            <div className="p-2 bg-red-50 text-red-500 rounded-lg">
               <FiShield size={18} />
            </div>
            <div>
              <p className="font-medium">Active Session</p>
              <p className="text-xs text-slate-400">
                Logged in via secure HTTP-only cookie
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 transition-colors group"
          >
            <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200 transition-colors">
              <FiLogOut size={18} />
            </div>
            <span className="font-semibold">Sign Out</span>
          </button>

        </div>
      </section>

      {/* ================= SYSTEM INFO ================= */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="px-6 pt-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
          System Information
        </h2>

        <div className="divide-y divide-slate-50 mt-2">

          {/* Faculty ID */}
          <div className="flex items-center justify-between px-6 py-4">
             <div className="flex items-center gap-3">
               <FiInfo className="text-gray-400" />
               <span className="text-slate-600 font-medium">Faculty ID</span>
             </div>
             <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded text-sm">
                {facultyInfo?.facultyId || "—"}
             </span>
          </div>

          {/* Department */}
          <div className="flex items-center justify-between px-6 py-4">
             <div className="flex items-center gap-3">
               <FiInfo className="text-gray-400" />
               <span className="text-slate-600 font-medium">Department</span>
             </div>
             <span className="text-slate-800 text-sm font-semibold">
                {facultyInfo?.department || "—"}
             </span>
          </div>

          {/* Designation */}
          <div className="flex items-center justify-between px-6 py-4">
             <div className="flex items-center gap-3">
               <FiInfo className="text-gray-400" />
               <span className="text-slate-600 font-medium">Designation</span>
             </div>
             <span className="text-slate-800 text-sm font-semibold">
                {facultyInfo?.designation || "—"}
             </span>
          </div>

        </div>
      </section>

      {/* Support Link */}
      <div className="text-center pt-4">
        <button 
          onClick={() => toast("Contact Admin feature coming soon")}
          className="text-slate-400 hover:text-indigo-600 text-sm flex items-center justify-center gap-2 transition-colors mx-auto"
        >
          <FiHelpCircle /> Need help? Contact Admin
        </button>
      </div>

    </div>
  );
};

export default FacultySettings;