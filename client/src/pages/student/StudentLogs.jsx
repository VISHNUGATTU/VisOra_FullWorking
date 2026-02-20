import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle, X, Clock, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const StudentLogs = () => {
  const { axios } = useAppContext();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- MODAL STATES ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);

  // --- FETCH LOGS ---
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetching from the student logs endpoint
      const res = await axios.get('/api/logs/student');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load your activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // --- DELETE HANDLERS ---
  const initiateDelete = (id) => {
    setSelectedLogId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedLogId) return;
    try {
      const res = await axios.delete(`/api/logs/${selectedLogId}`);
      if (res.data.success) {
        setLogs(logs.filter((log) => log._id !== selectedLogId));
        setShowDeleteModal(false);
        setSelectedLogId(null);
        toast.success("Log entry removed");
      }
    } catch (err) {
      toast.error("Error deleting log");
    }
  };

  const confirmClearAll = async () => {
    try {
      // Clearing student specific logs
      const res = await axios.delete('/api/logs/student');
      if (res.data.success) {
        setLogs([]);
        setShowClearAllModal(false);
        toast.success("Activity history cleared");
      }
    } catch (err) {
      toast.error("Error clearing logs");
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return <span className="flex items-center text-green-600 px-2 py-1 bg-green-100 rounded-full text-[10px] font-bold uppercase"><CheckCircle size={12} className="mr-1"/> Success</span>;
      case 'Failed':
        return <span className="flex items-center text-red-600 px-2 py-1 bg-red-100 rounded-full text-[10px] font-bold uppercase"><XCircle size={12} className="mr-1"/> Failed</span>;
      case 'Warning':
        return <span className="flex items-center text-yellow-600 px-2 py-1 bg-yellow-100 rounded-full text-[10px] font-bold uppercase"><AlertTriangle size={12} className="mr-1"/> Warning</span>;
      default:
        return <span className="text-gray-500 text-xs font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Activity Logs</h1>
          <p className="text-gray-500 text-sm">Review your account activity and system interactions.</p>
        </div>
        <div className="space-x-2 flex">
          <button 
            onClick={fetchLogs} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-md font-medium text-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          
          {logs.length > 0 && (
            <button 
              onClick={() => setShowClearAllModal(true)} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center shadow-md font-medium text-sm"
            >
              <Trash2 size={16} className="mr-2" /> Clear History
            </button>
          )}
        </div>
      </div>

      {/* TABLE CONTENT */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-400 font-bold tracking-widest animate-pulse">
           SYNCING ACTIVITY LOGS...
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 bg-red-50 rounded-xl border border-red-100 font-medium">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Clock size={32} />
          </div>
          <h3 className="text-gray-800 font-bold text-lg">No Activity Recorded</h3>
          <p className="text-sm text-gray-500">Your recent actions will be logged here automatically.</p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-800">{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] font-medium text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>

                    {/* Action Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-[10px] font-black rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-tighter">
                        {log.actionType}
                      </span>
                    </td>

                    {/* Message Details */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-800">{log.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1 italic max-w-xs">{log.message}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Delete Option */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button 
                        onClick={() => initiateDelete(log._id)} 
                        className="text-gray-300 hover:text-red-600 transition p-2 rounded-xl hover:bg-red-50"
                        title="Delete entry"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL (SINGLE DELETE) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Remove Entry?</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
              Are you sure you want to remove this specific log? This will delete the record permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL (CLEAR ALL) --- */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowClearAllModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200 border-t-8 border-red-600">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-100 rounded-full text-red-600 mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Wipe History?</h3>
              <p className="text-gray-500 mt-2 font-medium leading-relaxed">
                This will permanently delete your entire activity history. This action cannot be reversed.
              </p>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Keep History
              </button>
              <button 
                onClick={confirmClearAll}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
              >
                Wipe All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentLogs;