import React, { useEffect, useState } from 'react';
import { CalendarIcon, User, Clock, AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get('/api/student/history', { withCredentials: true });
        if (data.success) setHistory(data.history);
      } catch (err) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-600">Loading History...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-gray-900">Absence History</h1>
        </div>
        <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold border border-red-100">
          Total Absences: {history.length}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <Clock size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Perfect Record!</h2>
          <p className="text-gray-400 mt-2">You haven't missed a single class. Keep it up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 hover:border-red-200 transition-all group">
              
              {/* DATE BLOCK */}
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl px-4 py-2 min-w-[80px] group-hover:bg-red-50 transition-colors">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter group-hover:text-red-400">
                  {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-xl font-black text-gray-800 group-hover:text-red-600">
                  {new Date(record.date).getDate()}
                </span>
              </div>

              {/* DETAILS */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${record.type === 'Lab' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {record.type}
                  </span>
                  <h3 className="font-bold text-gray-800 text-lg">{record.subject}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1"><User size={14}/> {record.faculty}</span>
                  <span className="flex items-center gap-1"><CalendarIcon size={14}/> {new Date(record.date).getFullYear()}</span>
                </div>
              </div>

              {/* ABSENT TAG */}
              <div className="hidden sm:block">
                <span className="bg-red-100 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Absent
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DISPUTE NOTICE */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 items-start">
        <AlertCircle className="text-amber-600 shrink-0" size={18} />
        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
          <b>Dispute a Record?</b> If you were present but marked absent for any of the classes above, please contact the respective faculty member or the admin office within 4 to 6 hours of the class date.
        </p>
      </div>
    </div>
  );
};

export default AttendanceHistory;