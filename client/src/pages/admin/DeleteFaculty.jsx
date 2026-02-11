import React, { useEffect, useState } from "react";
import { 
  FiTrash2, 
  FiLock, 
  FiArrowLeft, 
  FiSearch, 
  FiAlertTriangle, 
  FiX 
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const DeleteFaculty = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [faculty, setFaculty] = useState(null);

  // Deletion Flow State
  const [confirmStep, setConfirmStep] = useState(0); // 0:Init, 1:Warning, 2:Password
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= LIVE SEARCH ================= */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const delay = setTimeout(async () => {
      try {
        // ✅ FIX 1: Route is /api/faculty/search (not admin)
        const { data } = await axios.get(
          `/api/faculty/search?q=${query}`,
          { signal: controller.signal }
        );
        setResults(data.faculty || []);
      } catch (error) {
        if (error.name !== "CanceledError") {
           setResults([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [query]); 

  /* ================= DELETE HANDLER ================= */
  const handleDelete = async () => {
    if (!adminPassword) return toast.error("Enter admin password");

    try {
      setLoading(true);

      // 1. Verify admin password first
      // This route IS correctly in adminRouter
      await axios.post("/api/admin/verify-password", {
        password: adminPassword,
      });

      // 2. Perform Delete
      // ✅ FIX 2: Route is /api/faculty/delete/:id (not admin)
      await axios.delete(
        `/api/faculty/delete/${faculty.facultyId}`
      );

      toast.success("Faculty deleted successfully");

      // Reset State
      setFaculty(null);
      setQuery("");
      setResults([]);
      setConfirmStep(0);
      setAdminPassword("");

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Delete failed. Check password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-50 text-red-600">
            <FiTrash2 size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Delete Faculty
          </h1>
        </div>

        <button
          onClick={() => navigate("/admin/faculty-management")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 transition"
        >
          <FiArrowLeft />
          Back
        </button>
      </div>

      {/* SEARCH SECTION */}
      {!faculty && (
        <div className="relative">
          <FiSearch className="absolute left-4 top-4 text-gray-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Name, Faculty ID, or Email..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm transition-all"
          />

          {/* SEARCH RESULTS */}
          {results.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl max-h-96 overflow-y-auto">
              {results.map((f) => (
                <div
                  key={f._id}
                  onClick={() => {
                    setFaculty(f);
                    setResults([]);
                    setConfirmStep(0);
                  }}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-red-50 transition border-b last:border-0"
                >
                  <img
                    src={f.image || "https://via.placeholder.com/150"}
                    alt={f.name}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {f.facultyId} • {f.department}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SELECTED FACULTY CARD (Rest of UI is perfect) */}
      {faculty && (
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Card Header */}
          <div className="bg-red-50 px-8 py-4 flex justify-between items-center border-b border-red-100">
            <span className="text-red-700 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
              <FiAlertTriangle /> Delete Zone
            </span>
            <button 
              onClick={() => { setFaculty(null); setQuery(""); }}
              className="p-2 hover:bg-red-200 rounded-full text-red-600 transition"
              title="Cancel Selection"
            >
              <FiX />
            </button>
          </div>

          <div className="p-8">
            {/* Faculty Details */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-8">
              <img
                src={faculty.image || "https://via.placeholder.com/150"}
                className="h-24 w-24 rounded-full object-cover border-4 border-red-50 shadow-sm"
                alt="Profile"
              />
              <div className="text-center md:text-left space-y-1">
                <h2 className="text-2xl font-bold text-slate-800">{faculty.name}</h2>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-1">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wide">
                    {faculty.designation || "Faculty"}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wide">
                    {faculty.department}
                  </span>
                </div>
                <p className="text-slate-500 pt-2 text-sm">{faculty.mail}</p>
                <p className="text-slate-400 text-xs font-mono">ID: {faculty.facultyId}</p>
              </div>
            </div>

            <hr className="border-slate-100 mb-8" />

            {/* ACTION FLOW STEPS */}
            <div className="max-w-md mx-auto">
              
              {/* Step 0: Initial Button */}
              {confirmStep === 0 && (
                <button
                  onClick={() => setConfirmStep(1)}
                  className="w-full py-4 bg-red-600 text-white rounded-xl
                  font-bold text-lg hover:bg-red-700 active:scale-95 transition shadow-lg shadow-red-200
                  flex justify-center items-center gap-2"
                >
                  <FiTrash2 /> Permanently Delete Faculty
                </button>
              )}

              {/* Step 1: Warning Confirmation */}
              {confirmStep === 1 && (
                <div className="text-center space-y-5 bg-red-50 p-6 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                     <FiAlertTriangle size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900">Are you absolutely sure?</h3>
                    <p className="text-red-700 text-sm mt-2 leading-relaxed">
                      This action cannot be undone. All data associated with <b>{faculty.name}</b>, including their schedule and history, will be removed.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => setConfirmStep(0)}
                      className="px-6 py-2 bg-white border border-red-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setConfirmStep(2)}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-md shadow-red-200 transition"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Password Verification */}
              {confirmStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                      Admin Password Verification
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-3.5 text-gray-400" />
                      <input
                        type="password"
                        placeholder="Enter your admin password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                       onClick={() => setConfirmStep(1)}
                       disabled={loading}
                       className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="flex-[2] py-3 bg-red-600 text-white rounded-xl
                      font-bold hover:bg-red-700 active:scale-95 transition flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-200"
                    >
                      {loading ? "Deleting..." : "Confirm & Delete"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteFaculty;