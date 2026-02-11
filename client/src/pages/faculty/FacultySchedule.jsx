import React, { useState, useEffect, useCallback,useMemo } from 'react';
import { 
  Calendar, Plus, Clock, MapPin, 
  X, User, Trash2, Grid, AlertTriangle, Layers 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import { useAppContext } from '../../context/AppContext'; 
import toast from 'react-hot-toast';

// --- HELPER FUNCTIONS ---
const getOrdinal = (n) => {
  const num = parseInt(n) || 1; 
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

const FacultySchedule = () => {
  const navigate = useNavigate();
  const { user, facultyInfo } = useAppContext(); // Ensure user & facultyInfo are available
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null); 
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Schedule Data Structure
  const [scheduleData, setScheduleData] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
  });

  // --- FETCH SCHEDULE ---
  const fetchSchedule = useCallback(async () => {
    // Wait for user token
    if (!user?.token) return; 

    try {
      setLoading(true);
      // Use the standard axios instance if configured, or pass headers manually
      const res = await axios.get('/api/faculty/schedule', { 
        headers: { Authorization: `Bearer ${user.token}` } 
      });

      if (res.data.success) {
        setScheduleData(prev => ({ ...prev, ...res.data.schedule }));
      }
    } catch (err) { 
      console.error("Fetch Schedule Error:", err); 
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // --- INITIAL EFFECT ---
  useEffect(() => {
    fetchSchedule(); 
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good Morning");
    else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, [fetchSchedule]);

  // --- DELETE HANDLER ---
  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
        const res = await axios.delete(`/api/faculty/schedule/${classToDelete}`, { 
            headers: { Authorization: `Bearer ${user.token}` } 
        });
        
        if (res.data.success) {
            toast.success("Class removed from schedule");
            setSelectedClass(null); 
            setClassToDelete(null); 
            fetchSchedule(); // Refresh data
        }
    } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to delete class");
    }
  };

  if (loading && !scheduleData.Monday.length) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-6 lg:p-8 animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="text-indigo-600" size={32} /> 
            {`${greeting}, ${facultyInfo?.name || "Professor"}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-11">Manage your weekly academic timeline.</p>
        </div>
        <button
          onClick={() => navigate('/faculty/add-schedule')}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus size={20} /> Add Class
        </button>
      </div>

      {/* SCHEDULE ROWS */}
      <div className="flex flex-col gap-5">
        {days.map((day) => (
          <DayRow 
            key={day} 
            dayName={day} 
            classes={scheduleData[day]} 
            onAdd={() => navigate('/faculty/add-schedule')}
            onClassClick={(cls) => setSelectedClass(cls)} 
          />
        ))}
      </div>

      {/* DETAILS MODAL */}
      {selectedClass && (
        <ClassDetailsModal 
          data={selectedClass} 
          onClose={() => setSelectedClass(null)} 
          onDelete={() => setClassToDelete(selectedClass._id || selectedClass.id)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {classToDelete && (
        <DeleteConfirmationModal 
          onCancel={() => setClassToDelete(null)}
          onConfirm={confirmDeleteClass}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const DeleteConfirmationModal = ({ onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <div className="w-[400px] bg-white rounded-2xl shadow-2xl p-6 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="h-14 w-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="text-red-600" size={28} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Class?</h3>
        <p className="text-sm text-gray-500 mb-6 px-4">
          Are you sure you want to remove this slot from your schedule? This action cannot be undone.
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all">
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const DayRow = ({ dayName, classes, onAdd, onClassClick }) => {
  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === dayName;
  const shortDay = dayName.substring(0, 3).toUpperCase(); 

  return (
    <div className={`flex flex-col md:flex-row min-h-[160px] bg-white rounded-2xl border overflow-hidden transition-all
      ${isToday 
        ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-xl shadow-indigo-100/50' 
        : 'border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md'}`}
    >
      {/* Left Column (Day Indicator) */}
      <div className={`p-4 w-full md:w-32 flex-shrink-0 flex md:flex-col items-center justify-center gap-2 border-b md:border-b-0 md:border-r border-gray-100
        ${isToday ? 'bg-indigo-50/50' : 'bg-white'}`}
      >
        <span className={`text-2xl md:text-3xl font-black tracking-tighter ${isToday ? 'text-indigo-600' : 'text-gray-300'}`}>
          {shortDay}
        </span>
        {isToday && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Today</span>}
      </div>

      {/* Right Column (Classes) */}
      <div className="flex-1 p-5 bg-white flex flex-wrap gap-4 items-center">
        {classes && classes.length > 0 ? (
          // 🔥 BRUTE FORCE SORT: We sort the local 'classes' array right here
          [...classes]
            .sort((a, b) => Number(a.periodIndex) - Number(b.periodIndex))
            .map((cls) => (
              <ClassBlock key={cls._id || cls.id} data={cls} onClick={() => onClassClick(cls)} />
            ))
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full opacity-30 py-4">
            <span className="text-sm font-bold text-gray-400 italic">No classes scheduled</span>
          </div>
        )}
        
        {/* Quick Add Button */}
        <button 
          onClick={onAdd}
          className="h-[120px] w-28 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group ml-auto md:ml-0"
        >
            <div className="p-2 bg-gray-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                <Plus size={20} className="group-hover:scale-110 transition-transform"/>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">Add Slot</span>
        </button>
      </div>
    </div>
  );
};

const ClassBlock = ({ data, onClick }) => {
  const isLab = data.type === 'Lab';
  const isLeisure = data.type === 'Leisure';
  
  // Dynamic Styling based on Type
  let style = {
      bg: 'bg-white',
      border: 'border-indigo-100',
      accent: 'bg-indigo-500',
      text: 'text-indigo-900',
      subtext: 'text-gray-500',
      hover: 'hover:border-indigo-300 hover:shadow-indigo-100'
  };

  if (isLab) {
      style = {
          bg: 'bg-purple-50/30',
          border: 'border-purple-100',
          accent: 'bg-purple-500',
          text: 'text-purple-900',
          subtext: 'text-purple-600/70',
          hover: 'hover:border-purple-300 hover:shadow-purple-100'
      };
  } else if (isLeisure) {
      style = {
          bg: 'bg-green-50/30',
          border: 'border-green-100',
          accent: 'bg-green-500',
          text: 'text-green-900',
          subtext: 'text-green-600/70',
          hover: 'hover:border-green-300 hover:shadow-green-100'
      };
  }

  return (
    <div 
        onClick={onClick} 
        className={`relative w-full md:w-64 p-4 rounded-xl border ${style.bg} ${style.border} ${style.hover} transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer group flex flex-col justify-between min-h-[120px]`}
    >
      {/* Accent Bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${style.accent}`} />
      
      <div className="pl-3 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-bold text-base line-clamp-1 ${style.text}`} title={data.subject}>
            {data.subject || "Leisure"}
          </h4>
          {isLab && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase tracking-wide">LAB</span>}
          {isLeisure && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">FREE</span>}
        </div>

        {!isLeisure ? (
           <div className="space-y-1 mb-3">
              <div className="flex items-center text-xs font-semibold text-gray-500">
                 <Layers size={12} className="mr-1.5 opacity-50" /> 
                 <span className="truncate">{data.branch} • {getOrdinal(data.year)} Yr</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-gray-500">
                 <MapPin size={12} className="mr-1.5 opacity-50" /> 
                 <span className="truncate">Room {data.room}</span>
              </div>
           </div>
        ) : (
            <p className="text-xs text-gray-400 italic mb-3">Personal Time</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
            <div className={`flex items-center gap-1.5 text-xs font-bold ${style.subtext}`}>
                <Clock size={12} /> {data.time || `${data.startTime} - ${data.endTime}`}
            </div>
            {/* Batch/Section Pill */}
            {!isLeisure && (
                <div className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-500 shadow-sm">
                    {isLab ? `B${data.batch}` : `Sec ${data.section}`}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const ClassDetailsModal = ({ data, onClose, onDelete }) => {
  if (!data) return null;
  const isLab = data.type === 'Lab';
  const isLeisure = data.type === 'Leisure';
  
  const theme = isLab 
    ? { bg: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700', icon: 'text-purple-200' } 
    : isLeisure 
    ? { bg: 'bg-green-600', badge: 'bg-green-50 text-green-700', icon: 'text-green-200' } 
    : { bg: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700', icon: 'text-indigo-200' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-[500px] max-w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className={`px-8 py-6 ${theme.bg} relative overflow-hidden`}>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 shadow-sm ${theme.badge}`}>
                {isLab ? 'Laboratory' : isLeisure ? 'Leisure' : 'Lecture'}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{data.subject || "Free Period"}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-md">
              <X size={20} />
            </button>
          </div>
          {/* Decorative Icon */}
          <Grid className={`absolute -bottom-6 -right-6 w-32 h-32 ${theme.icon} opacity-20 rotate-12`} />
        </div>

        {/* Modal Body */}
        <div className="p-8 bg-white space-y-6">
           <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem label="Time Slot" value={data.time || `${data.startTime} - ${data.endTime}`} icon={<Clock size={16}/>} />
              <DetailItem label="Room Number" value={data.room} icon={<MapPin size={16}/>} />
              <DetailItem label="Class Details" value={`${data.branch || "CSE"} • ${getOrdinal(data.year)} Year`} icon={<Layers size={16}/>} />
              <DetailItem 
                label={isLab ? "Lab Batch" : "Section"} 
                value={isLab ? `Batch ${data.batch}` : `Section ${data.section}`} 
                icon={<Grid size={16}/>} 
              />
           </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 pb-8 pt-2 flex justify-end bg-gray-50/50 border-t border-gray-100">
           <button 
             onClick={onDelete} 
             className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl flex items-center gap-2 transition-all"
           >
             <Trash2 size={18} /> Remove Class
           </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon }) => (
    <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
            {icon} {label}
        </div>
        <p className="font-bold text-gray-800 text-lg">{value || "N/A"}</p>
    </div>
);

export default FacultySchedule;