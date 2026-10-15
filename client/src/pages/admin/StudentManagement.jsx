import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiUserPlus,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiBriefcase,
  FiAlertTriangle,
  FiRefreshCw,
  FiCpu
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

const StudentManagement = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState(null);

  const handleSyncBiometrics = async () => {
    try {
      setSyncing(true);
      toast.loading("Synchronizing student embeddings with FAISS neural store...", { id: "syncNeural" });
      const { data } = await axios.post("/api/student/sync-neural");
      toast.dismiss("syncNeural");
      if (data.success) {
        setSyncStats(data);
        toast.success(`Synced ${data.synced} students (${data.total} total vectors) to Neural Engine!`);
      } else {
        toast.error(data.message || "Failed to sync biometric vectors.");
      }
    } catch (err) {
      toast.dismiss("syncNeural");
      console.error("Neural sync error:", err);
      toast.error(err.response?.data?.message || "Error connecting to Neural Engine.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await axios.get('/api/admin/student-stats');
        setDashboardData(response.data);
        console.log("Chart Data:", response.data.departmentData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate total low attendance across all departments for the left stats column
  const totalLowAttendance = dashboardData?.departmentData?.reduce(
    (acc, curr) => acc + curr.lowAttendance, 0
  ) || 0;

  // Static Action Cards (Fixed Tailwind Dynamic Classes)
  const actionCards = [
    {
      title: "Add Student",
      desc: "Register a new student into the system",
      icon: <FiUserPlus className="w-5 h-5" />,
      path: "/admin/student-management/add",
      theme: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Update Student",
      desc: "Edit existing student details",
      icon: <FiEdit className="w-5 h-5" />,
      path: "/admin/student-management/update",
      theme: "bg-purple-50 text-purple-600",
    },
    {
      title: "Delete Student",
      desc: "Remove a student permanently",
      icon: <FiTrash2 className="w-5 h-5" />,
      path: "/admin/student-management/delete",
      theme: "bg-red-50 text-red-600",
    },
  ];

  // Custom Tooltip for the chart to format the hover data professionally
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 rounded-xl shadow-lg">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-indigo-600 font-medium">
              Total Enrolled: {payload[0].value}
            </p>
            <p className="text-rose-600 font-medium">
              <span className="text-slate-500 mr-1">&lt; 75% Attendance:</span> 
              {payload[1].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in-up pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Student Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage enrollments and monitor department attendance.</p>
        </div>
        <div className="flex items-center gap-3">
          {syncStats && (
            <span className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium">
              {syncStats.synced} Enrolled in FAISS
            </span>
          )}
          <button
            onClick={handleSyncBiometrics}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm shadow-indigo-600/30 transition disabled:opacity-60"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing FAISS..." : "Sync AI Biometrics"}</span>
          </button>
        </div>
      </div>

      {/* MAIN ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actionCards.map((c) => (
          <button
            key={c.title}
            onClick={() => navigate(c.path)}
            className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition text-left group"
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl mb-4 transition-transform group-hover:scale-110 ${c.theme}`}>
              {c.icon}
            </div>
            <h3 className="font-bold text-slate-800">{c.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
          </button>
        ))}
      </div>

      <hr className="border-slate-100" />

      {/* DYNAMIC DASHBOARD DATA */}
      {isLoading ? (
        <div className="animate-pulse flex gap-8">
          <div className="w-1/3 flex flex-col gap-4">
            <div className="h-24 bg-slate-200 rounded-3xl w-full"></div>
            <div className="h-24 bg-slate-200 rounded-3xl w-full"></div>
            <div className="h-24 bg-slate-200 rounded-3xl w-full"></div>
          </div>
          <div className="w-2/3 h-80 bg-slate-200 rounded-3xl"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: 3 Rows of Stats */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            
            <div className="flex-1 flex flex-col justify-center p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><FiUsers className="w-5 h-5"/></div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</h2>
              </div>
              <p className="text-2xl font-bold text-slate-800 ml-1">{dashboardData.totalStudents}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><FiBriefcase className="w-5 h-5"/></div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</h2>
              </div>
              <p className="text-2xl font-bold text-slate-800 ml-1">{dashboardData.departmentCount}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center p-5 bg-white border border-rose-100 rounded-3xl shadow-sm bg-rose-50/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600"><FiAlertTriangle className="w-5 h-5"/></div>
                <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider">At Risk (&lt;75%)</h2>
              </div>
              <p className="text-2xl font-bold text-rose-700 ml-1">{totalLowAttendance}</p>
            </div>

          </div>

          {/* RIGHT SIDE: Grouped Bar Graph */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl shadow-sm p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Attendance Overview by Department</h2>
            
            <div className="flex-1 min-h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.departmentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="department" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: '#64748b' }}
                  />
                  
                  {/* Primary Bar: Total Students */}
                  <Bar name="Total Enrolled" dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                  
                  {/* Secondary Bar: Low Attendance */}
                  <Bar name="Attendance < 75%" dataKey="lowAttendance" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default StudentManagement;