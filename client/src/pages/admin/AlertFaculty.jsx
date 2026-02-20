import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Send, Users, User, AlertTriangle, 
  Info, CheckCircle, Clock, Trash2, Edit2, X, Inbox, ArrowUpRight, History, Search
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AlertFaculty = () => {
  const { axios } = useAppContext();
  
  // View & Notification State
  const [currentView, setCurrentView] = useState('send'); 
  const [loading, setLoading] = useState(false);
  const [allNotifications, setAllNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('sent'); 
  const [editingId, setEditingId] = useState(null);

  // Search & Multi-Select States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState([]); 

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'Info',       
    isBroadcast: true
  });

  // --- FETCH HISTORY ---
  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/notifications/admin-history');
      if (res.data.success) {
        setAllNotifications(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch history");
      setAllNotifications([]);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // --- LIVE SEARCH ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await axios.get(`/api/faculty/search?q=${searchQuery}`);
          if (res.data.success) setSearchResults(res.data.faculty);
        } catch (err) {
          console.error("Search error", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // --- SELECTION HANDLERS ---
  const addFaculty = (f) => {
    if (selectedFaculty.find(item => item.id === f._id)) {
      return toast.error("Faculty already added");
    }
    setSelectedFaculty([...selectedFaculty, { id: f._id, name: f.name }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeFaculty = (id) => {
    setSelectedFaculty(selectedFaculty.filter(f => f.id !== id));
  };

  // --- SEND HANDLER ---
  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return toast.error("Fields missing");
    if (!formData.isBroadcast && selectedFaculty.length === 0) return toast.error("Select at least one faculty");

    setLoading(true);
    try {
      if (editingId) await axios.delete(`/api/notifications/${editingId}`);

      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type === 'Urgent' ? 'Warning' : formData.type,
        recipient: {
          role: 'Faculty',
          userIds: formData.isBroadcast ? ['BROADCAST'] : selectedFaculty.map(f => f.id)
        }
      };

      const res = await axios.post('/api/notifications/create', payload);
      if (res.data.success) {
        toast.success("Alert Processed Successfully!");
        resetForm();
        fetchHistory();
        setCurrentView('history');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE HANDLERS ---
  const initiateDelete = (id) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await axios.delete(`/api/notifications/${itemToDelete}`);
      if (res.data.success) {
        setAllNotifications(prev => prev.filter(n => n._id !== itemToDelete));
        toast.success("Alert deleted permanently");
        setShowDeleteModal(false);
        setItemToDelete(null);
      }
    } catch (err) {
      toast.error("Failed to delete alert");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedFaculty([]);
    setSearchQuery("");
    setFormData({ title: '', message: '', type: 'Info', isBroadcast: true });
  };

  const handleEdit = (alert) => {
    setEditingId(alert._id);
    setFormData({
      title: alert.what?.title || alert.title,
      message: alert.what?.message || alert.message,
      type: (alert.what?.type || alert.type) === 'Warning' ? 'Urgent' : (alert.what?.type || alert.type),
      isBroadcast: (alert.toWhom?.userId || alert.recipient?.userId) === 'BROADCAST'
    });
    if ((alert.toWhom?.userId || alert.recipient?.userId) !== 'BROADCAST') {
        setSelectedFaculty([{ 
          id: alert.toWhom?.userId || alert.recipient?.userId, 
          name: alert.toWhom?.name || 'Original Recipient' 
        }]);
    }
    setCurrentView('send');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'Warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const inboxMessages = allNotifications.filter(n => 
    n.toWhom?.role === 'Admin' || n.recipient?.role === 'Admin'
  );
  
  const sentMessages = allNotifications.filter(n => 
    n.toWhom?.role === 'Faculty' || n.recipient?.role === 'Faculty'
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Megaphone className="text-orange-500" /> Faculty Hub
        </h1>
      </div>

      {/* VIEW TOGGLE */}
      <div className="flex p-1 bg-gray-200 rounded-xl mb-8 max-w-md mx-auto shadow-inner">
        <button onClick={() => setCurrentView('send')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${currentView === 'send' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600'}`}><Send size={18} /> Send</button>
        <button onClick={() => setCurrentView('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${currentView === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600'}`}><History size={18} /> History</button>
      </div>

      <div className="max-w-4xl mx-auto">
        {currentView === 'send' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-gray-800 mb-8">{editingId ? "Edit Alert" : "Compose Alert"}</h2>

            <form onSubmit={handleSendAlert} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">Audience</label>
                <div className="flex gap-4 p-1 bg-gray-50 border rounded-xl">
                  <button type="button" onClick={() => { setFormData({...formData, isBroadcast: true}); setSelectedFaculty([]); }} 
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${formData.isBroadcast ? 'bg-white shadow text-blue-600 border' : 'text-gray-400'}`}>
                    Broadcast to All
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, isBroadcast: false})}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!formData.isBroadcast ? 'bg-white shadow text-blue-600 border' : 'text-gray-400'}`}>
                    Select Individuals
                  </button>
                </div>
              </div>

              {!formData.isBroadcast && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-600">Selected Recipients ({selectedFaculty.length})</label>
                  <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 border border-dashed rounded-xl bg-gray-50">
                    {selectedFaculty.length === 0 && <span className="text-xs text-gray-400 p-1">No faculty selected...</span>}
                    {selectedFaculty.map(f => (
                      <span key={f.id} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-in zoom-in-90">
                        {f.name}
                        <X size={14} className="cursor-pointer hover:text-red-200" onClick={() => removeFaculty(f.id)} />
                      </span>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search and add faculty..." 
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        {searchResults.map((f) => (
                          <div key={f._id} onClick={() => addFaculty(f)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b last:border-0">
                            <div className="flex items-center gap-3">
                                <img src={f.image || "https://via.placeholder.com/40"} alt="" className="w-8 h-8 rounded-full border" />
                                <div>
                                    <p className="font-bold text-sm">{f.name}</p>
                                    <p className="text-[10px] text-gray-400">{f.department}</p>
                                </div>
                            </div>
                            <Plus size={16} className="text-blue-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="Subject" required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white outline-none" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                  <option value="Info">Info 🔵</option>
                  <option value="Warning">Warning 🟡</option>
                  <option value="Urgent">Urgent 🔴</option>
                </select>
              </div>

              <textarea rows="5" placeholder="Detailed message..." required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} />

              <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all ${loading ? 'bg-gray-400' : editingId ? 'bg-orange-500' : 'bg-blue-600 hover:scale-[1.01]'}`}>
                {loading ? 'Processing...' : editingId ? 'Update Alert' : 'Send Alert'}
              </button>
            </form>
          </div>
        )}

        {currentView === 'history' && (
          <div className="bg-white rounded-2xl shadow-xl flex flex-col min-h-[600px] border border-gray-100 overflow-hidden">
            <div className="flex bg-gray-50 border-b">
              <button 
                onClick={() => setActiveTab('sent')} 
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'sent' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
              >
                <ArrowUpRight size={18} /> Outbox (Sent)
              </button>
              <button 
                onClick={() => setActiveTab('inbox')} 
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-3 transition-all ${activeTab === 'inbox' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
              >
                <Inbox size={18} /> Inbox (Received)
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {(activeTab === 'sent' ? sentMessages : inboxMessages).length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Clock size={40} className="mx-auto mb-2 opacity-20" />
                  <p>No messages found in {activeTab}.</p>
                </div>
              ) : (
                (activeTab === 'sent' ? sentMessages : inboxMessages).map((alert) => (
                  <div key={alert._id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${getTypeStyle(alert.what?.type || alert.type)}`}>
                        {alert.what?.type || alert.type || 'Info'}
                      </span>
                      <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">
                        {new Date(alert.when || alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-gray-800 text-lg leading-tight">{alert.what?.title || alert.title}</h4>
                    <p className="text-sm text-gray-600 mt-2 mb-4 leading-relaxed bg-gray-50 p-3 rounded-lg border-l-2 border-gray-200">
                      {alert.what?.message || alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <div className="space-y-1">
                        <div className="text-[11px] font-extrabold text-gray-600 flex items-center gap-1.5 uppercase tracking-wide">
                          <User size={14} className="text-blue-600 fill-blue-100"/> 
                          BY: <span className="text-blue-700">{alert.byWhom?.name || alert.sender?.name || "ADMINISTRATOR"}</span>
                        </div>

                        <div className="text-[11px] font-extrabold text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
                          <Users size={14} className="text-gray-400 fill-gray-100"/> 
                          TO: <span className="text-gray-700">
                            {(alert.toWhom?.userId || alert.recipient?.userId) === 'BROADCAST' 
                              ? 'ALL FACULTY' 
                              : (alert.toWhom?.name || alert.toWhom?.userId || 'INDIVIDUAL')}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {activeTab === 'sent' && (
                          <button 
                            onClick={() => handleEdit(alert)} 
                            className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 hover:scale-110 transition-all active:scale-95" 
                            title="Edit and Resend"
                          >
                            <Edit2 size={18} strokeWidth={3} />
                          </button>
                        )}
                        <button 
                          onClick={() => initiateDelete(alert._id)} 
                          className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 hover:scale-110 transition-all active:scale-95" 
                          title="Delete Forever"
                        >
                          <Trash2 size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- CUSTOM DELETE MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setShowDeleteModal(false)}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 border border-gray-100 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4 w-fit mx-auto">
              <Trash2 size={32} className="text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-500 mb-8">
              This action cannot be undone. This alert will be removed from everyone's history.
            </p>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Plus = ({size, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default AlertFaculty;