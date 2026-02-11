import React, { useState, useEffect } from 'react';
import { 
  Activity, Server, Bell, ShieldCheck, 
  AlertTriangle, Cpu, Clock, RefreshCw,
  Construction // Importing the construction icon
} from 'lucide-react';
import axios from 'axios';

const AdminHome = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [systemHealth, setSystemHealth] = useState({
    aiEngine: 'maintenance', 
    database: 'unknown',
    telegramBot: 'maintenance', 
    latency: 0
  });

  const [liveStats, setLiveStats] = useState({
    activeClasses: 0,
    studentsPresentToday: 0,
    pendingApprovals: 0
  });

  const [logs, setLogs] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; 
      const config = { withCredentials: true };

      const [healthRes, statsRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/system/health`, config), 
        axios.get(`${BASE_URL}/api/admin/stats`, config),
        axios.get(`${BASE_URL}/api/admin/logs?limit=5`, config)
      ]);

      setSystemHealth(healthRes.data);
      setLiveStats(statsRes.data);
      setLogs(logsRes.data);
      setLastUpdated(new Date());

    } catch (err) {
      console.error("Sync Error:", err);
      setSystemHealth(prev => ({ 
        ...prev, 
        database: 'disconnected',
        latency: 0 
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(); 
    const interval = setInterval(fetchDashboardData, 30000); 
    return () => clearInterval(interval);
  }, []);

  // --- FEATURE NOT READY HANDLER ---
  const handleFeatureNotReady = (featureName) => {
    // You can replace this alert with a Toast notification later
    alert(`🚧 [${featureName}] is currently under development.`);
  };

  // --- UI RENDER ---

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 text-gray-800">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Command Center</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
             <p className="text-sm text-gray-500">
               {loading ? 'Syncing...' : `Last synced: ${lastUpdated.toLocaleTimeString()}`}
             </p>
          </div>
        </div>
        
        <button 
          onClick={fetchDashboardData} 
          className="mt-4 sm:mt-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* HEALTH GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <StatusCard 
          icon={<Cpu size={20} />} 
          title="AI Engine" 
          status={systemHealth.aiEngine} 
          subtext="Integration Pending"
        />
        
        <StatusCard 
          icon={<Server size={20} />} 
          title="Database" 
          status={systemHealth.database} 
          subtext={
             systemHealth.database === 'connected' ? (
               systemHealth.latency > 200 
                 ? <span className="text-orange-500 font-bold">{systemHealth.latency}ms (High Latency)</span> 
                 : <span className="text-green-600 font-medium">{systemHealth.latency}ms (Optimal)</span>
             ) : (
               <span className="text-red-500 font-medium flex items-center gap-1">
                 <AlertTriangle size={12}/> Check Connection
               </span>
             )
          }
        />

        <StatusCard 
          icon={<Bell size={20} />} 
          title="Telegram Bot" 
          status={systemHealth.telegramBot} 
          subtext="Config Required"
        />

        <StatusCard 
          icon={<ShieldCheck size={20} />} 
          title="Security" 
          status="secure" 
          subtext="Auth Token Valid"
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LIVE OPS */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="text-indigo-600" size={20}/> 
              Live Statistics
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatBox label="Active Classes" value={liveStats.activeClasses} color="indigo" loading={loading} />
            <StatBox label="Today's Presence" value={liveStats.studentsPresentToday} color="emerald" loading={loading} />
            <StatBox label="Pending Requests" value={liveStats.pendingApprovals} color="orange" loading={loading} />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h3>
            
            {/* --- QUICK ACTIONS GRID --- */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* UPDATED: Changed 'Add Faculty' to 'Alert Faculty' */}
              <ActionButton 
                label="Alert Faculty" 
                onClick={() => handleFeatureNotReady("Alert Faculty")} 
                isWarning={true} // Optional flag to style it differently
              />
              <ActionButton label="View Reports" onClick={() => handleFeatureNotReady("View Reports")} />
              <ActionButton label="Broadcast" onClick={() => handleFeatureNotReady("Broadcast")} />
              <ActionButton label="System Reset" onClick={() => handleFeatureNotReady("System Reset")} />
            </div>

          </div>
        </div>

        {/* LOGS FEED */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="text-gray-500" size={20} />
            System Logs
          </h2>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
            {logs.length === 0 && !loading ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent logs</p>
            ) : (
              logs.map((log, index) => (
                <LogItem key={index} time={log.time} text={log.message} type={log.type} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const StatusCard = ({ icon, title, status, subtext }) => {
  const isOnline = status === 'online' || status === 'connected' || status === 'secure';
  const isOffline = status === 'offline' || status === 'disconnected';
  const isMaintenance = status === 'maintenance' || status === 'unknown';

  let statusColor = 'bg-gray-300';
  let textColor = 'text-gray-400';
  let statusText = status || 'Unknown';

  if (isOnline) {
    statusColor = 'bg-green-500';
    textColor = 'text-gray-900';
  } else if (isOffline) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (isMaintenance) {
    statusColor = 'bg-yellow-400';
    textColor = 'text-yellow-600';
    statusText = 'In Progress';
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor} ${isMaintenance ? 'animate-pulse' : ''}`}></div>
        <span className={`font-medium capitalize ${textColor}`}>
          {statusText}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-1 min-h-[1.25rem]">{subtext}</div>
    </div>
  );
};

const StatBox = ({ label, value, color, loading }) => (
  <div className={`bg-${color}-50 p-4 rounded-xl border border-${color}-100`}>
    <p className={`text-${color}-600 text-sm font-medium mb-1`}>{label}</p>
    {loading ? (
      <div className={`h-8 w-16 bg-${color}-200 rounded animate-pulse`}></div>
    ) : (
      <p className={`text-${color}-900 text-2xl font-bold`}>{value}</p>
    )}
  </div>
);

// Updated ActionButton to handle "Warning" styling if needed
const ActionButton = ({ label, onClick, isWarning }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-2 bg-white text-sm font-medium rounded-lg border transition-all shadow-sm active:scale-95
      ${isWarning 
        ? 'hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 border-gray-200' 
        : 'hover:bg-yellow-50 hover:border-yellow-200 text-gray-600 hover:text-yellow-700 border-gray-200'
      }`}
  >
    {label}
  </button>
);

const LogItem = ({ time, text, type }) => {
  const colors = {
    error: 'border-l-red-500 bg-red-50',
    warning: 'border-l-orange-500 bg-orange-50',
    success: 'border-l-green-500 bg-green-50',
    info: 'border-l-blue-500 bg-blue-50'
  };
  return (
    <div className={`text-sm p-3 border-l-4 rounded-r-lg ${colors[type] || colors.info}`}>
      <span className="text-xs font-mono text-gray-500 block mb-1">{time}</span>
      <span className="text-gray-800">{text}</span>
    </div>
  );
};

export default AdminHome;