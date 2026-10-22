import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

const ROLES = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    demo: { mail: "student.aarav@visora.edu", password: "student123" }
  },
  {
    id: "faculty",
    label: "Faculty",
    icon: Briefcase,
    demo: { mail: "faculty.sathar@visora.edu", password: "faculty123" }
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    demo: { mail: "admin@visora.edu", password1: "admin123", password2: "admin123" }
  }
];

const Login = () => {
  const navigate = useNavigate();
  const { checkAuth, backendUrl } = useAppContext();

  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    mail: "",
    password: "",
    password1: "",
    password2: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showKey1, setShowKey1] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setFormData((prev) => ({
      ...prev,
      password: "",
      password1: "",
      password2: ""
    }));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const applyDemo = (demoRole) => {
    const config = ROLES.find((r) => r.id === demoRole);
    if (!config) return;
    setRole(demoRole);
    if (demoRole === "admin") {
      setFormData({
        mail: config.demo.mail,
        password: "",
        password1: config.demo.password1,
        password2: config.demo.password2
      });
    } else {
      setFormData({
        mail: config.demo.mail,
        password: config.demo.password,
        password1: "",
        password2: ""
      });
    }
    toast.success(`${config.label} demo credentials loaded`);
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.mail.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (role === "admin") {
      if (!formData.password1 || formData.password1.length < 6) {
        toast.error("Security Key 1 must be at least 6 characters");
        return false;
      }
      if (!formData.password2 || formData.password2.length < 6) {
        toast.error("Security Key 2 must be at least 6 characters");
        return false;
      }
    } else {
      if (!formData.password || formData.password.length < 6) {
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

      const cleanMail = formData.mail.trim().toLowerCase();
      let payload = { mail: cleanMail };

      if (role === "admin") {
        payload.password1 = formData.password1;
        payload.password2 = formData.password2;
      } else {
        payload.password = formData.password;
      }

      const { data } = await axios.post(
        `${backendUrl}/api/${role}/login`,
        payload,
        { withCredentials: true }
      );

      if (!data.success) {
        toast.error(data.message || "Login failed");
        return;
      }

      toast.success("Welcome back!");

      sessionStorage.setItem("role", role);
      await checkAuth();

      if (role === "admin") navigate("/admin/home");
      else if (role === "faculty") navigate("/faculty");
      else navigate("/student");

    } catch (err) {
      console.error("[Login Error]", err);
      toast.error(err.response?.data?.message || "Invalid credentials or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Top spacing */}
      <div className="w-full pt-4 md:pt-8" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/40 p-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 mb-3.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vis<span className="text-indigo-600">Ora</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Smart Institutional Attendance Platform
          </p>
        </div>

        {/* Clean Segmented Role Switcher */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-6">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isActive = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleChange(r.id)}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="mail"
                value={formData.mail}
                onChange={handleInputChange}
                placeholder={
                  role === "admin"
                    ? "admin@visora.edu"
                    : role === "faculty"
                    ? "faculty@visora.edu"
                    : "student@visora.edu"
                }
                required
                className="w-full bg-slate-50/50 border border-slate-300 text-slate-900 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Fields */}
          {role !== "admin" ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50/50 border border-slate-300 text-slate-900 text-sm pl-10 pr-11 py-2.5 rounded-xl outline-none transition focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Security Key 1 (Primary)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showKey1 ? "text" : "password"}
                    name="password1"
                    value={formData.password1}
                    onChange={handleInputChange}
                    placeholder="Enter Security Key 1"
                    required
                    className="w-full bg-slate-50/50 border border-slate-300 text-slate-900 text-sm pl-10 pr-11 py-2.5 rounded-xl outline-none transition focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey1(!showKey1)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showKey1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Security Key 2 (Secondary)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showKey2 ? "text" : "password"}
                    name="password2"
                    value={formData.password2}
                    onChange={handleInputChange}
                    placeholder="Enter Security Key 2"
                    required
                    className="w-full bg-slate-50/50 border border-slate-300 text-slate-900 text-sm pl-10 pr-11 py-2.5 rounded-xl outline-none transition focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey2(!showKey2)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showKey2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition duration-150 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm">Signing in...</span>
              </>
            ) : (
              <>
                <span className="text-sm">Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Fill Helper */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium mb-2.5">
            Quick Demo Autofill
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => applyDemo("student")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] text-slate-600 font-medium transition"
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => applyDemo("faculty")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] text-slate-600 font-medium transition"
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => applyDemo("admin")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] text-slate-600 font-medium transition"
            >
              Admin
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-slate-600">
        <p>© 2026 VisOra. Secure Institutional Access.</p>
      </footer>
    </div>
  );
};

export default Login;