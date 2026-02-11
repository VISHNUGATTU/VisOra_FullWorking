import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Coffee,
  ArrowRight,
  FlaskConical, // Icon for Lab
  BookOpen      // Icon for Lecture
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

/* ================= HELPERS ================= */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Helper to convert "09:00 AM" to minutes for comparison
const convertToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  // Handle "09:00 AM - 10:00 AM" format -> take first part
  const startStr = timeStr.split(' - ')[0]; 
  const [time, modifier] = startStr.split(' ');
  let [hours, minutes] = time.split(':');

  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

  return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
};

const FacultyHome = () => {
  const navigate = useNavigate();
  const { axios, user, facultyInfo } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [dashboardData, setDashboardData] = useState({
    nextClass: null,
    totalToday: 0,
    lecturesToday: 0,
    labsToday: 0,
    studentsPresentToday: 0, // Placeholder until attendance API exists
  });

  /* ================= CLOCK & GREETING ================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getGreeting());
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  /* ================= FETCH REAL DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/faculty/schedule');

        if (data.success) {
          const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const todaysClasses = data.schedule[todayName] || [];

          // 1. Calculate Stats
          let lectures = 0;
          let labs = 0;
          todaysClasses.forEach(c => {
            if (c.type === 'Lab') labs++;
            else if (c.type !== 'Leisure') lectures++;
          });

          // 2. Find Next Class
          const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
          
          // Sort classes by time
          const sortedClasses = todaysClasses.sort((a, b) => 
            convertToMinutes(a.time) - convertToMinutes(b.time)
          );

          // Find first class where startTime > currentTime
          const next = sortedClasses.find(c => {
            // Filter out leisure for "Next Class" display usually
            if(c.type === 'Leisure') return false; 
            return convertToMinutes(c.time) > currentMinutes;
          });

          setDashboardData({
            nextClass: next || null,
            totalToday: lectures + labs,
            lecturesToday: lectures,
            labsToday: labs,
            studentsPresentToday: 0 
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [axios]);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 text-gray-800 animate-fade-in-up">
      
      {/* ================= HEADER ================= */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {facultyInfo?.name || "Professor"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back to VisOra System where presence meets intelligence.
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-3xl font-bold text-indigo-600 font-mono">
            {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {currentTime.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ================= STATUS GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* NEXT CLASS CARD (Dynamic Color) */}
        <div 
          className={`md:col-span-2 rounded-xl p-6 text-white shadow-lg relative overflow-hidden transition-all
            ${dashboardData.nextClass?.type === 'Lab' 
              ? 'bg-gradient-to-r from-purple-700 to-pink-600' // Lab Theme
              : 'bg-gradient-to-r from-indigo-600 to-blue-600' // Lecture Theme
            }`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white/80 text-sm font-bold uppercase tracking-wider mb-2">
              <Clock size={16} /> Up Next
            </div>

            {loading ? (
              <div className="space-y-2">
                 <div className="h-8 w-3/4 bg-white/20 animate-pulse rounded" />
                 <div className="h-6 w-1/2 bg-white/20 animate-pulse rounded" />
              </div>
            ) : dashboardData.nextClass ? (
              <>
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-bold mb-1 leading-tight">
                    {dashboardData.nextClass.subject}
                  </h2>
                  {dashboardData.nextClass.type === 'Lab' && (
                    <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-xs font-bold border border-white/10">
                      LAB SESSION
                    </span>
                  )}
                </div>
                
                <p className="text-white/90 font-medium mb-4">
                  {dashboardData.nextClass.year} Year • {dashboardData.nextClass.batch || dashboardData.nextClass.section || "Sec A"}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-white/90">
                  <span className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm border border-white/10">
                    <Clock size={14} />
                    {dashboardData.nextClass.time}
                  </span>
                  <span className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm border border-white/10">
                    <MapPin size={14} />
                    {dashboardData.nextClass.room}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center h-full py-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Coffee size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">No classes coming up</h2>
                    <p className="text-sm text-white/80">You are all caught up for today!</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Background Decor */}
          {dashboardData.nextClass?.type === 'Lab' ? (
            <FlaskConical className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32 rotate-12" />
          ) : (
            <BookOpen className="absolute -bottom-4 -right-4 text-white/10 w-32 h-32 rotate-12" />
          )}
        </div>

        {/* TODAY'S LECTURES */}
        <StatusCard
          icon={<BookOpen size={20} />}
          label="Lectures Today"
          value={dashboardData.lecturesToday}
          color="blue"
          loading={loading}
          total={dashboardData.totalToday}
        />

        {/* TODAY'S LABS */}
        <StatusCard
          icon={<FlaskConical size={20} />}
          label="Labs Today"
          value={dashboardData.labsToday}
          color="purple"
          loading={loading}
          total={dashboardData.totalToday}
        />
      </div>

      {/* ================= MAIN ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* QUICK ACTIONS */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="text-indigo-600" size={20} /> Quick Actions
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ActionButton
              icon={<Calendar className="text-indigo-600" size={24} />}
              title="Manage Schedule"
              desc="Add or Edit Classes"
              onClick={() => navigate("/faculty/schedule")}
              bg="indigo"
            />
            <ActionButton
              icon={<Users className="text-green-600" size={24} />}
              title="Mark Attendance"
              desc="Record Student Data"
              // Placeholder route - update when you have this page
              onClick={() => navigate("/faculty/manual-attendance")} 
              bg="green"
            />
            <ActionButton
              icon={<AlertCircle className="text-orange-600" size={24} />}
              title="Profile Settings"
              desc="Update Details"
              onClick={() => navigate("/faculty/profile")}
              bg="orange"
            />
          </div>
        </div>

        {/* SYSTEM STATUS (Mock/Static for now) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            System Connectivity
          </h3>
          <div className="space-y-4">
            <SystemStatusRow label="Database Connection" status="online" />
            <SystemStatusRow label="Cloudinary Storage" status="online" />
            <SystemStatusRow label="AI Face Recognition" status="maintenance" />
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition"
            >
              Refresh Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= SUB COMPONENTS ================= */

const StatusCard = ({ icon, label, value, color, loading }) => (
  <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition hover:shadow-md border-l-4 border-l-${color}-500`}>
    <div className="flex justify-between items-start">
      <div>
         <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{label}</p>
         {loading ? (
            <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          )}
      </div>
      <div className={`w-10 h-10 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  </div>
);

const ActionButton = ({ icon, title, desc, onClick, bg }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-start p-4 rounded-xl border border-transparent transition-all group text-left relative overflow-hidden
      bg-${bg}-50 hover:bg-${bg}-100 hover:shadow-sm hover:scale-[1.02] active:scale-95`}
  >
    <div className="mb-3 p-2 bg-white rounded-lg shadow-sm">
      {icon}
    </div>
    <span className={`font-bold text-gray-800 group-hover:text-${bg}-700`}>
      {title}
    </span>
    <span className="text-xs text-gray-500 mt-1 font-medium">{desc}</span>
    
    {/* Decorative Icon in background */}
    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 scale-150 text-gray-900">
      {icon}
    </div>
  </button>
);

const SystemStatusRow = ({ label, status }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${
          status === "online" ? "bg-green-500 animate-pulse" : "bg-yellow-400"
        }`}
      />
      <span className={`text-xs font-bold capitalize ${status === 'online' ? 'text-green-600' : 'text-yellow-600'}`}>
        {status}
      </span>
    </div>
  </div>
);

export default FacultyHome;