import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, Users, CheckCircle, Coffee, ArrowLeft,
  ChevronRight, Save, Search, Phone 
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
  const [submitting, setSubmitting] = useState(false); // 🔥 FIXED: Added missing state
  const [todayClasses, setTodayClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); 
  const [searchQuery, setSearchQuery] = useState("");

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

          const initialAuth = {};

          if (statusRes.data.exists) {
            const absentees = statusRes.data.absentees || []; 
            studentList.forEach(s => {
              initialAuth[s._id] = absentees.includes(s._id) ? 'Absent' : 'Present';
            });
            toast("Loaded existing record", { icon: '📂' });
          } else {
            studentList.forEach(s => initialAuth[s._id] = 'Present');
          }

          setAttendance(initialAuth);
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up flex flex-col h-[80vh]">
          
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <button onClick={() => setSelectedClass(null)} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-1.5 transition-colors">
                <ArrowLeft size={14} /> BACK TO SCHEDULE
              </button>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedClass.subject}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedClass.branch} • {selectedClass.year} Year • Sec {selectedClass.section || "A"}</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full shadow-sm"
              />
            </div>
          </div>

          <div className="px-6 py-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
            <div className="flex gap-6 text-sm font-medium">
              <span className="text-gray-600">Total: <b className="text-gray-900">{students.length}</b></span>
              <span className="text-green-600">Present: <b>{Object.values(attendance).filter(v => v === 'Present').length}</b></span>
              <span className="text-red-600">Absent: <b>{Object.values(attendance).filter(v => v === 'Absent').length}</b></span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => markAll('Present')} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition">All Present</button>
              <button onClick={() => markAll('Absent')} className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition">All Absent</button>
            </div>
          </div>

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
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4 text-center w-24">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredStudents.map((student) => {
                    const isPresent = attendance[student._id] === 'Present';
                    return (
                      <tr key={student._id} className={`hover:bg-gray-50 transition-colors cursor-pointer group ${!isPresent ? 'bg-red-50/60' : ''}`} onClick={() => toggleAttendance(student._id)}>
                        <td className="px-6 py-3">
                          <StudentAvatar name={student.name} src={student.image} />
                        </td>
                        <td className="px-6 py-3 text-sm font-mono font-medium text-gray-600">
                          {student.rollno || "N/A"}
                        </td>
                        <td className={`px-6 py-3 text-sm font-bold ${isPresent ? 'text-gray-800' : 'text-red-700'}`}>
                          {student.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="opacity-50"/>
                            {student.phno || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <div onClick={(e) => { e.stopPropagation(); toggleAttendance(student._id); }}
                               className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 border-2 shadow-sm ${isPresent ? 'bg-green-600 border-green-600 scale-100' : 'bg-white border-gray-300 hover:border-gray-400'}`}>
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

          <div className="p-5 border-t border-gray-100 bg-white flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <button 
              onClick={handleSubmit} 
              disabled={submitting} 
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Submit Attendance
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualAttendance;