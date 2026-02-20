import React, { useEffect, useState } from 'react';
import { 
  Bell, CheckCheck, Trash2, Plus, 
  Info, AlertTriangle, CheckCircle, X, Send, Search, Inbox, CheckSquare
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext'; 
import { toast } from 'react-hot-toast';

const StudentNotifications = () => {
  // 1. Context & User mapping (Using studentInfo)
  const { axios, user: authUser, studentInfo } = useAppContext(); 
  const user = {
    _id: studentInfo?._id,
    name: studentInfo?.name,
    role: authUser?.role || 'student'
  };

  // --- MAIN STATES ---
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox'); 
  
  // --- MODAL & SEARCH STATES ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'Info',       
    targetRole: 'Faculty', // Hardcoded to Faculty
    isBroadcast: false,    // Hardcoded to false (Students cannot broadcast)
    selectedUsers: [] 
  });

  // --- FETCH NOTIFICATIONS ---
  const fetchNotifications = async () => {
    if (!user._id) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'inbox' 
        ? '/api/notifications/student'         // Inbox
        : '/api/notifications/student/history'; // Sent History

      const res = await axios.get(endpoint);
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
      toast.error(`Failed to load ${activeTab} notifications`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user._id) fetchNotifications();
  }, [activeTab, user._id]);

  // --- LIVE SEARCH LOGIC (Faculty Only) ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      // Students can ONLY search for faculty
      if (searchQuery.length > 1) {
        try {
          const res = await axios.get(`/api/faculty/search?q=${searchQuery}`);
          if (res.data.success) {
            setSearchResults(res.data.faculty);
          }
        } catch (err) { console.error("Search failed", err); }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const addUser = (selectedUser) => {
    if (formData.selectedUsers.find(u => u.id === selectedUser._id)) return toast.error("Already added");
    setFormData({
      ...formData,
      selectedUsers: [...formData.selectedUsers, { id: selectedUser._id, name: selectedUser.name }]
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeUser = (id) => {
    setFormData({ ...formData, selectedUsers: formData.selectedUsers.filter(u => u.id !== id) });
  };

  // --- SUBMIT NOTIFICATION ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (formData.selectedUsers.length === 0) {
      return toast.error("Please select at least one faculty member.");
    }

    const loadingToast = toast.loading("Sending message...");
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        recipient: {
          role: 'Faculty', // Enforced
          userIds: formData.selectedUsers.map(u => u.id)
        }
      };

      const res = await axios.post('/api/notifications/student/create', payload);
      
      if (res.data.success) {
        toast.success("Message Sent Successfully!", { id: loadingToast });
        setShowCreateModal(false);
        setFormData({ title: '', message: '', type: 'Info', targetRole: 'Faculty', isBroadcast: false, selectedUsers: [] });
        setActiveTab('sent'); 
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send", { id: loadingToast });
    }
  };

  // ✅ FIXED: Optimistic UI updating for instant feedback
  const handleMarkAsRead = async (id) => {
    // 1. Instantly update UI state so the "New" badge vanishes immediately
    setNotifications(prev => 
      prev.map(n => n._id === id ? { ...n, isRead: true, status: 'Read' } : n)
    );

    try {
      // 2. Hit the backend silently
      const res = await axios.put(`/api/notifications/student/read/${id}`);
      if (!res.data.success) {
        // If it fails on the server, fetch fresh data to correct the UI
        fetchNotifications();
      }
    } catch (err) { 
      console.error(err); 
      fetchNotifications(); 
    }
  };

  // ✅ ADDED: Mark All as Read feature
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, status: 'Read' })));
    try {
      await axios.put('/api/notifications/student/read-all', { role: 'Student' });
      toast.success("All messages marked as read");
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/notifications/${selectedId}?userId=${user._id}&role=${user.role}`);
      setNotifications(prev => prev.filter(n => n._id !== selectedId));
      setShowDeleteModal(false);
      toast.success("Message deleted");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Failed to delete"); 
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Warning': return <AlertTriangle className="text-amber-500" size={20} />;
      case 'Success': return <CheckCircle className="text-emerald-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="text-gray-500" size={24} /> My Messages
            </h1>
            <p className="mt-1 text-sm text-gray-500">View campus alerts and message your faculty.</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
             {/* Added Mark All Read Button for Inbox */}
             {activeTab === 'inbox' && notifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAllRead} 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <CheckSquare size={18} /> Mark All Read
              </button>
            )}
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
            >
              <Plus size={18} /> Message Faculty
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('inbox')} 
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'inbox' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inbox
            </button>
            <button 
              onClick={() => setActiveTab('sent')} 
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sent' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sent History
            </button>
          </nav>
        </div>

        {/* CONTENT LIST */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-sm text-gray-500 font-medium">Loading messages...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
            <Inbox size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-semibold text-gray-900">No messages</h3>
            <p className="text-sm text-gray-500 mt-1">Your {activeTab} is currently empty.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => {
              const title = notif.title;
              const message = notif.message;
              const date = notif.createdAt || notif.when;
              const isRead = notif.isRead || notif.status === 'Read';
              const senderName = notif.sender?.name || notif.byWhom?.name || "System";
              const targetRole = notif.recipient?.role || notif.toWhom?.role;
              
              // Only allow delete if this user is the sender (for Outbox)
              const canDelete = activeTab === 'sent' && notif.senderId === user._id;

              return (
                <div key={notif._id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5 relative group">
                  
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`p-2.5 rounded-full ${
                      notif.type === 'Warning' ? 'bg-amber-50' : 
                      notif.type === 'Success' ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      {getTypeIcon(notif.type)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
                      {activeTab === 'inbox' && !isRead && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{message}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {activeTab === 'inbox' ? (
                          <><span className="font-medium text-gray-700">From:</span> {senderName}</>
                        ) : (
                          <><span className="font-medium text-gray-700">To:</span> {targetRole} (Direct)</>
                        )}
                      </span>
                      <span>•</span>
                      <time dateTime={date}>
                        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </time>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row sm:flex-col justify-end gap-2 sm:ml-4 sm:border-l sm:border-gray-100 sm:pl-4">
                    {activeTab === 'inbox' && !isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(notif._id)} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Mark as Read"
                      >
                        <CheckCheck size={20} />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={() => { setSelectedId(notif._id); setShowDeleteModal(true); }} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* CREATE NOTIFICATION MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full transform transition-all p-6 sm:p-8">
              
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-900">Message Faculty</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500 p-1 rounded-md hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                    {/* Fixed to Faculty, disabled to prevent changing */}
                    <select disabled className="block w-full rounded-lg border-gray-300 py-2 pl-3 pr-10 text-gray-500 bg-gray-100 border sm:text-sm cursor-not-allowed">
                      <option value="Faculty">Faculty Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority Type</label>
                    <select 
                      className="block w-full rounded-lg border-gray-300 py-2 pl-3 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-gray-50 border" 
                      value={formData.type} 
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="Info">Information/Query</option>
                      <option value="Warning">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Faculty</label>
                  <div className="space-y-3">
                    {formData.selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.selectedUsers.map(u => (
                            <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {u.name} 
                                <button type="button" onClick={() => removeUser(u.id)} className="text-blue-600 hover:text-blue-900">
                                  <X size={14} />
                                </button>
                            </span>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Type faculty name to search..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                      />
                      {searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-48 overflow-y-auto">
                              {searchResults.map(user => (
                                  <div key={user._id} onClick={() => addUser(user)} className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-50 text-sm flex justify-between items-center">
                                      <span className="block truncate">{user.name}</span>
                                      <Plus size={16} className="text-gray-400" />
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    required 
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="Brief subject (e.g., Leave Request, Project Query)" 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea 
                    required 
                    rows="4" 
                    className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" 
                    placeholder="Type your message here..." 
                    value={formData.message} 
                    onChange={(e) => setFormData({...formData, message: e.target.value})} 
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Cancel
                  </button>
                  <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Send size={16}/> Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
              <div className="flex gap-3 justify-center mt-2">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 border border-transparent">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;