import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, Users, CheckCircle, Coffee, ArrowLeft,
  ChevronRight, Save, Search, Phone, Bot, Sparkles, Send, RefreshCw, ShieldCheck 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

// --- SUB-COMPONENT: AVATAR ---
const StudentAvatar = ({ name, src }) => {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img 
        src={src} 
        alt={name} 
        onError={() => setImgError(true)} 
        className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm" 
      />
    );
  }
  
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  return (
    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-100 shadow-sm">
      {initials}
    </div>
  );
};

const ManualAttendance = () => {
  const { user } = useAppContext();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingAi, setSyncingAi] = useState(false);
  const [dispatchingTelegram, setDispatchingTelegram] = useState(false);
  const [todayClasses, setTodayClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [searchQuery, setSearchQuery] = useState("");
  const [neuralConsolidation, setNeuralConsolidation] = useState(null);
  const [aiVerifiedIds, setAiVerifiedIds] = useState(new Set());
  const [studentTelemetryMap, setStudentTelemetryMap] = useState({});

  // Helper: Get Local Date as YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d - offset)).toISOString().slice(0, 10);
  };

  // --- 1. INITIAL LOAD: FETCH SCHEDULE ---
  useEffect(() => {
    const fetchTodaySchedule = async () => {
      try {
        const { data } = await axios.get('/api/faculty/schedule');
        if (data.success) {
          const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const todays = data.schedule[todayName] || [];
          
          const sorted = todays.sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0));
          setTodayClasses(sorted);
        }
      } catch (err) {
        console.error("Schedule Fetch Error:", err);
        toast.error("Failed to load schedule");
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, []);

  // --- SYNC NEURAL CONSOLIDATION (Patent Claim 1e, 6, 10f) ---
  const syncNeuralRoster = async (studentList, cls) => {
    const targetClass = cls || selectedClass;
    const targetStudents = studentList || students;
    if (!targetClass) return;

    try {
      setSyncingAi(true);
      const res = await axios.get('/api/faculty/neural-consolidated-attendance', {
        params: {
          classId: targetClass._id || targetClass.id,
          date: getLocalDate(),
          branch: targetClass.branch,
          year: targetClass.year,
          section: targetClass.section || targetClass.batch,
          subject: targetClass.subject
        }
      });

      if (res.data.success && res.data.hasNeuralConsolidation) {
        setNeuralConsolidation(res.data);
        const autoTicked = res.data.autoTickedAttendance || {};
        const verifiedIds = new Set((res.data.aiVerifiedStudents || []).map(s => String(s._id)));
        setAiVerifiedIds(verifiedIds);

        // Build student telemetry map for tooltips
        const telMap = {};
        (res.data.aiVerifiedStudents || []).forEach(st => {
          telMap[String(st._id)] = st.telemetry;
        });
        setStudentTelemetryMap(telMap);

        // Auto-tick binary checkboxes
        setAttendance(autoTicked);
        toast.success(
          `🤖 Auto-Synchronized from VisOra Neural Engine (Patent Claim 1e): ${res.data.aiVerifiedCount}/${targetStudents.length} verified via SCRFD & FAISS.`,
          { duration: 5000, icon: '⚡' }
        );
      } else {
        setNeuralConsolidation(null);
        setAiVerifiedIds(new Set());
        setStudentTelemetryMap({});
      }
    } catch (err) {
      console.warn("Neural consolidation query skipped:", err.message);
    } finally {
      setSyncingAi(false);
    }
  };

  // --- 2. FETCH STUDENTS WHEN CLASS SELECTED ---
  useEffect(() => {
    if (!selectedClass) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students
        const studentRes = await axios.get('/api/faculty/students-by-section', {
          params: {
            year: selectedClass.year,
            branch: selectedClass.branch, 
            section: selectedClass.section || selectedClass.batch 
          }
        });

        // 2. Fetch Existing Attendance Status
        const todayDate = getLocalDate();
        const statusRes = await axios.get('/api/faculty/attendance-status', {
          params: {
            classId: selectedClass._id || selectedClass.id,
            date: todayDate
          }
        });

        if (studentRes.data.success) {
          const studentList = studentRes.data.students;
          setStudents(studentList);

          if (statusRes.data.exists) {
            const absentees = statusRes.data.absentees || []; 
            const initialAuth = {};
            studentList.forEach(s => {
              initialAuth[s._id] = absentees.includes(s._id) ? 'Absent' : 'Present';
            });
            setAttendance(initialAuth);
            toast("Loaded saved database record", { icon: '📂' });
          } else {
            // Attempt Deferred Consolidation Auto-Ticking (Patent Claim 1e & 6)
            await syncNeuralRoster(studentList, selectedClass);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load class data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClass]);

  // --- DISPATCH TELEGRAM REPORT (Patent Claim 1f, 8, 10g) ---
  const handleDispatchTelegram = async () => {
    if (!selectedClass) return;
    try {
      setDispatchingTelegram(true);
      const presentCount = Object.values(attendance).filter(v => v === 'Present').length;
      const absentCount = Object.values(attendance).filter(v => v === 'Absent').length;
      const absentRollNos = students
        .filter(s => attendance[s._id] === 'Absent')
        .map(s => s.rollno)
        .filter(Boolean);

      const res = await axios.post('/api/faculty/send-telegram-report', {
        classId: selectedClass._id || selectedClass.id,
        subject: selectedClass.subject,
        branch: selectedClass.branch,
        year: selectedClass.year,
        section: selectedClass.section || selectedClass.batch,
        date: getLocalDate(),
        presentCount,
        absentCount,
        totalStudents: students.length,
        absentRollNumbers: absentRollNos,
        randomOffsetMin: neuralConsolidation?.summary?.random_offset_min || 15,
        timeSlot: selectedClass.time || "Scheduled Slot"
      });

      if (res.data.success) {
        toast.success(
          `✈️ Telegram Report Dispatched (${res.data.report?.mode || 'Active'} mode)! Verification hash: ${res.data.cryptographicSignature}`,
          { duration: 5000 }
        );
      }
    } catch (err) {
      console.error("Telegram dispatch error:", err);
      toast.error(err.response?.data?.message || "Failed to dispatch Telegram report");
    } finally {
      setDispatchingTelegram(false);
    }
  };

  // --- HANDLERS ---
  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const markAll = (status) => {
    const newAuth = {};
    students.forEach(s => newAuth[s._id] = status);
    setAttendance(newAuth);
  };

  const invertSelection = () => {
    setAttendance(prev => {
      const next = {};
      students.forEach(s => {
        next[s._id] = prev[s._id] === 'Present' ? 'Absent' : 'Present';
      });
      return next;
    });
    toast.success("Inverted attendance selection!");
  };

  const handleSubmit = async () => {
    if(Object.keys(attendance).length === 0) return toast.error("No students to mark!");

    setSubmitting(true); // Start loading state
    try {
      const payload = {
        classId: selectedClass._id || selectedClass.id,
        date: getLocalDate(),
        attendanceData: Object.entries(attendance).map(([studentId, status]) => ({
          studentId,
          status
        }))
      };

      const res = await axios.post('/api/faculty/mark-attendance', payload);
      
      if (res.data.success) {
        toast.success(res.data.message || "Attendance saved!");
        setSelectedClass(null); 
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Submission Failed");
    } finally {
      setSubmitting(false); // Stop loading state
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.rollno && s.rollno.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !selectedClass && todayClasses.length === 0) {
    return (
        <div className="flex justify-center items-center h-screen text-indigo-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-2"></div>
            Loading schedule...
        </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle className="text-indigo-600" /> Manual Attendance
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {!selectedClass && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
            <Clock size={18} /> Select Today's Class
          </h2>

          {todayClasses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <Coffee className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-gray-500 font-medium">No classes scheduled for today.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
              {todayClasses.map((cls) => (
                <button 
                  key={cls._id || cls.id}
                  onClick={() => setSelectedClass(cls)}
                  disabled={cls.type === 'Leisure'}
                  className={`relative p-5 rounded-xl border text-left transition-all group
                    ${cls.type === 'Leisure' ? 'opacity-60 bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-indigo-300 hover:shadow-md'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-gray-800 line-clamp-1">{cls.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${cls.type === 'Lab' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {cls.type}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><Clock size={14} /> {cls.time}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} /> {cls.room}</div>
                    <div className="flex items-center gap-2"><Users size={14} /> {cls.year} Yr - {cls.branch} ({cls.section || cls.batch || "A"})</div>
                  </div>

                  {cls.type !== 'Leisure' && (
                    <div className="absolute bottom-5 right-5 text-indigo-200 group-hover:text-indigo-600 transition-colors"><ChevronRight size={24} /></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up flex flex-col h-[85vh]">
          
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <button onClick={() => setSelectedClass(null)} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-1.5 transition-colors">
                <ArrowLeft size={14} /> BACK TO SCHEDULE
              </button>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedClass.subject}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedClass.branch} • {selectedClass.year} Year • Sec {selectedClass.section || "A"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 📜 PATENT CLAIM 1e & 6: DEFERRED CONSOLIDATION AUTO-POPULATION BANNER */}
          {neuralConsolidation?.hasNeuralConsolidation ? (
            <div className="px-6 py-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-100 uppercase tracking-wide">
                      VisOra Deferred Consolidation Active
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Patent Claim 1e & 6 Synced
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200">
                    Autonomously populated binary checkboxes for <b>{neuralConsolidation.aiVerifiedCount}/{students.length}</b> students via SCRFD-500M & FAISS 512D. Manual override enabled.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => syncNeuralRoster(students, selectedClass)}
                  disabled={syncingAi}
                  className="text-xs font-bold bg-white/10 hover:bg-white/20 text-indigo-100 px-3 py-1.5 rounded-lg border border-white/15 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={syncingAi ? "animate-spin" : ""} />
                  {syncingAi ? "Syncing..." : "Re-sync AI"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-700">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-indigo-600" />
                No active neural session buffer found for this lecture. Checkboxes set to default.
              </span>
              <button
                onClick={() => syncNeuralRoster(students, selectedClass)}
                disabled={syncingAi}
                className="font-bold text-indigo-600 hover:text-indigo-900 underline flex items-center gap-1"
              >
                <RefreshCw size={11} className={syncingAi ? "animate-spin" : ""} />
                Check AI Buffer
              </button>
            </div>
          )}

          {(() => {
            const presentCount = Object.values(attendance).filter(v => v === 'Present').length;
            const absentCount = Object.values(attendance).filter(v => v === 'Absent').length;
            const presentRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

            return (
              <div className="px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <span className="text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                    Total: <b className="text-gray-900">{students.length}</b>
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Present: <b>{presentCount}</b> ({presentRate}%)
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    Absent: <b>{absentCount}</b>
                  </span>
                  {aiVerifiedIds.size > 0 && (
                    <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hidden sm:inline-flex items-center gap-1">
                      <ShieldCheck size={12} className="text-indigo-600" /> AI Verified: <b>{aiVerifiedIds.size}</b>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => markAll('Present')} 
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition"
                  >
                    All Present
                  </button>
                  <button 
                    onClick={() => markAll('Absent')} 
                    className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition"
                  >
                    All Absent
                  </button>
                  <button 
                    onClick={invertSelection} 
                    className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition"
                  >
                    Invert
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400"><Users size={48} className="mb-2 opacity-20" />No students found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold tracking-wider sticky top-0 z-10 shadow-sm border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 w-16">Profile</th>
                    <th className="px-6 py-4 w-32">Roll No</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Verification State</th>
                    <th className="px-6 py-4 text-center w-24">Mark (1/0)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredStudents.map((student) => {
                    const isPresent = attendance[student._id] === 'Present';
                    const isAiVerified = aiVerifiedIds.has(String(student._id));
                    const tel = studentTelemetryMap[String(student._id)];

                    return (
                      <tr 
                        key={student._id} 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer group ${!isPresent ? 'bg-red-50/60' : ''}`} 
                        onClick={() => toggleAttendance(student._id)}
                      >
                        <td className="px-6 py-3">
                          <StudentAvatar name={student.name} src={student.image} />
                        </td>
                        <td className="px-6 py-3 text-sm font-mono font-medium text-gray-600">
                          {student.rollno || "N/A"}
                        </td>
                        <td className="px-6 py-3">
                          <div className={`text-sm font-bold ${isPresent ? 'text-gray-800' : 'text-red-700'}`}>
                            {student.name}
                          </div>
                          {student.phno && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="opacity-60" /> {student.phno}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {isAiVerified ? (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                              title={`Verified via ArcFace 512D + rPPG | Dwell: ${tel?.dwellSeconds || 0}s | Heart Rate: ${tel?.heartRate || 74} BPM`}
                            >
                              <Sparkles size={12} className="text-emerald-500" />
                              AI Verified
                              {tel?.dwellSeconds ? (
                                <span className="text-[10px] text-emerald-600 font-mono">
                                  ({Math.round(tel.dwellSeconds / 60)}m dwell)
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-500 bg-gray-100">
                              Manual Review
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center">
                            {/* 🔥 PATENT CLAIM 1e & 10f: BINARY ATTENDANCE INDICATOR CHECKBOX */}
                            <div 
                              onClick={(e) => { e.stopPropagation(); toggleAttendance(student._id); }}
                              title={isPresent ? "Present (Click to toggle manual override)" : "Absent (Click to toggle manual override)"}
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 border-2 shadow-sm ${
                                isPresent 
                                  ? 'bg-green-600 border-green-600 scale-100' 
                                  : 'bg-white border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {isPresent && <CheckCircle size={16} className="text-white" strokeWidth={3} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 🚀 ACTION BAR: TELEGRAM DISPATCH & COMMIT */}
          <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Indian Patent App No: <b>202641036876</b></span>
              <span className="hidden md:inline">• EOD Auto-Commit Active at 23:59</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Telegram Report Dispatch Button (Patent Claim 1f, 8, 10g) */}
              <button
                onClick={handleDispatchTelegram}
                disabled={dispatchingTelegram}
                className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
                title="Dispatches interactive Markdown card to administrative Telegram channel (Patent Claim 1f, 8)"
              >
                {dispatchingTelegram ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-sky-600 border-t-transparent"></div>
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send size={14} className="text-sky-600" />
                    Dispatch Telegram Report
                  </>
                )}
              </button>

              {/* Submit Attendance Button */}
              <button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Submit Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualAttendance;