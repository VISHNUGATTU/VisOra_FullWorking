import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  KeyRound,
  Sparkles,
  Cpu,
  Fingerprint,
  Lock,
  Mail,
  ArrowRight,
  Activity,
  CheckCircle2,
  Server,
  Zap
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import WatcherEye from "./WatcherEye";

const ROLES = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    badge: "Student Portal",
    tagline: "Track attendance, view timetable & analytics",
    demo: {
      mail: "student.aarav@visora.edu",
      password: "student123"
    }
  },
  {
    id: "faculty",
    label: "Faculty",
    icon: Briefcase,
    badge: "Faculty Gateway",
    tagline: "Classroom rosters, live camera scan & reports",
    demo: {
      mail: "faculty.sathar@visora.edu",
      password: "faculty123"
    }
  },
  {
    id: "admin",
    label: "Chief Admin",
    icon: ShieldCheck,
    badge: "Command Center",
    tagline: "Institutional audit, vector store & security clearance",
    demo: {
      mail: "admin@visora.edu",
      password1: "admin123",
      password2: "admin123"
    }
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

  const currentRoleConfig = ROLES.find((r) => r.id === role) || ROLES[0];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    // Reset passwords while keeping mail if previously entered
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

  const applyDemoCredentials = (demoRole) => {
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
    toast.success(`Pre-filled ${config.label} demo credentials`, {
      icon: "⚡",
      duration: 2500
    });
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.mail.trim())) {
      toast.error("Please enter a valid institutional email address.");
      return false;
    }

    if (role === "admin") {
      if (!formData.password1 || formData.password1.length < 6) {
        toast.error("Security Key 1 must be at least 6 characters.");
        return false;
      }
      if (!formData.password2 || formData.password2.length < 6) {
        toast.error("Security Key 2 must be at least 6 characters.");
        return false;
      }
    } else {
      if (!formData.password || formData.password.length < 6) {
        toast.error("Password must be at least 6 characters.");
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
        toast.error(data.message || "Authentication failed.");
        return;
      }

      toast.success(`Authenticated as ${currentRoleConfig.label}!`, {
        icon: "🛡️"
      });

      // Synchronize role in session storage for immediate route guards
      sessionStorage.setItem("role", role);

      // Refresh global authentication state
      await checkAuth();

      // Navigate to respective role dashboard
      if (role === "admin") navigate("/admin/home");
      else if (role === "faculty") navigate("/faculty");
      else navigate("/student");

    } catch (err) {
      console.error("[Login Error]", err);
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.status === 401
          ? "Invalid credentials. Please verify your email and password."
          : err.response?.status === 429
          ? "Too many login attempts. Please wait a few minutes."
          : "Unable to reach VisOra Core Server. Please check your connection.");
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Cyber Ambient Glow & Optic Watcher */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-gradient-to-tl from-cyan-600/15 via-indigo-600/10 to-transparent rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0d_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <div className="opacity-25 hover:opacity-40 transition-opacity duration-700">
          <WatcherEye />
        </div>
      </div>

      {/* Top Header / Status Bar */}
      <header className="relative z-10 w-full px-6 py-5 border-b border-slate-800/60 bg-[#070B14]/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-[#0B0F1D] rounded-[10px] flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Vis<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300">Ora</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Neural Identity & Timetable Platform
            </p>
          </div>
        </div>

        {/* Live System Metric Indicators */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Neural Engine: <strong className="text-emerald-400 font-semibold">Active</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>ArcFace 512D + rPPG</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
        <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Patent & Institutional Showcase */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold w-fit">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Indian Patent App No: 202641036876</span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Autonomous Biometric <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
                Attendance Intelligence
              </span>
            </h2>

            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              VisOra integrates deep ArcFace embeddings, capillary rPPG hemodynamic pulse detection, 
              and stochastic randomized lecture auditing for tamper-proof institutional attendance governance.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">512D Sub-Millisecond Search</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">High-speed FAISS vector retrieval under 0.05ms.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2">
                  <Activity className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">Anti-Spoof Spectral Liveness</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Passive rPPG capillary pulse & thermal veto gate.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-2">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">Stochastic Scheduling</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Randomized lecture capture windows eliminate proxy.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">Cryptographic Audit Chain</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">SHA-256 tamper-evident digital verification signatures.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Glassmorphic Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="relative rounded-3xl bg-slate-900/75 border border-slate-800/90 p-7 md:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
              {/* Subtle top card accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

              {/* Card Header & Role Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    {currentRoleConfig.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>256-Bit SSL Secured</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {role === "admin"
                    ? "Administrator Clearance"
                    : role === "faculty"
                    ? "Faculty Access Portal"
                    : "Student Portal Sign In"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {currentRoleConfig.tagline}
                </p>
              </div>

              {/* Segmented Role Switcher Tabs */}
              <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 relative">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const isActive = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id)}
                      className={`relative z-10 py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeRolePill"
                          className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl -z-10"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <Icon className="w-3.5 h-3.5" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Institutional Email Address
                  </label>
                  <div className="relative flex items-center group">
                    <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
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
                          ? "faculty.name@visora.edu"
                          : "student.rollno@visora.edu"
                      }
                      autoComplete="email"
                      required
                      className="w-full bg-slate-950/70 border border-slate-800 text-white text-sm pl-10 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <AnimatePresence mode="wait">
                  {role !== "admin" ? (
                    <motion.div
                      key="standard-pass"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Password
                        </label>
                        <span className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer">
                          Forgot password?
                        </span>
                      </div>
                      <div className="relative flex items-center group">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="••••••••••••"
                          autoComplete="current-password"
                          required
                          className="w-full bg-slate-950/70 border border-slate-800 text-white text-sm pl-10 pr-11 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="admin-dual-pass"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                        <KeyRound className="w-4 h-4 shrink-0 text-indigo-400" />
                        <span>Dual-Factor Admin Clearance: Enter both security passphrases.</span>
                      </div>

                      {/* Security Key 1 */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Security Key 1 (Primary Key)
                        </label>
                        <div className="relative flex items-center group">
                          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showKey1 ? "text" : "password"}
                            name="password1"
                            value={formData.password1}
                            onChange={handleInputChange}
                            placeholder="Primary Administrative Key"
                            required
                            className="w-full bg-slate-950/70 border border-slate-800 text-white text-sm pl-10 pr-11 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey1(!showKey1)}
                            className="absolute right-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                          >
                            {showKey1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Security Key 2 */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Security Key 2 (Secondary Audit Key)
                        </label>
                        <div className="relative flex items-center group">
                          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <input
                            type={showKey2 ? "text" : "password"}
                            name="password2"
                            value={formData.password2}
                            onChange={handleInputChange}
                            placeholder="Secondary Verification Key"
                            required
                            className="w-full bg-slate-950/70 border border-slate-800 text-white text-sm pl-10 pr-11 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey2(!showKey2)}
                            className="absolute right-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                          >
                            {showKey2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-300 transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm font-medium tracking-wide">
                        Verifying Clearance...
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold tracking-wide">
                        Sign In to {currentRoleConfig.label}
                      </span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Fast-Fill Demo Switchers for Evaluators & Testing */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Quick Demo Autofill
                  </span>
                  <span className="text-[10px] text-slate-400">1-Click Test Access</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials("student")}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 text-[11px] text-slate-300 font-medium transition-all text-center hover:border-indigo-500/40 hover:text-white"
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials("faculty")}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 text-[11px] text-slate-300 font-medium transition-all text-center hover:border-purple-500/40 hover:text-white"
                  >
                    👨‍🏫 Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoCredentials("admin")}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 text-[11px] text-slate-300 font-medium transition-all text-center hover:border-cyan-500/40 hover:text-white"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-slate-800/60 bg-[#070B14]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span>© 2026 VisOra Neural Platform. All rights reserved.</span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="text-slate-400">Form 2, Patent Act 1970</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>TLS 1.3 Certified</span>
          </span>
          <span className="text-slate-400">Indian Patent App No: 202641036876</span>
        </div>
      </footer>
    </div>
  );
};

export default Login;