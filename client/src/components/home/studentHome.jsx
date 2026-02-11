import React, { useState, useEffect } from 'react';
import { 
  User, Clock, BookOpen, MapPin, 
  ChevronRight, Award, AlertCircle, 
  Calendar as CalendarIcon, Zap
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

  if (loading) return <div className="h-screen flex items-center justify-center animate-pulse text-indigo-600 font-bold">VisOra Loading...</div>;

  const percentage = data?.overallPercentage || 0;
  const statusColor = percentage >= 75 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 text-gray-800 font-sans animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Hey, {data?.greeting || "Student"}! 👋
          </h1>
          <p className="text-gray-500 font-medium">Your academic pulse for today.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xl font-bold text-indigo-600 font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- MAIN ATTENDANCE CARD --- */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="relative flex-shrink-0">
             {/* Progress Ring */}
             <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * percentage) / 100}
                  className={`${statusColor} transition-all duration-1000 ease-out`}
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-gray-900">{Math.round(percentage)}%</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendance</span>
             </div>
          </div>

          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-800">Attendance Status</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              {percentage >= 75 
                ? "You're in the safe zone! Keep maintaining this consistency to stay eligible for exams." 
                : "Attention! Your attendance has dropped below the 75% threshold. Prioritize your upcoming classes."}
            </p>
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto md:mx-0"
            >
              View Subject-wise <ChevronRight size={16}/>
            </button>
          </div>

          <Zap className="absolute -top-6 -right-6 text-indigo-50 w-32 h-32 rotate-12" />
        </div>

        {/* --- MINI STATS --- */}
        <div className="space-y-4">
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Award size={24}/></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Classes Attended</p>
                <p className="text-2xl font-bold text-gray-900">{data?.summary?.presentClasses || 0}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CalendarIcon size={24}/></div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Total Conducted</p>
                <p className="text-2xl font-bold text-gray-900">{data?.summary?.totalClasses || 0}</p>
              </div>
           </div>
        </div>
      </div>

      {/* --- TODAY'S TIMELINE --- */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
    <Clock className="text-indigo-600" size={22} /> Today's Schedule
  </h3>

  {/* ✅ ADDED EXTRA SAFETY CHECKS HERE */}
  {!data || !data.todaysClasses || data.todaysClasses.length === 0 ? (
    <div className="text-center py-10">
      <p className="text-gray-400 italic">No classes scheduled for today.</p>
    </div>
  ): (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            {data.todaysClasses.map((cls, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Dot */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   <BookOpen size={16} />
                </div>
                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[45%] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group-hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <time className="font-mono text-xs font-bold text-indigo-600">{cls.time}</time>
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">{cls.type}</span>
                  </div>
                  <h4 className="font-bold text-gray-800">{cls.subject}</h4>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {cls.room}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- QUICK LINKS --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
         <QuickLink icon={<AlertCircle size={20}/>} label="Report Error" onClick={() => alert("Redirect to Support")} color="orange" />
         <QuickLink icon={<Clock size={20}/>} label="History" onClick={() => navigate('/student/history')} color="blue" />
         <QuickLink icon={<User size={20}/>} label="Profile" onClick={() => navigate('/student/profile')} color="indigo" />
         <QuickLink icon={<CalendarIcon size={20}/>} label="Full Schedule" onClick={() => navigate('/student/schedule')} color="purple" />
      </div>

    </div>
  );
};

const QuickLink = ({ icon, label, onClick, color }) => (
  <button onClick={onClick} className={`p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-${color}-200 transition-all flex flex-col items-center gap-2 group`}>
    <div className={`p-2 bg-${color}-50 text-${color}-600 rounded-lg group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <span className="text-xs font-bold text-gray-600">{label}</span>
  </button>
);

export default StudentHome;