import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';

const AdminLogs = () => {
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
    try {
      const res = await axios.get('/api/logs/admin');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // --- DELETE HANDLERS ---
  
  // 1. Trigger the Single Delete Modal
  const initiateDelete = (id) => {
    setSelectedLogId(id);
    setShowDeleteModal(true);
  };

  // 2. Confirm Single Delete (API Call)
  const confirmDelete = async () => {
    if (!selectedLogId) return;
    
    try {
      const res = await axios.delete(`/api/logs/${selectedLogId}`);
      if (res.data.success) {
        setLogs(logs.filter((log) => log._id !== selectedLogId));
        setShowDeleteModal(false);
        setSelectedLogId(null);
      }
    } catch (err) {
      alert("Error deleting log");
    }
  };

  // 3. Confirm Clear All (API Call)
  const confirmClearAll = async () => {
    try {
      const res = await axios.delete('/api/logs/admin');
      if (res.data.success) {
        setLogs([]);
        setShowClearAllModal(false);
      }
    } catch (err) {
      alert("Error clearing logs");
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return <span className="flex items-center text-green-600 px-2 py-1 bg-green-100 rounded-full text-xs font-medium"><CheckCircle size={14} className="mr-1"/> Success</span>;
      case 'Failed':
        return <span className="flex items-center text-red-600 px-2 py-1 bg-red-100 rounded-full text-xs font-medium"><XCircle size={14} className="mr-1"/> Failed</span>;
      case 'Warning':
        return <span className="flex items-center text-yellow-600 px-2 py-1 bg-yellow-100 rounded-full text-xs font-medium"><AlertTriangle size={14} className="mr-1"/> Warning</span>;
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Activity Logs</h1>
        <div className="space-x-2 flex">
          <button 
            onClick={fetchLogs} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-sm"
          >
            <RefreshCw size={18} className="mr-2" /> Refresh
          </button>
          
          {logs.length > 0 && (
            <button 
              onClick={() => setShowClearAllModal(true)} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center shadow-sm"
            >
              <Trash2 size={18} className="mr-2" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* TABLE CONTENT */}
      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500 animate-pulse">Loading logs...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg border border-red-200">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-400 mb-2">No logs found</div>
          <p className="text-sm text-gray-500">Activity logs will appear here.</p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-left">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Option</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    
                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>

                    {/* Action Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700">
                        {log.actionType}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.actor?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{log.actor?.role}</div>
                    </td>

                    {/* Message */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{log.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={log.message}>{log.message}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Delete Button */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button 
                        onClick={() => initiateDelete(log._id)} 
                        className="text-gray-400 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50"
                        title="Delete Log"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Delete Log?</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this log? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL (CLEAR ALL) --- */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-fade-in-up border-t-4 border-red-500">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clear All Logs?</h3>
                <p className="text-gray-600 mt-1">
                  You are about to delete <strong>all Admin activity history</strong>. This is a destructive action and cannot be reversed.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md font-medium"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminLogs;