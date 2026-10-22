import React, { useEffect, useState } from 'react';
import { 
  FileText, Download, Trash2, Plus, 
  CheckCircle, Clock, AlertCircle, X, 
  FileSpreadsheet, UploadCloud, Link as LinkIcon, Search
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const FacultyReports = () => {
  const { axios, user: authUser, facultyInfo } = useAppContext();
  const user = {
    _id: facultyInfo?._id,
    name: facultyInfo?.name,
    role: authUser?.role
  };

  // State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); 
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // CSV Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [facultyClasses, setFacultyClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [exportFilter, setExportFilter] = useState('all'); // 'all' or 'defaulters'
  const [isExporting, setIsExporting] = useState(false);
  const [classAnalyticsPreview, setClassAnalyticsPreview] = useState(null);
  // Form State
  const [uploadMode, setUploadMode] = useState('device'); 
  const [formData, setFormData] = useState({
    title: '',
    type: 'ATTENDANCE_SHEET',
    // ✅ FIX 1: Changed default from 'All' to 'Admin'
    sentTo: 'Admin', 
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
      if (res.data.success) {
        setReports(res.data.data);
      }
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

  // --- UPLOAD HANDLER ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Report Title is required");

    const loadingToast = toast.loading("Uploading Report...");

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      data.append('sentTo', formData.sentTo); 
      
      const userInfo = { 
        role: user.role || 'Faculty', 
        name: user.name || 'Faculty Member',
        userId: user._id 
      }; 
      data.append('generatedBy', JSON.stringify(userInfo));

      if (uploadMode === 'device') {
        if (!formData.selectedFile) {
          toast.dismiss(loadingToast);
          return toast.error("Please select a file");
        }
        data.append('file', formData.selectedFile);
      } else {
        if (!formData.fileUrl) {
          toast.dismiss(loadingToast);
          return toast.error("Please enter a URL");
        }
        data.append('fileUrl', formData.fileUrl);
      }

      const res = await axios.post('/api/reports/create', data);
      
      if (res.data.success) {
        toast.success("Report Shared Successfully!", { id: loadingToast });
        setShowUploadModal(false);
        // ✅ FIX 2: Reset form state to default 'Admin'
        setFormData({ title: '', type: 'ATTENDANCE_SHEET', sentTo: 'Admin', fileUrl: '', selectedFile: null });
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
      toast.success("Report removed");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Delete failed"); 
    }
  };

  // --- CSV ATTENDANCE EXPORT LOGIC ---
  const fetchClassPreview = async (cls) => {
    try {
      const res = await axios.get('/api/faculty/analytics', {
        params: {
          year: cls.year,
          branch: cls.branch,
          section: cls.section,
          subject: cls.subject
        }
      });
      if (res.data.success) {
        setClassAnalyticsPreview(res.data);
      }
    } catch (err) {
      console.warn("Could not preview class:", err);
      setClassAnalyticsPreview(null);
    }
  };

  const handleOpenExportModal = async () => {
    setShowExportModal(true);
    if (facultyClasses.length === 0) {
      try {
        const { data } = await axios.get('/api/faculty/classes');
        if (data.success && data.classes?.length > 0) {
          setFacultyClasses(data.classes);
          setSelectedClassId(data.classes[0]._id);
          fetchClassPreview(data.classes[0]);
        }
      } catch (err) {
        console.error("Failed to load classes for export:", err);
      }
    } else if (selectedClassId) {
      const cls = facultyClasses.find(c => c._id === selectedClassId);
      if (cls) fetchClassPreview(cls);
    }
  };

  const handleClassSelectionChange = (classId) => {
    setSelectedClassId(classId);
    const cls = facultyClasses.find(c => c._id === classId);
    if (cls) fetchClassPreview(cls);
  };

  const handleExportCSV = async () => {
    const cls = facultyClasses.find(c => c._id === selectedClassId);
    if (!cls) return toast.error("Please select a class to export.");

    setIsExporting(true);
    const loadingToast = toast.loading("Generating Attendance CSV...");
    try {
      const res = await axios.get('/api/faculty/analytics', {
        params: {
          year: cls.year,
          branch: cls.branch,
          section: cls.section,
          subject: cls.subject
        }
      });

      if (!res.data.success || !res.data.students) {
        throw new Error(res.data.message || "Failed to fetch student records.");
      }

      let studentsToExport = res.data.students;
      if (exportFilter === 'defaulters') {
        studentsToExport = studentsToExport.filter(s => s.percentage < 75);
      }

      if (studentsToExport.length === 0) {
        toast.dismiss(loadingToast);
        return toast.error("No student records found matching this criteria.");
      }

      const headers = [
        "Roll Number",
        "Student Name",
        "Branch",
        "Year",
        "Section",
        "Subject",
        "Classes Attended",
        "Total Classes",
        "Attendance Percentage",
        "Status"
      ];

      const rows = studentsToExport.map(s => [
        s.rollno,
        s.name,
        cls.branch,
        cls.year,
        cls.section,
        cls.subject,
        s.classesAttended,
        s.totalClasses,
        `${s.percentage}%`,
        s.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        )
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `VisOra_${cls.subject.replace(/[^a-zA-Z0-9]/g, '_')}_${cls.branch}_Y${cls.year}_${cls.section}_${exportFilter === 'defaulters' ? 'Defaulters' : 'Register'}_${new Date().toISOString().slice(0,10)}.csv`;
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${studentsToExport.length} student records!`, { id: loadingToast });
      setShowExportModal(false);
    } catch (err) {
      toast.error(err.message || "Export failed", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" /> Academic Reports
          </h1>
          <p className="text-sm text-gray-500">Access official sheets or upload your department reports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleOpenExportModal} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all font-bold"
          >
            <Download size={18} className="text-blue-600" /> Export Attendance CSV
          </button>
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold"
          >
            <Plus size={18} /> New Report
          </button>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-gray-200 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('received')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'received' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>System Reports</button>
          <button onClick={() => setActiveTab('sent')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>My Uploads</button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold animate-pulse uppercase tracking-widest">Loading Repository...</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <UploadCloud size={64} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No Reports Found</h3>
          <p className="text-gray-400 text-sm">Upload a file or check back later for official updates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${report.type === 'ATTENDANCE_SHEET' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <FileText size={24} />
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${report.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {report.status}
                </span>
              </div>

              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 truncate" title={report.title}>{report.title}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-4">
                {report.type.replace('_', ' ')} • {new Date(report.createdAt).toLocaleDateString()}
              </p>
              
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50">
                <button 
                  onClick={() => window.open(report.file?.url, '_blank')} 
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all text-sm"
                >
                  <Download size={16} /> View/Get
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
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Publish Report</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Report Title</label>
                <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. CS-A Semester Attendance" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="ATTENDANCE_SHEET">Attendance</option>
                    <option value="MARKS_CARD">Marks Sheet</option>
                    <option value="OTHER">Other Doc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Send To</label>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={formData.sentTo} onChange={(e) => setFormData({...formData, sentTo: e.target.value})}>
                    {/* ✅ FIX 3: Removed 'All' option, leaving only Admin and Student */}
                    <option value="Admin">Admin Only</option>
                    <option value="Student">Students Only</option>
                  </select>
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
                      <span className="text-xs font-bold text-gray-600">{formData.selectedFile ? formData.selectedFile.name : 'Select PDF/Excel File'}</span>
                    </label>
                  </>
                ) : (
                  <input type="url" required className="w-full px-4 py-3 bg-white border rounded-xl text-sm" placeholder="Paste link to Google Drive file..." value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} />
                )}
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Upload Report</button>
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
            <p className="text-gray-500 text-sm mb-8 font-medium">This will remove the document from your shared Academic Reports repository.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Download size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Export Attendance CSV</h3>
                  <p className="text-xs text-gray-500">Download formatted register spreadsheet</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Select Assigned Class */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Teaching Class
                </label>
                {facultyClasses.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-500 font-medium border">
                    No classes found in your timetable schedule.
                  </div>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassSelectionChange(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    {facultyClasses.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.subject} — {c.branch} Year {c.year} Sec {c.section || 'A'} ({c.type || 'Lecture'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Scope filter */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Export Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFilter('all')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                      exportFilter === 'all'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Complete Register (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFilter('defaulters')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                      exportFilter === 'defaulters'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Defaulters Only (&lt;75%)
                  </button>
                </div>
              </div>

              {/* Class Analytics Preview Pill */}
              {classAnalyticsPreview && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Live Section Snapshot</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="text-base font-black text-gray-900">{classAnalyticsPreview.stats?.totalStudents || 0}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">Total Students</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="text-base font-black text-blue-600">{classAnalyticsPreview.stats?.classAverage || 0}%</div>
                      <div className="text-[10px] text-gray-500 font-semibold">Average Attn</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                      <div className="text-base font-black text-rose-600">{classAnalyticsPreview.stats?.defaulterCount || 0}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">Defaulters</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isExporting || !selectedClassId}
                  onClick={handleExportCSV}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download size={16} /> {isExporting ? "Exporting..." : "Download CSV"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyReports;