import React, { useEffect, useState } from 'react';
import { User, Book, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await axios.get('/api/student/dashboard', { withCredentials: true });
        if (data.success) setData(data);
      } catch (err) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const { profile, overall, subjects } = data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      
      {/* 1. WELCOME & OVERALL STATS */}
      <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-3xl font-bold">
            {profile.name[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="opacity-80">{profile.rollno} • {profile.branch} {profile.year} Yr</p>
          </div>
        </div>

        <div className="text-center bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20 min-w-[200px]">
          <p className="text-sm uppercase font-bold tracking-widest opacity-80 mb-1">Overall Attendance</p>
          <h2 className="text-5xl font-black">{overall.percentage.toFixed(1)}%</h2>
          <div className="w-full bg-white/20 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-white h-full transition-all duration-1000" style={{ width: `${overall.percentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* 2. SUBJECT-WISE GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Book size={20} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${sub.status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {sub.status}
              </span>
            </div>
            
            <h3 className="font-bold text-gray-800 text-lg mb-1">{sub.subject}</h3>
            <p className="text-sm text-gray-400 mb-4">{sub.presentClasses} attended out of {sub.totalClasses}</p>

            <div className="flex items-end justify-between">
               <span className="text-3xl font-black text-gray-900">{sub.percentage.toFixed(0)}%</span>
               {sub.status === 'Critical' && (
                 <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold animate-pulse">
                   <AlertCircle size={12}/> Attend {sub.classesToAttend} more classes
                 </div>
               )}
            </div>
            
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${sub.status === 'Critical' ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${sub.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentDashboard;