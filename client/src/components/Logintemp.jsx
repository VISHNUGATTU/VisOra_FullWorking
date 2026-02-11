import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { useAppContext } from "../context/AppContext";
import {
  FiMail,
  FiLock,
  FiUser,
  FiChevronDown,
  FiArrowRight,
} from "react-icons/fi";

import LightPillar from "../component/LightPillar";

/* ================= LOGO ================= */
const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-8 animate-float">
    <div className="relative flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4 transform rotate-3 transition-transform hover:rotate-6">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-indigo-600" />
    </div>
    <h1 className="text-3xl font-bold text-white tracking-tight">
      Vis<span className="text-indigo-400">Ora</span>
    </h1>
    <p className="text-slate-400 text-sm tracking-wide uppercase mt-1">
      Access Portal
    </p>
  </div>
);

/* ================= LOGIN ================= */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAppContext();

  const [formData, setFormData] = useState({
    mail: "",
    password: "",
    password1: "",
    password2: "",
    role: "student",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.mail)) {
      toast.error("Enter a valid email");
      return false;
    }

    if (formData.role === "admin") {
      if (
        formData.password1.length < 6 ||
        formData.password2.length < 6
      ) {
        toast.error("Admin keys must be at least 6 characters");
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

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:6446";

      const payload =
        formData.role === "admin"
          ? {
              mail: formData.mail,
              password1: formData.password1,
              password2: formData.password2,
            }
          : {
              mail: formData.mail,
              password: formData.password,
            };

      const { data } = await axios.post(
        `${API_URL}/api/${formData.role}/login`,
        payload,
        { withCredentials: true }
      );

      if (!data.success) {
        toast.error(data.message || "Login failed");
        return;
      }

      login(formData.role, data.token);
      toast.success("Login successful");

      if (formData.role === "admin") navigate("/admin");
      else if (formData.role === "faculty") navigate("/faculty");
      else navigate("/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans">
      {/* ================= LIGHT PILLAR BG ================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <LightPillar
          topColor="#5024ff"
          bottomColor="#610f5e"
          intensity={1}
          rotationSpeed={0.2}
          glowAmount={0.002}
          pillarWidth={6}
          pillarHeight={0.6}
          noiseIntensity={0.5}
          pillarRotation={90}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      {/* Optional Dark Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 z-[1]" />

      {/* ================= LOGIN CARD ================= */}
      <div className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl animate-fade-in-up">
        <Logo />

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ROLE */}
          <div className="relative">
            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-800/60 text-white pl-12 pr-10 py-3.5 rounded-xl border border-white/10 outline-none appearance-none"
            >
              <option value="student">Student Portal</option>
              <option value="faculty">Faculty Portal</option>
              <option value="admin">Administrator</option>
            </select>
            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* EMAIL */}
          <div className="relative">
            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              name="mail"
              placeholder="Email address"
              value={formData.mail}
              onChange={handleChange}
              className="w-full bg-slate-800/60 text-white pl-12 py-3.5 rounded-xl border border-white/10 outline-none"
            />
          </div>

          {/* PASSWORDS */}
          {formData.role !== "admin" ? (
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-800/60 text-white pl-12 py-3.5 rounded-xl border border-white/10 outline-none"
              />
            </div>
          ) : (
            <>
              <input
                type="password"
                name="password1"
                placeholder="Security Key 1"
                value={formData.password1}
                onChange={handleChange}
                className="w-full bg-slate-800/60 text-white pl-4 py-3.5 rounded-xl border border-white/10 outline-none"
              />
              <input
                type="password"
                name="password2"
                placeholder="Security Key 2"
                value={formData.password2}
                onChange={handleChange}
                className="w-full bg-slate-800/60 text-white pl-4 py-3.5 rounded-xl border border-white/10 outline-none"
              />
            </>
          )}

          {/* BUTTON */}
          <button
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all"
          >
            {loading ? "Authenticating..." : <>Sign In <FiArrowRight /></>}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-8">
          © 2026 VisOra Intelligence
        </p>
      </div>

      {/* ================= ANIMATIONS ================= */}
      <style>{`
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in-up {
          animation: fadeUp 0.6s ease-out forwards;
        }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(20px); }
          to { opacity:1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
