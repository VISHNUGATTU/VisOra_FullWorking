import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, TrendingUp, Search, 
  MessageCircle, Filter, CheckCircle, BookOpen 
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const FacultyDashboard = () => {
  const { user } = useAppContext();
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  
  // --- 1. MASTER LIST OF CLASSES ---
  // Stores all valid combinations: [{subject: "Java", year: 3, branch: "CSE", section: "A"}, ...]
  const [allClasses, setAllClasses] = useState([]);

  // --- 2. SELECTED FILTERS ---
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const COLORS = ['#10B981', '#EF4444']; 

  // --- FETCH MASTER LIST ON LOAD ---
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // Calling the new endpoint
        const { data } = await axios.get('/api/faculty/classes'); 
        if (data.success) {
          setAllClasses(data.classes);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    };
    fetchClasses();
  }, []);

  // --- SMART DROPDOWN LOGIC (Cascading) ---

  // A. Get Unique Subjects (Always available)
  const availableSubjects = useMemo(() => {
    return [...new Set(allClasses.map(c => c.subject))];
  }, [allClasses]);

  // B. Get Years -> Based on Selected Subject
  const availableYears = useMemo(() => {
    if (!selectedSubject) return [];
    return [...new Set(
      allClasses
        .filter(c => c.subject === selectedSubject)
        .map(c => c.year)
    )].sort();
  }, [allClasses, selectedSubject]);

  // C. Get Branches -> Based on Subject + Year
  const availableBranches = useMemo(() => {
    if (!selectedSubject || !selectedYear) return [];
    return [...new Set(
      allClasses
        .filter(c => c.subject === selectedSubject && c.year === Number(selectedYear))
        .map(c => c.branch)
    )].sort();
  }, [allClasses, selectedSubject, selectedYear]);

  // D. Get Sections -> Based on Subject + Year + Branch
  const availableSections = useMemo(() => {
    if (!selectedSubject || !selectedYear || !selectedBranch) return [];
    return [...new Set(
      allClasses
        .filter(c => c.subject === selectedSubject && c.year === Number(selectedYear) && c.branch === selectedBranch)
        .map(c => c.section)
    )].sort();
  }, [allClasses, selectedSubject, selectedYear, selectedBranch]);


  // --- FETCH ANALYTICS ---
  const fetchAnalytics = async () => {
    if(!selectedSubject || !selectedYear || !selectedBranch || !selectedSection) {
      return toast.error("Please select all fields");
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/faculty/analytics', {
        params: { 
          year: selectedYear, 
          branch: selectedBranch, 
          section: selectedSection,
          subject: selectedSubject
        }
      });

      if (response.data.success) {
        setData(response.data);
        if(response.data.stats.totalStudents === 0) toast("No students found.");
        else toast.success("Report loaded!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppWarning = (student) => {
    if (!student.phno) return toast.error("No phone number found");
    const message = `Hello ${student.name}, your attendance in ${selectedSubject} is critically low (${student.percentage}% - ${student.classesAttended}/${student.totalClasses} classes). Please meet me.`;
    window.open(`https://wa.me/${student.phno}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const chartData = data ? [
    { name: 'Safe (>75%)', value: data.stats.totalStudents - data.stats.defaulterCount },
    { name: 'Critical (<75%)', value: data.stats.defaulterCount }
  ] : [];

  return (
    <div className="p-6 min-h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* HEADER & FILTERS */}
      <div className="mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Analytics</h1>
          <p className="text-sm text-gray-500">Select a subject to view specific classes</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          
          {/* 1. SUBJECT (Primary Filter) */}
          <div className="relative">
             <BookOpen size={16} className="absolute left-3 top-3 text-indigo-500" />
             <select 
                value={selectedSubject} 
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  // Reset downstream filters
                  setSelectedYear(''); 
                  setSelectedBranch(''); 
                  setSelectedSection('');
                }}
                className="bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm rounded-lg p-2 pl-9 font-bold w-48 focus:ring-2 focus:ring-indigo-500 appearance-none"
             >
                <option value="" disabled>Select Subject</option>
                {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
             </select>
          </div>

          {/* 2. YEAR (Dependent on Subject) */}
          <select 
            value={selectedYear} 
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedBranch(''); 
              setSelectedSection('');
            }}
            disabled={!selectedSubject}
            className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="">Select Year</option>
            {availableYears.map(y => <option key={y} value={y}>{y} Year</option>)}
          </select>

          {/* 3. BRANCH (Dependent on Year) */}
          <select 
            value={selectedBranch} 
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedSection('');
            }}
            disabled={!selectedYear}
            className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 font-medium w-32 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="">Branch</option>
            {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* 4. SECTION (Dependent on Branch) */}
          <select 
            value={selectedSection} 
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedBranch}
            className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="">Section</option>
            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={fetchAnalytics}
            disabled={loading || !selectedSection}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold px-4 disabled:opacity-50 shadow-md shadow-indigo-100 ml-auto"
          >
            {loading ? "Loading..." : "Get Report"}
          </button>
        </div>
      </div>

      {data ? (
        <div className="space-y-6 animate-fade-in-up">
           
           {/* 1. STATS CARDS */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
              <div><p className="text-sm text-gray-500 font-medium">Total Students</p><h3 className="text-2xl font-bold text-gray-900">{data.stats.totalStudents}</h3></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24} /></div>
              <div><p className="text-sm text-gray-500 font-medium">Subject Average</p><h3 className="text-2xl font-bold text-gray-900">{data.stats.classAverage}%</h3></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
              <div><p className="text-sm text-gray-500 font-medium">Defaulters</p><h3 className="text-2xl font-bold text-red-600">{data.stats.defaulterCount}</h3></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 2. PIE CHART */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-1 flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-gray-800 mb-4 w-full text-center">Attendance Health</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. DEFAULTERS LIST */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50/30">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" /> Detained List (&lt; 75%)
                </h3>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{data.defaulters.length} Students</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[350px]">
                {data.defaulters.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8"><CheckCircle size={48} className="text-green-200 mb-2" /><p>No defaulters! Great job.</p></div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase text-gray-500 sticky top-0 shadow-sm z-10 bg-white">
                      <tr>
                        <th className="px-6 py-3">Roll No</th>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Stats</th>
                        <th className="px-6 py-3">Percentage</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.defaulters.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 text-sm font-mono text-gray-600">{student.rollno}</td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-800">{student.name}</td>
                          <td className="px-6 py-3 text-xs text-gray-500 font-mono">{student.classesAttended} / {student.totalClasses}</td>
                          <td className="px-6 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">{student.percentage}%</span></td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => sendWhatsAppWarning(student)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"><MessageCircle size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 bg-white rounded-3xl border border-dashed border-gray-300">
          <Filter size={48} className="mb-4 text-indigo-100" />
          <h3 className="text-lg font-bold text-gray-600">Enter Subject Details</h3>
          <p className="text-sm text-center max-w-sm mt-2">Select the Subject first, then the valid Year/Branch/Section options will appear automatically.</p>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;