import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Mail, BookOpen, Coffee, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const isClassNow = (timeStr) => {
  if (!timeStr || !timeStr.includes('-')) return false;

  const [startStr, endStr] = timeStr.split('-').map(s => s.trim());
  
  const convertToMinutes = (str) => {
    const [time, modifier] = str.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const start = convertToMinutes(startStr);
  const end = convertToMinutes(endStr);

  return currentMinutes >= start && currentMinutes <= end;
};
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data } = await axios.get('/api/student/full-schedule');
        if (data.success) {
          setSchedule(data.schedule);
          if (activeDay === "Sunday") setActiveDay("Monday");
        }
      } catch (err) {
        toast.error("Failed to fetch detailed timetable");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-600">Syncing Timetable...</div>;

  const currentDayClasses = schedule?.[activeDay] || [];
{currentDayClasses.map((cls, idx) => {
  const isLive = isClassNow(cls.time); // Check if this class is currently happening

  return (
    <div key={idx} className={`bg-white rounded-[32px] p-6 border transition-all group relative overflow-hidden ${
      isLive ? 'ring-2 ring-indigo-600 border-transparent shadow-indigo-100 shadow-2xl scale-[1.02]' : 'border-gray-100 shadow-sm'
    }`}>
      
      {/* Type Ribbon */}
      <div className={`absolute top-0 right-0 px-6 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
        isLive ? 'bg-red-600 text-white' : (cls.type === 'Lab' ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white')
      }`}>
        {isLive ? (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            Live Now
          </span>
        ) : cls.type}
      </div>

      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center gap-3 text-indigo-600 mb-4">
            <Clock size={20} className={isLive ? 'animate-spin-slow' : ''} />
            <span className={`text-xl font-black font-mono ${isLive ? 'text-indigo-900' : ''}`}>
               {cls.time}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">{cls.subject}</h3>
          
          <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mb-6">
            <MapPin size={16} className={isLive ? 'text-red-600 animate-bounce' : 'text-red-400'} />
            <span>Location: {cls.room}</span>
          </div>
        </div>

        {/* Faculty Contact */}
        <div className={`mt-4 pt-6 border-t flex items-center gap-4 ${isLive ? 'border-indigo-100' : 'border-gray-50'}`}>
          <img 
            src={cls.facultyImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.facultyName)}`} 
            className="h-14 w-14 rounded-2xl object-cover border-2 border-indigo-50"
            alt="Faculty"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Instructor</p>
            <p className="text-base font-bold text-gray-800 truncate">{cls.facultyName}</p>
          </div>
          <div className="flex gap-2">
             <a href={`tel:${cls.facultyPhone}`} className="p-2 bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-xl transition-all">
                <Phone size={18} />
             </a>
             <a href={`mailto:${cls.facultyEmail}`} className="p-2 bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all">
                <Mail size={18} />
             </a>
          </div>
        </div>
      </div>
    </div>
  );
})}

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Weekly Schedule</h1>
          <p className="text-gray-500 font-medium mt-1">Detailed period-wise breakdown with faculty contacts</p>
        </div>
        
        {/* Day Selector */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 overflow-x-auto no-scrollbar shadow-inner">
          {days.map(day => (
            
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeDay === day ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {currentDayClasses.length === 0 ? (
        <div className="bg-white rounded-[40px] p-24 text-center border-2 border-dashed border-gray-100">
          <Coffee className="mx-auto text-gray-200 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-300 italic">No academic sessions for {activeDay}</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentDayClasses.map((cls, idx) => (
            <div key={idx} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden">
              
              {/* Type Ribbon */}
              <div className={`absolute top-0 right-0 px-6 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${
                cls.type === 'Lab' ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {cls.type}
              </div>

              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-3 text-indigo-600 mb-4">
  <Clock size={20} className="shrink-0" />
  <span className="text-xl font-black font-mono">
    {/* Use cls.time or cls.startTime - cls.endTime depending on your Schema */}
    {cls.time ? cls.time : `${cls.startTime} - ${cls.endTime}`}
  </span>
</div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{cls.subject}</h3>
                  
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mb-6">
                    <MapPin size={16} className="text-red-500" />
                    <span>Location: {cls.room}</span>
                  </div>
                </div>

                {/* Faculty Contact Section */}
                <div className="mt-4 pt-6 border-t border-gray-50 flex items-center gap-4">
                  <img 
                    src={cls.facultyImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.facultyName)}&background=random`} 
                    className="h-14 w-14 rounded-2xl object-cover border-2 border-indigo-50"
                    alt="Faculty"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Instructor</p>
                    <p className="text-base font-bold text-gray-800 truncate">{cls.facultyName}</p>
                    
                    <div className="flex gap-4 mt-2">
                      <a href={`tel:${cls.facultyPhone}`} className="text-gray-400 hover:text-green-600 transition-colors">
                        <Phone size={16} />
                      </a>
                      <a href={`mailto:${cls.facultyEmail}`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Mail size={16} />
                      </a>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl text-gray-300 group-hover:text-indigo-600 transition-colors">
                    <ExternalLink size={20} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
};

export default StudentSchedule;