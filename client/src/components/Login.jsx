
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  GraduationCap,
  BriefcaseBusiness,
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import WatcherEye from "../components/WatcherEye";

const ROLES = [
  {
    id: "student",
    label: "Student",
    description: "Student portal",
    icon: GraduationCap,
  },
  {
    id: "faculty",
    label: "Faculty",
    description: "Faculty portal",
    icon: BriefcaseBusiness,
  },
  {
    id: "admin",
    label: "Admin",
    description: "Administration",
    icon: ShieldCheck,
  },
];

// Keep Tailwind classes as complete strings so they are detected by Vite.
const ROLE_STYLES = {
  student: {
    text: "text-blue-400",
    iconBox:
      "border-blue-400/20 bg-blue-400/10 text-blue-400",
    selected:
      "border-blue-400/30 bg-blue-400/10 text-blue-300 shadow-lg shadow-blue-950/20",
    indicator: "bg-blue-400",
    button:
      "from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-950/40",
    focus:
      "focus:border-blue-400/60 focus:ring-blue-400/[0.07]",
    hover: "hover:text-blue-300",
    topLine: "via-blue-400/60",
    glow: "bg-blue-500/[0.06]",
  },
  faculty: {
    text: "text-emerald-400",
    iconBox:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    selected:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-950/20",
    indicator: "bg-emerald-400",
    button:
      "from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-950/40",
    focus:
      "focus:border-emerald-400/60 focus:ring-emerald-400/[0.07]",
    hover: "hover:text-emerald-300",
    topLine: "via-emerald-400/60",
    glow: "bg-emerald-500/[0.06]",
  },
  admin: {
    text: "text-violet-400",
    iconBox:
      "border-violet-400/20 bg-violet-400/10 text-violet-400",
    selected:
      "border-violet-400/30 bg-violet-400/10 text-violet-300 shadow-lg shadow-violet-950/20",
    indicator: "bg-violet-400",
    button:
      "from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-violet-950/40",
    focus:
      "focus:border-violet-400/60 focus:ring-violet-400/[0.07]",
    hover: "hover:text-violet-300",
    topLine: "via-violet-400/60",
    glow: "bg-violet-500/[0.06]",
  },
};

const INITIAL_FORM = {
  mail: "",
  password: "",
  password1: "",
  password2: "",
};

