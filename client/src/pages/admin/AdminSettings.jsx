import React, { useState } from "react";
import {
  FiUser,
  FiLock,
  FiLogOut,
  FiChevronRight,
  FiShield,
  FiInfo,
  FiLayers,
  FiX,
  FiCheckCircle,
  FiKey
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { axios, adminInfo, setAdminInfo } = useAppContext();

  // --- STATE FOR DUAL PASSWORD POPUP ---
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  
  // ✅ Changed: Now storing password 1 and 2
  const [authData, setAuthData] = useState({ pass1: "", pass2: "" });
  const [verifying, setVerifying] = useState(false);

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await axios.post("/api/admin/logout");
      setAdminInfo(null);
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  /* ================= VERIFY DUAL PASSWORDS ================= */
  const handlePromoteAccess = async (e) => {
    e.preventDefault();
    setVerifying(true);

    try {
      // ✅ Payload keys match the Backend destructuring
      const payload = {
        passwordOne: authData.pass1,
        passwordTwo: authData.pass2
      };

      const { data } = await axios.post("/api/admin/verify-passwords", payload);

      if (data.success) {
        toast.success("Identity Verified.");
        setShowPromoteModal(false);
        setAuthData({ pass1: "", pass2: "" }); // Clean up
        navigate("/admin/promote-batch"); 
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Verification Failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up pb-10 relative">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your admin account and security
        </p>
      </div>

      {/* ================= ACCOUNT ================= */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="px-6 pt-6 text-sm font-bold text-slate-400 uppercase">
          Account
        </h2>
        <div className="divide-y">
          <button onClick={() => navigate("/admin/edit-profile")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <FiUser className="text-indigo-600" />
              <span className="font-medium text-slate-700">Edit Profile</span>
            </div>
            <FiChevronRight className="text-slate-400" />
          </button>
          <button onClick={() => toast("Change password coming soon 🔐")} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <FiLock className="text-indigo-600" />
              <span className="font-medium text-slate-700">Change Password</span>
            </div>
            <FiChevronRight className="text-slate-400" />
          </button>
        </div>
      </section>

      {/* ================= ACADEMIC OPERATIONS ================= */}
      <section className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
        <h2 className="px-6 pt-6 text-sm font-bold text-indigo-400 uppercase flex items-center gap-2">
          <FiLayers /> Academic Operations
        </h2>
        <div className="p-2">
          <div 
            onClick={() => setShowPromoteModal(true)}
            className="flex items-center justify-between px-4 py-4 m-2 bg-indigo-50 hover:bg-indigo-100 rounded-2xl cursor-pointer border border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FiLayers size={20} />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors">Promote Students</h3>
                <p className="text-xs text-indigo-600/80">Restricted Access (Dual Auth)</p>
              </div>
            </div>
            <FiChevronRight className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </section>

      {/* ================= SECURITY & SYSTEM ================= */}
      <section className="bg-white rounded-3xl border border-red-100 shadow-sm">
        <h2 className="px-6 pt-6 text-sm font-bold text-red-400 uppercase">Security</h2>
        <div className="divide-y">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 transition-colors">
            <FiLogOut />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="px-6 pt-6 text-sm font-bold text-slate-400 uppercase">System Info</h2>
        <div className="px-6 py-4 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Admin ID</span>
            <span className="font-mono font-medium text-slate-700">{adminInfo?.adminId || "—"}</span>
          </div>
        </div>
      </section>

      {/* ================= DUAL PASSWORD MODAL ================= */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FiShield className="text-red-600" /> Dual Authentication
                </h3>
                <p className="text-xs text-slate-500 mt-1">High Security Zone. Enter both keys.</p>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePromoteAccess} className="p-6 space-y-5">
              
              {/* Password 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 items-center gap-1">
                  <FiKey className="text-indigo-500" /> Password 1
                </label>
                <input 
                  type="password" 
                  value={authData.pass1}
                  onChange={(e) => setAuthData({...authData, pass1: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 text-center tracking-widest font-bold placeholder:font-normal placeholder:tracking-normal placeholder:text-sm"
                  placeholder="Enter Primary Password"
                  autoFocus
                  required
                />
              </div>

              {/* Password 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 items-center gap-1">
                  <FiKey className="text-indigo-500" /> Password 2
                </label>
                <input 
                  type="password" 
                  value={authData.pass2}
                  onChange={(e) => setAuthData({...authData, pass2: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 text-center tracking-widest font-bold placeholder:font-normal placeholder:tracking-normal placeholder:text-sm"
                  placeholder="Enter Secondary Password"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={verifying}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {verifying ? <span className="animate-pulse">Validating Credentials...</span> : <><FiCheckCircle /> Authenticate</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminSettings;