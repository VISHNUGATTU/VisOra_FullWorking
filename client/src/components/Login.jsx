import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { FiMail, FiLock, FiUser, FiChevronDown, FiArrowRight } from "react-icons/fi";
import { useAppContext } from "../context/AppContext";
import WatcherEye from "../components/WatcherEye";

// Logo Component
const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-8 animate-float">
    <div className="relative flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4 transform rotate-3 transition-transform hover:rotate-6">
       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
       </svg>
       <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-indigo-600"></div>
    </div>
    <h1 className="text-3xl font-bold text-white tracking-tight">
      Vis<span className="text-indigo-400">Ora</span>
    </h1>
    <p className="text-slate-400 text-sm tracking-wide uppercase mt-1">Access Portal</p>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  // ✅ Get checkAuth from context
  const { checkAuth, backendUrl } = useAppContext(); 

  const [formData, setFormData] = useState({
    mail: "",
    password: "",
    password1: "",
    password2: "",
    role: "student",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.mail)) {
      toast.error("Enter a valid email");
      return false;
    }
    if (formData.role === "admin") {
      if (formData.password1.length < 6 || formData.password2.length < 6) {
        toast.error("Both admin passwords must be at least 6 characters");
        return false;
      }
    } else {
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);

      let payload = { mail: formData.mail };
      if (formData.role === "admin") {
        payload.password1 = formData.password1;
        payload.password2 = formData.password2;
      } else {
        payload.password = formData.password;
      }

      // 1. Call Login API
      const { data } = await axios.post(
        `${backendUrl}/api/${formData.role}/login`,
        payload,
        { withCredentials: true }
      );

      if (!data.success) {
        toast.error(data.message || "Login failed");
        return;
      }

      toast.success("Login successful");

      // 2. Set Session Storage (CRITICAL step for checkAuth to work)
      sessionStorage.setItem("role", formData.role);

      // 3. Sync State immediately
      await checkAuth();

      // 4. Navigate based on role
      if (formData.role === "admin") navigate("/admin/home");
      else if (formData.role === "faculty") navigate("/faculty");
      else navigate("/student");

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
         <WatcherEye />
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl animate-fade-in-up">
        <Logo />

        <form onSubmit={handleSubmit} className="space-y-5">
           {/* ROLE SELECTOR */}
           <div className="group relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <FiUser size={20} />
            </div>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-800/50 text-white pl-12 pr-10 py-3.5 rounded-xl border border-white/10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer hover:bg-slate-800/70"
            >
              <option value="student">Student Portal</option>
              <option value="faculty">Faculty Portal</option>
              <option value="admin">Administrator</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <FiChevronDown />
            </div>
          </div>

          {/* EMAIL */}
          <div className="group relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <FiMail size={20} />
            </div>
            <input
              type="email"
              name="mail"
              placeholder="Email Address"
              value={formData.mail}
              onChange={handleChange}
              className="w-full bg-slate-800/50 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {/* PASSWORDS */}
          <div className="space-y-4">
            {formData.role !== "admin" ? (
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                  <FiLock size={20} />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                />
              </div>
            ) : (
              <>
                <div className="group relative animate-slide-in">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <FiLock size={20} />
                  </div>
                  <input
                    type="password"
                    name="password1"
                    placeholder="Security Key 1"
                    value={formData.password1}
                    onChange={handleChange}
                    className="w-full bg-slate-800/50 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  />
                </div>
                <div className="group relative animate-slide-in" style={{ animationDelay: "100ms" }}>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
                    <FiLock size={20} />
                  </div>
                  <input
                    type="password"
                    name="password2"
                    placeholder="Security Key 2"
                    value={formData.password2}
                    onChange={handleChange}
                    className="w-full bg-slate-800/50 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transform transition-all duration-200 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <FiArrowRight />
              </>
            )}
          </button>
        </form>
        
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2026 VisOra Intelligence. Secure System.
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Login;