const Login = () => {
  const navigate = useNavigate();
  const { checkAuth, backendUrl } = useAppContext();

  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [showPassword, setShowPassword] = useState(false);
  const [showKey1, setShowKey1] = useState(false);
  const [showKey2, setShowKey2] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedRole = ROLES.find((item) => item.id === role);
  const ActiveIcon = selectedRole.icon;
  const activeStyle = ROLE_STYLES[role];

  const handleRoleChange = (newRole) => {
    if (loading || !ROLE_STYLES[newRole]) return;

    setRole(newRole);

    setFormData((prev) => ({
      ...prev,
      password: "",
      password1: "",
      password2: "",
    }));

    setShowPassword(false);
    setShowKey1(false);
    setShowKey2(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanMail = formData.mail.trim();

    if (!emailRegex.test(cleanMail)) {
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

    if (loading || !validateForm()) return;

    try {
      setLoading(true);

      const cleanMail = formData.mail.trim().toLowerCase();
      const payload = { mail: cleanMail };

      if (role === "admin") {
        payload.password1 = formData.password1;
        payload.password2 = formData.password2;
      } else {
        payload.password = formData.password;
      }

      // Existing backend endpoint and request format are preserved.
      const { data } = await axios.post(
        `${backendUrl}/api/${role}/login`,
        payload,
        { withCredentials: true }
      );

      if (!data.success) {
        toast.error(data.message || "Login failed");
        return;
      }

      sessionStorage.setItem("role", role);

      await checkAuth();

      toast.success("Welcome back!");

      if (role === "admin") {
        navigate("/admin/home", { replace: true });
      } else if (role === "faculty") {
        navigate("/faculty", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
    } catch (err) {
      console.error("[Login Error]", err);

      toast.error(
        err.response?.data?.message ||
          "Invalid credentials or server error"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full rounded-xl border border-white/[0.10]
    bg-[#080f20]/80 py-3.5 pl-11 pr-12
    text-sm text-white outline-none
    transition-all duration-200
    placeholder:text-slate-600
    hover:border-white/[0.18]
    focus:bg-[#0b1428] focus:ring-4
    ${activeStyle.focus}
  `;

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-[#050914] px-4 py-5 font-sans text-white selection:bg-cyan-400/30 selection:text-white sm:px-6 lg:overflow-hidden lg:py-6">
      {/* Background lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(37,99,235,0.15),transparent_38%),radial-gradient(ellipse_at_85%_85%,rgba(6,182,212,0.10),transparent_36%)]" />

      <div className="pointer-events-none absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-blue-600/[0.08] blur-[100px]" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[120px]" />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 90%)",
        }}
      />

      {/* WatcherEye background animation */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-25">
        <div className="relative h-[300px] w-full max-w-[520px] sm:h-[350px]">
          <WatcherEye />
        </div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_430px] lg:gap-16">
        {/* Desktop branding panel */}
        <section className="hidden lg:block">
          <div className="mb-10 inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 shadow-lg shadow-blue-950/40">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7 text-cyan-300"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M12 2v2M12 20v2M2 12h2M20 12h2"
                  opacity=".65"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Vis<span className="text-cyan-300">Ora</span>
              </h1>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Intelligent Attendance
              </p>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-200">
              <Sparkles size={14} />
              Intelligent Attendance System
            </div>

            <h2 className="text-5xl font-semibold leading-[1.15] tracking-tight xl:text-6xl">
              Every presence.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
                Precisely tracked.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              A unified attendance experience for students, faculty, and
              administrators. Secure access to your institutional workspace.
            </p>
          </div>

          <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                <ShieldCheck size={18} />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Secure access
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Role-based authentication
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Fingerprint size={18} />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                One workspace
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your campus, connected
              </p>
            </div>
          </div>

          <div className="mt-9 flex items-center gap-2 text-xs text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Built for a more connected campus
          </div>
        </section>

        {/* Login section */}
        <section className="mx-auto w-full max-w-[430px]">
          {/* Mobile branding */}
          <div className="mb-5 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-blue-500/20 to-cyan-400/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 text-cyan-300"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Vis<span className="text-cyan-300">Ora</span>
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Intelligent Attendance Platform
            </p>
          </div>

          {/* Login card */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#0b1221]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-7">
            <div
              className={`absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent ${activeStyle.topLine} to-transparent transition-colors duration-300`}
            />

            {/* Card heading */}
            <div className="mb-6">
              <div className="mb-5 flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-300 ${activeStyle.iconBox}`}
                >
                  <ActiveIcon size={19} />
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[10px] font-medium text-emerald-300">
                  <Shield size={12} />
                  Secure sign in
                </div>
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Sign in to continue to your workspace.
              </p>
            </div>

            {/* Role selector */}
            <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-[#060b16]/80 p-1.5">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                const style = ROLE_STYLES[r.id];

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    disabled={loading}
                    aria-pressed={active}
                    className={`flex min-w-0 flex-col items-center gap-2 rounded-xl border px-1 py-3 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? style.selected
                        : "border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-300"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span className="text-xs font-semibold">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected role indicator */}
            <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${activeStyle.indicator}`}
              />
              <span>{selectedRole.description}</span>
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-slate-600">
                {role}
              </span>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-mail"
                  className="mb-2 block text-xs font-medium text-slate-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="login-mail"
                    type="email"
                    name="mail"
                    autoComplete="username"
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
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Student and faculty password */}
              {role !== "admin" ? (
                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-xs font-medium text-slate-300"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition ${activeStyle.hover}`}
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Admin security key 1 */}
                  <div>
                    <label
                      htmlFor="login-password1"
                      className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300"
                    >
                      <span>Primary security key</span>
                      <span className="text-[10px] text-slate-600">
                        KEY 01
                      </span>
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        id="login-password1"
                        type={showKey1 ? "text" : "password"}
                        name="password1"
                        autoComplete="current-password"
                        value={formData.password1}
                        onChange={handleInputChange}
                        placeholder="Enter primary security key"
                        required
                        disabled={loading}
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={() => setShowKey1((prev) => !prev)}
                        aria-label={
                          showKey1
                            ? "Hide security key"
                            : "Show security key"
                        }
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition ${activeStyle.hover}`}
                      >
                        {showKey1 ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Admin security key 2 */}
                  <div>
                    <label
                      htmlFor="login-password2"
                      className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300"
                    >
                      <span>Secondary security key</span>
                      <span className="text-[10px] text-slate-600">
                        KEY 02
                      </span>
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        id="login-password2"
                        type={showKey2 ? "text" : "password"}
                        name="password2"
                        autoComplete="current-password"
                        value={formData.password2}
                        onChange={handleInputChange}
                        placeholder="Enter secondary security key"
                        required
                        disabled={loading}
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={() => setShowKey2((prev) => !prev)}
                        aria-label={
                          showKey2
                            ? "Hide security key"
                            : "Show security key"
                        }
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition ${activeStyle.hover}`}
                      >
                        {showKey2 ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className={`group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${activeStyle.button}`}
              >
                <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />

                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to VisOra
                      <ArrowRight
                        size={17}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Security footer */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] leading-5 text-slate-600">
              <ShieldCheck size={13} />
              Your institutional access is protected
            </div>
          </div>

          <footer className="mt-4 text-center text-[11px] text-slate-600">
            © 2026 VisOra. Secure Institutional Access.
          </footer>
        </section>
      </div>
    </main>
  );
};

export default Login;
