import React, { useEffect, useState } from 'react';
import { 
  FileText, Download, Trash2, Plus, 
  CheckCircle, AlertCircle, X, 
  FileSpreadsheet, UploadCloud, Search, Inbox
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const StudentReports = () => {
  const { axios, user: authUser, studentInfo } = useAppContext();
  const user = {
    _id: studentInfo?._id,
    name: studentInfo?.name,
    role: authUser?.role || 'student'
  };

  // --- MAIN STATE ---
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [mainSearchQuery, setMainSearchQuery] = useState(""); // For searching reports

  // --- LIVE SEARCH STATES (Faculty) ---
  const [isBroadcast, setIsBroadcast] = useState(true); // true = All Faculty, false = Specific
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null); // { id, name }

  // --- FORM STATE ---
  const [uploadMode, setUploadMode] = useState('device'); 
  const [formData, setFormData] = useState({
    title: '',
    type: 'OTHER',
    fileUrl: '', 
    selectedFile: null
  });

  // --- FETCH REPORTS ---
  const fetchReports = async () => {
    if (!user._id) return; 
    setLoading(true);
    try {
      const res = await axios.get('/api/reports/all', {
        params: { tab: activeTab, userId: user._id, role: user.role }
      });
      if (res.data.success) setReports(res.data.data);
    } catch (err) {
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
  }, [activeTab, user._id, user.role]);

  // --- LIVE SEARCH LOGIC FOR FACULTY ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      // Only search if typing, not broadcasting, and haven't selected someone yet
      if (searchQuery.length > 1 && !isBroadcast && !selectedFaculty) {
        try {
          const res = await axios.get(`/api/faculty/search?q=${searchQuery}`);
          if (res.data.success) {
            setSearchResults(res.data.faculty || res.data.data || []);
          }
        } catch (err) { 
          console.error("Search failed", err); 
        }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isBroadcast, selectedFaculty]);

  const selectFaculty = (fac) => {
    setSelectedFaculty({ id: fac._id, name: fac.name });
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeFaculty = () => {
    setSelectedFaculty(null);
  };

  // --- UPLOAD HANDLER ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Report Title is required");

    // Validation for specific faculty
    if (!isBroadcast && !selectedFaculty) {
      return toast.error("Please search and select a specific faculty member.");
    }

    const loadingToast = toast.loading("Submitting Document...");

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      
      // ✅ Determine sentTo based on broadcast state
      const targetRecipient = isBroadcast ? 'Faculty' : selectedFaculty.id;
      data.append('sentTo', targetRecipient);
      
      const userInfo = { 
        role: 'Student', 
        name: user.name || 'Student',
        userId: user._id 
      }; 
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
        toast.success("Document Submitted Successfully!", { id: loadingToast });
        setShowUploadModal(false);
        // Reset form
        setFormData({ title: '', type: 'OTHER', fileUrl: '', selectedFile: null });
        setIsBroadcast(true);
        setSelectedFaculty(null);
        setActiveTab('sent'); 
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed", { id: loadingToast });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        return toast.error("PDF, Word, and Excel files only!");
      }
      setFormData({ ...formData, selectedFile: file, fileUrl: '' });
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/reports/${selectedReportId}?userId=${user._id}&role=${user.role}`);
      setReports(reports.filter(r => r._id !== selectedReportId));
      setShowDeleteModal(false);
      toast.success("Document removed");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Delete failed"); 
    }
  };

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(mainSearchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" /> My Documents
          </h1>
          <p className="text-sm text-gray-500">Access official records or submit documents to faculty.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)} 
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold"
        >
          <Plus size={18} /> Submit Document
        </button>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-gray-200 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('received')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'received' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>System Reports</button>
          <button onClick={() => setActiveTab('sent')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>My Submissions</button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search documents..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={mainSearchQuery}
            onChange={(e) => setMainSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold animate-pulse uppercase tracking-widest">Loading Repository...</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Inbox size={64} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No Documents Found</h3>
          <p className="text-gray-400 text-sm">Upload a file or check back later for official updates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${report.type === 'ATTENDANCE_SHEET' ? 'bg-blue-500' : report.type === 'MARKS_CARD' ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <FileText size={24} />
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${report.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {report.status}
                </span>
              </div>

              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 truncate" title={report.title}>{report.title}</h3>
              
              {activeTab === 'received' ? (
                 <p className="text-xs text-gray-500 mb-4">From: <span className="font-semibold text-gray-700">{report.generatedBy?.name || 'System'}</span></p>
              ) : (
                 <p className="text-xs text-gray-500 mb-4">Sent To: <span className="font-semibold text-gray-700">{report.sentTo === 'Faculty' ? 'All Faculty' : 'Specific Faculty'}</span></p>
              )}

              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50">
                <button 
                  onClick={() => window.open(report.file?.url, '_blank')} 
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all text-sm"
                >
                  <Download size={16} /> Open
                </button>
                
                {report.generatedBy?.userId === user._id && (
                  <button 
                    onClick={() => { setSelectedReportId(report._id); setShowDeleteModal(true); }} 
                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Submit Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Document Title</label>
                <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Medical Certificate" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              {/* LIVE SEARCH TARGET & CATEGORY */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="OTHER">General/Other</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="LEAVE_LETTER">Leave Letter</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Recipient</label>
                  <div className="flex items-center gap-4 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-blue-800">
                      <input type="radio" checked={isBroadcast} onChange={() => setIsBroadcast(true)} />
                      All Faculty
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-blue-800">
                      <input type="radio" checked={!isBroadcast} onChange={() => setIsBroadcast(false)} />
                      Specific Faculty
                    </label>
                  </div>

                  {/* SPECIFIC FACULTY SEARCH BAR */}
                  {!isBroadcast && (
                    <div className="space-y-2 relative">
                      {selectedFaculty ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                            {selectedFaculty.name} 
                            <X size={14} className="cursor-pointer hover:text-red-200" onClick={removeFaculty}/>
                          </span>
                        </div>
                      ) : (
                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Type faculty name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {/* Search Results Dropdown */}
                          {searchResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                              {searchResults.map(fac => (
                                <div 
                                  key={fac._id} 
                                  onClick={() => selectFaculty(fac)} 
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex justify-between items-center"
                                >
                                  <span>{fac.name}</span>
                                  <Plus size={14} className="text-blue-500" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Upload Method</label>
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  <button type="button" onClick={() => setUploadMode('device')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${uploadMode === 'device' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>FILE</button>
                  <button type="button" onClick={() => setUploadMode('url')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${uploadMode === 'url' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>LINK</button>
                </div>
              </div>

              <div className="p-6 border-2 border-dashed border-blue-100 rounded-2xl bg-blue-50/30 text-center">
                {uploadMode === 'device' ? (
                  <>
                    <input type="file" id="f-upload" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                    <label htmlFor="f-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <UploadCloud className="text-blue-500" size={32} />
                      <span className="text-xs font-bold text-gray-600">{formData.selectedFile ? formData.selectedFile.name : 'Select File'}</span>
                    </label>
                  </>
                ) : (
                  <input type="url" required className="w-full px-4 py-3 bg-white border rounded-xl text-sm" placeholder="Paste link to file..." value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} />
                )}
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Submit Document</button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 border-t-8 border-red-600">
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Confirm Deletion</h3>
            <p className="text-gray-500 text-sm mb-8 font-medium">This will remove the document from the shared repository.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;