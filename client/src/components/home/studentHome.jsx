import React, { useState, useEffect } from 'react';
import { 
  User, Clock, BookOpen, MapPin, 
  ChevronRight, Award, AlertCircle, 
  Calendar as CalendarIcon, Loader2,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';

const StudentHome = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await axios.get('/api/student/home-data', { withCredentials: true });
        if (res.data.success) setData(res.data);
      } catch (err) {
        console.error("Error loading student home", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="font-medium text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  const percentage = data?.overallPercentage || 0;
  
  // --- ATTENDANCE LOGIC ---
  let statusColor = 'text-rose-500';
  let statusMessage = "Warning: Your attendance is critically low. Immediate action is required to avoid penalties.";
  
  if (percentage >= 75) {
    statusColor = 'text-emerald-500';
    statusMessage = "You are maintaining good attendance. Keep up the consistency to ensure exam eligibility.";
  } else if (percentage >= 50) {
    statusColor = 'text-orange-500';
    statusMessage = "Your attendance is below the 75% safe zone. Please prioritize your upcoming classes.";
  }

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen bg-gray-50/50 text-gray-800 font-sans animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back, {data?.greeting || "Student"}
            </h1>
            {data?.biometricEnrolled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck size={14} className="text-emerald-600" />
                Neural Biometrics Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle size={14} className="text-amber-600" />
                Biometrics Pending
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">Here is your academic overview for today.</p>
        </div>
        <div className="hidden sm:flex flex-col items-end bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-lg font-semibold text-gray-900">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-gray-500 font-medium">
            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- MAIN ATTENDANCE CARD --- */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden">
          
          {/* Progress Ring (Fixed with viewBox for accurate math) */}
          <div className="relative flex-shrink-0">
             <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-40 md:h-40 transform -rotate-90">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                <circle 
                  cx="50" cy="50" r="45" 
                  stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * percentage) / 100}
                  strokeLinecap="round"
                  className={`${statusColor} transition-all duration-1000 ease-out`}
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-gray-900">{Math.round(percentage)}%</span>
             </div>
          </div>

          <div className="space-y-4 text-center sm:text-left flex-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Attendance Status</h2>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-md">
                {statusMessage}
              </p>
            </div>
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors w-full sm:w-auto"
            >
              View Subject Breakdown <ChevronRight size={16}/>
            </button>
          </div>
        </div>

        {/* --- STATS CARDS --- */}
        <div className="flex flex-col gap-6">
           <StatCard 
             icon={<Award className="w-6 h-6 text-indigo-600" />} 
             label="Classes Attended" 
             value={data?.summary?.presentClasses || 0} 
             bg="bg-indigo-50" 
           />
           <StatCard 
             icon={<CalendarIcon className="w-6 h-6 text-emerald-600" />} 
             label="Total Conducted" 
             value={data?.summary?.totalClasses || 0} 
             bg="bg-emerald-50" 
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- TODAY'S TIMELINE --- */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-gray-400" size={20} /> Today's Schedule
            </h3>
          </div>

          {!data?.todaysClasses?.length ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">No classes scheduled for today.</p>
              <p className="text-sm text-gray-400 mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-6 border-l-2 border-gray-100 ml-3">
              {data.todaysClasses.map((cls, idx) => (
                <div key={idx} className="relative pl-8 sm:pl-10">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-500 shadow-sm" />
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group">
                    <div className="flex flex-wrap gap-2 justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                        {cls.subject}
                      </h4>
                      <span className="text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 uppercase tracking-wide">
                        {cls.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                        <Clock size={14}/> {cls.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-400"/> {cls.room}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- QUICK LINKS --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 h-fit">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          {/* Changed to grid-cols-3 to perfectly balance the remaining links */}
          <div className="grid grid-cols-3 gap-4">
             <QuickLink icon={<AlertCircle size={20}/>} label="Support" onClick={() => alert("Redirect to Support")} variant="rose" />
             <QuickLink icon={<User size={20}/>} label="Profile" onClick={() => navigate('/student/profile')} variant="indigo" />
             <QuickLink icon={<CalendarIcon size={20}/>} label="Schedule" onClick={() => navigate('/student/schedule')} variant="slate" />
          </div>
        </div>
      </div>

    </div>
  );
};

// Extracted Sub-components
const StatCard = ({ icon, label, value, bg }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 flex-1">
    <div className={`p-4 rounded-xl ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  </div>
);

const QuickLink = ({ icon, label, onClick, variant }) => {
  const styles = {
    rose: 'bg-rose-50 text-rose-600 hover:border-rose-200 hover:bg-rose-50/50',
    indigo: 'bg-indigo-50 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50',
    slate: 'bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
  };

  const activeStyle = styles[variant] || styles.slate;

  return (
    <button 
      onClick={onClick} 
      className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-2 group"
    >
      <div className={`p-3 rounded-lg transition-colors ${activeStyle}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
};

export default StudentHome;