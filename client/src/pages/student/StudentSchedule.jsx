import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Phone, Mail, BookOpen, Coffee, ExternalLink } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Helper to determine if a class is currently active
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
    // Only check "Live" if the active tab is today's actual day
    const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (activeDay !== currentDayName) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    try {
      const start = convertToMinutes(startStr);
      const end = convertToMinutes(endStr);
      return currentMinutes >= start && currentMinutes <= end;
    } catch (e) {
      return false;
    }
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
  }, [activeDay]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-sm font-medium text-gray-500">Syncing Timetable...</p>
      </div>
    );
  }

  const currentDayClasses = schedule?.[activeDay] || [];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER & DAY SELECTOR */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="text-gray-500" size={24} /> Weekly Schedule
            </h1>
            <p className="mt-1 text-sm text-gray-500">Detailed period-wise breakdown with faculty contacts.</p>
          </div>
          
          {/* Professional Segmented Control for Days */}
          <div className="flex bg-gray-200/80 p-1 rounded-lg overflow-x-auto no-scrollbar shadow-inner w-full lg:w-auto">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 lg:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeDay === day 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        {currentDayClasses.length === 0 ? (
          <div className="bg-white rounded-xl py-20 text-center border border-dashed border-gray-300 shadow-sm">
            <Coffee className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-sm font-semibold text-gray-900">No Academic Sessions</h3>
            <p className="text-sm text-gray-500 mt-1">You have no classes scheduled for {activeDay}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentDayClasses.map((cls, idx) => {
              const timeString = cls.time ? cls.time : `${cls.startTime} - ${cls.endTime}`;
              const isLive = isClassNow(timeString);

              return (
                <div 
                  key={idx} 
                  className={`relative bg-white rounded-xl p-5 transition-all flex flex-col h-full ${
                    isLive 
                      ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                      : 'border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  
                  {/* Live Now Floating Badge */}
                  {isLive && (
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      Live Now
                    </div>
                  )}

                  {/* Top Section: Time & Type */}
                  <div className="flex justify-between items-start mb-4 mt-1">
                    <div className={`flex items-center gap-2 text-sm font-medium ${isLive ? 'text-blue-600' : 'text-gray-600'}`}>
                      <Clock size={16} />
                      <span>{timeString}</span>
                    </div>
                    {cls.type === 'Lab' && (
                      <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-md border border-purple-100">
                        Lab
                      </span>
                    )}
                  </div>

                  {/* Body: Subject & Location */}
                  <div className="flex-1 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">
                      {cls.subject}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin size={16} className="text-gray-400 shrink-0" />
                      <span className="truncate">Room: {cls.room}</span>
                    </div>
                  </div>

                  {/* Footer: Faculty Profile */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={cls.facultyImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(cls.facultyName)}&background=f3f4f6&color=4b5563`} 
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                        alt={cls.facultyName}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{cls.facultyName}</p>
                        <p className="text-xs text-gray-500 truncate">Instructor</p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <a 
                        href={`tel:${cls.facultyPhone}`} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Call Instructor"
                      >
                        <Phone size={16} />
                      </a>
                      <a 
                        href={`mailto:${cls.facultyEmail}`} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Email Instructor"
                      >
                        <Mail size={16} />
                      </a>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSchedule;