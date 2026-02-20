import React, { useEffect, useState } from 'react';
import { 
  FileText, Download, Trash2, Plus, 
  CheckCircle, AlertCircle, X, 
  FileSpreadsheet, Send
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AdminReports = () => {
  // Make sure your user object contains _id, role, and name
  const { axios, user: authUser, adminInfo } = useAppContext();
  const user = {
    _id: adminInfo?._id,
    name: adminInfo?.name,
    role: authUser?.role
  };

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const [uploadMode, setUploadMode] = useState('device'); 
  const [formData, setFormData] = useState({
    title: '',
    type: 'ATTENDANCE_SHEET',
    sentTo: 'All', // New field for RBAC
    fileUrl: '', 
    selectedFile: null
  });

const fetchReports = async () => {
    if (!user._id) return; 
    
    setLoading(true);
    try {
      // ✅ FIX: Added '/all' to match your backend router
      const res = await axios.get(`/api/reports/all`, {
        params: { tab: activeTab, userId: user._id, role: user.role }
      });
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      // Log the actual error to the console so you can see it next time!
      console.error("Fetch Error:", err.response?.data || err.message);
      setReports([]);
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user._id) {
      fetchReports();
    }
    // ✅ THE FIX: Watch the specific strings (_id and role), NOT the whole 'user' object
  }, [activeTab, user._id, user.role]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Report Title is required");

    const loadingToast = toast.loading("Uploading Report...");

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      data.append('sentTo', formData.sentTo); 
      
      // Pass complete user info ensuring userId is included
      const userInfo = { role: user.role, name: user.name, userId: user._id }; 
      data.append('generatedBy', JSON.stringify(userInfo));

      if (uploadMode === 'device') {
        if (!formData.selectedFile) throw new Error("Please select a file");
        data.append('file', formData.selectedFile);
      } else {
        if (!formData.fileUrl) throw new Error("Please enter a URL");
        data.append('fileUrl', formData.fileUrl);
      }

      const res = await axios.post('/api/reports/create', data);
      
      if (res.data.success) {
        toast.success("Report Uploaded Successfully!", { id: loadingToast });
        setShowCreateModal(false);
        setFormData({ title: '', type: 'ATTENDANCE_SHEET', sentTo: 'All', fileUrl: '', selectedFile: null });
        fetchReports(); // Refresh list
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || "Upload failed", { id: loadingToast });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error("Invalid file type! Only PDF, Word, and Excel allowed.");
        e.target.value = null; 
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File is too large! (Max 10MB)");
        return;
      }
      setFormData({ ...formData, selectedFile: file, fileUrl: '' });
    }
  };

  const confirmDelete = async () => {
    if (!selectedReportId) return;
    try {
      // ✅ FIX: Send userId and role as URL query parameters for safe DELETE requests
      await axios.delete(`/api/reports/${selectedReportId}?userId=${user._id}&role=${user.role}`);
      
      setReports(reports.filter(r => r._id !== selectedReportId));
      setShowDeleteModal(false);
      toast.success("Report deleted successfully");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Failed to delete"); 
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Reports Center
          </h1>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition">
          <Plus size={18} /> New Report
        </button>
      </div>

      {/* TABS - Updated to Received / Sent */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
        {['received', 'sent'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'received' ? 'Inbox (Received)' : 'Sent by Me'}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <FileSpreadsheet size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No reports found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div key={report._id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24} /></div>
                {report.status === 'Completed' 
                  ? <span className="text-green-600 flex items-center gap-1 text-xs font-medium bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12} /> Ready</span>
                  : <span className="text-red-600 flex items-center gap-1 text-xs font-medium bg-red-50 px-2 py-1 rounded-full"><AlertCircle size={12} /> Failed</span>
                }
              </div>
              
              <h3 className="font-bold text-gray-800 truncate" title={report.title}>{report.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {activeTab === 'received' 
                  ? `From: ${report.generatedBy.name} (${report.generatedBy.role})`
                  : `Sent to: ${report.sentTo}`
                }
              </p>
              <p className="text-xs text-gray-400 mb-4">{new Date(report.createdAt).toLocaleDateString()}</p>
              
              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-100">
                <button onClick={() => window.open(report.file.url, '_blank')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <Download size={16} /> Download
                </button>
                
                {/* STRICT UI CHECK: Only show Delete if current user is the sender */}
                {report.generatedBy.userId === user._id && (
                  <button onClick={() => { setSelectedReportId(report._id); setShowDeleteModal(true); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Report">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Upload New Report</h3>
              <button onClick={() => setShowCreateModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="ATTENDANCE_SHEET">Attendance</option>
                    <option value="FEE_REPORT">Fee Report</option>
                    <option value="MARKS_CARD">Marks Card</option>
                  </select>
                </div>
                <div>
                  {/* NEW: SENT TO FIELD */}
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Send To (Role)</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.sentTo} onChange={(e) => setFormData({...formData, sentTo: e.target.value})}>
                    <option value="All">Everyone</option>
                    <option value="Admin">Admins Only</option>
                    <option value="Faculty">Faculty Only</option>
                    <option value="Student">Students Only</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
                <button type="button" onClick={() => setUploadMode('device')} className={`flex-1 py-1.5 rounded-md ${uploadMode === 'device' ? 'bg-white text-blue-600' : 'text-gray-500'}`}>Device</button>
                <button type="button" onClick={() => setUploadMode('url')} className={`flex-1 py-1.5 rounded-md ${uploadMode === 'url' ? 'bg-white text-blue-600' : 'text-gray-500'}`}>Link</button>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
                {uploadMode === 'device' ? (
                  <>
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-blue-600">
                      {formData.selectedFile ? <span className="text-sm font-medium text-gray-800">{formData.selectedFile.name}</span> : <span className="text-sm font-medium">Click to upload file</span>}
                    </label>
                  </>
                ) : (
                  <input type="url" required className="w-full px-3 py-2 border rounded bg-white text-sm" placeholder="https://example.com/file.pdf" value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} />
                )}
              </div>

              <button type="submit" className="w-full py-2.5 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition flex justify-center items-center gap-2">
                <Send size={18} /> Send Report
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Report?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone and will be logged.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;