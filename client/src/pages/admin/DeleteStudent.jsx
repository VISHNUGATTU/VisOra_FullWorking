import React, { useEffect, useState } from "react";
import { 
  FiTrash2, FiLock, FiArrowLeft, FiSearch, 
  FiAlertTriangle, FiUser, FiKey, FiCheckCircle 
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const DeleteStudent = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();

  // --- STATE ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);

  // Auth & Confirmation State
  const [confirmStep, setConfirmStep] = useState(0); // 0: Init, 1: Warning, 2: Auth
  const [authData, setAuthData] = useState({ pass1: "", pass2: "" });
  const [loading, setLoading] = useState(false);

  /* ================= LIVE SEARCH ================= */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/student/search?q=${query}`);
        setResults(data.students || []);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  /* ================= DELETE HANDLER ================= */
  const handleDelete = async () => {
    if (!authData.pass1 || !authData.pass2) {
      return toast.error("Both passwords are required");
    }

    try {
      setLoading(true);

      // STEP 1: Verify Dual Passwords
      // We use the same verification route you set up earlier
      await axios.post("/api/admin/verify-passwords", {
        passwordOne: authData.pass1,
        passwordTwo: authData.pass2
      });

      // STEP 2: Delete Student
      // Assuming route is /api/student/delete/:id
      // Using student._id is safer than rollno for backend deletions
      await axios.delete(`/api/student/delete/${student._id}`);

      toast.success("Student deleted permanentely.");

      // STEP 3: Reset Form & UI
      setStudent(null);
      setQuery("");       // Clear search query
      setResults([]);     // Clear old results list
      setConfirmStep(0);  // Reset flow
      setAuthData({ pass1: "", pass2: "" }); // Clear sensitive inputs

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Delete failed. Check passwords.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-100 text-red-600">
            <FiTrash2 size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Delete Student
          </h1>
        </div>

        <button
          onClick={() => navigate("/admin/student-management")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
          border border-slate-200 bg-white text-slate-700
          font-medium hover:bg-slate-100 transition"
        >
          <FiArrowLeft /> Back
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-4 text-slate-400" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Name, Roll No, or Email..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/50 text-slate-700 font-medium shadow-sm transition-all"
        />
      </div>

      {/* SEARCH RESULTS LIST */}
      {!student && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {results.map((s) => (
            <div
              key={s._id}
              onClick={() => {
                setStudent(s);
                setResults([]);
                setConfirmStep(0);
                setQuery(""); // Clear input when selected
              }}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-red-50/50 transition-colors group"
            >
              <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {s.image ? (
                  <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800 group-hover:text-red-700 transition-colors">{s.name}</p>
                <div className="flex gap-2 text-xs font-medium text-slate-500 mt-0.5">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{s.rollno}</span>
                  <span>•</span>
                  <span>{s.year} Year</span>
                  <span>•</span>
                  <span>Sec {s.section}</span>
                  <span>•</span>
                  <span>{s.branch}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SELECTED STUDENT CARD & CONFIRMATION FLOW */}
      {student && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 animate-in zoom-in-95 duration-200">
          
          {/* Student Profile Preview */}
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left border-b border-slate-100 pb-8">
             <div className="h-24 w-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden shrink-0">
                {student.image ? (
                  <img src={student.image} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="h-10 w-10 m-auto text-slate-400 relative top-6" />
                )}
             </div>
             <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
                <p className="text-lg text-slate-500 font-mono">{student.rollno}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                   <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">{student.branch}</span>
                   <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">Year {student.year}</span>
                   <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full">Sec {student.section}</span>
                </div>
             </div>
             
             {/* Cancel Button */}
             <button 
                onClick={() => { setStudent(null); setConfirmStep(0); }}
                className="md:ml-auto px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
             >
                Cancel
             </button>
          </div>

          {/* STEP 0: INITIAL DELETE BUTTON */}
          {confirmStep === 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setConfirmStep(1)}
                className="w-full md:w-auto px-8 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <FiTrash2 /> Delete This Student
              </button>
            </div>
          )}

          {/* STEP 1: WARNING */}
          {confirmStep === 1 && (
            <div className="bg-red-50 rounded-xl p-6 border border-red-100 animate-in fade-in slide-in-from-top-2">
               <div className="flex gap-3">
                  <FiAlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                  <div>
                     <h3 className="text-red-800 font-bold text-lg">Are you absolutely sure?</h3>
                     <p className="text-red-600 text-sm mt-1 leading-relaxed">
                        This action will <b>permanently delete</b> all data for <b>{student.name}</b>, including attendance records, grades, and profile information. This cannot be undone.
                     </p>
                  </div>
               </div>
               <div className="flex gap-3 mt-6 justify-end">
                  <button onClick={() => setConfirmStep(0)} className="px-5 py-2.5 bg-white text-slate-600 font-bold rounded-lg border border-slate-200 hover:bg-slate-50">Cancel</button>
                  <button onClick={() => setConfirmStep(2)} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md">Yes, Proceed</button>
               </div>
            </div>
          )}

          {/* STEP 2: DUAL AUTHENTICATION */}
          {confirmStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase">
                  <FiLock /> Security Verification
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block">Password 1</label>
                    <div className="relative">
                      <FiKey className="absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Primary Key"
                        value={authData.pass1}
                        onChange={(e) => setAuthData({...authData, pass1: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-700 placeholder:font-normal"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block">Password 2</label>
                    <div className="relative">
                      <FiKey className="absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Secondary Key"
                        value={authData.pass2}
                        onChange={(e) => setAuthData({...authData, pass2: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-slate-700 placeholder:font-normal"
                      />
                    </div>
                  </div>
               </div>

               <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         Verifying...
                      </span>
                    ) : (
                      <>
                        <FiCheckCircle /> Confirm Permanent Deletion
                      </>
                    )}
                  </button>
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default DeleteStudent;