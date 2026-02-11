import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, BookOpen, MapPin, 
  Layers, Users, Save, ArrowLeft, CheckCircle, Coffee,
  AlertTriangle, Grid, GraduationCap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

// --- CONSTANTS ---
const SECTION_OPTIONS = ["A", "B", "C", "D"];

const BRANCH_OPTIONS = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "CSE-AIML", name: "CSE - Artificial Intelligence & Machine Learning" },
  { code: "CSE-DS", name: "CSE - Data Science" },
  { code: "CSE-IoT", name: "CSE - Internet of Things" },
  { code: "CSBS", name: "Computer Science & Business Systems" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Communication Engineering" },
  { code: "EEE", name: "Electrical & Electronics Engineering" },
  { code: "EIE", name: "Electronics & Instrumentation Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
];


// --- SCHEDULE CONFIGURATION (Aligned with Bucket Pattern) ---
// pIndex: Used for sorting (1=Period 1, 2=Period 2...)
const SCHEDULE_CONFIG = {
  YEAR_1: {
    Lecture: [
      { id: '1-L1', label: '09:00 AM - 10:00 AM', startTime: '09:00 AM', endTime: '10:00 AM', startMin: 540, duration: 60, pIndex: 1 },
      { id: '1-L2', label: '10:00 AM - 11:00 AM', startTime: '10:00 AM', endTime: '11:00 AM', startMin: 600, duration: 60, pIndex: 2 },
      { id: '1-L3', label: '11:00 AM - 12:00 PM', startTime: '11:00 AM', endTime: '12:00 PM', startMin: 660, duration: 60, pIndex: 3 },
      // Lunch Gap
      { id: '1-L4', label: '12:40 PM - 01:40 PM', startTime: '12:40 PM', endTime: '01:40 PM', startMin: 760, duration: 60, pIndex: 4 },
      { id: '1-L5', label: '01:40 PM - 02:40 PM', startTime: '01:40 PM', endTime: '02:40 PM', startMin: 820, duration: 60, pIndex: 5 },
      { id: '1-L6', label: '02:40 PM - 03:40 PM', startTime: '02:40 PM', endTime: '03:40 PM', startMin: 880, duration: 60, pIndex: 6 },
    ],
    Lab: [
      { id: '1-LAB1', label: '09:00 AM - 12:00 PM', startTime: '09:00 AM', endTime: '12:00 PM', startMin: 540, duration: 180, pIndex: 1 }, // Covers P1-P3
      { id: '1-LAB2', label: '12:40 PM - 03:40 PM', startTime: '12:40 PM', endTime: '03:40 PM', startMin: 760, duration: 180, pIndex: 4 }, // Covers P4-P6
    ]
  },
  SENIOR: { // Years 2, 3, 4
    Lecture: [
      { id: 'S-L1', label: '10:00 AM - 11:00 AM', startTime: '10:00 AM', endTime: '11:00 AM', startMin: 600, duration: 60, pIndex: 1 },
      { id: 'S-L2', label: '11:00 AM - 12:00 PM', startTime: '11:00 AM', endTime: '12:00 PM', startMin: 660, duration: 60, pIndex: 2 },
      { id: 'S-L3', label: '12:00 PM - 01:00 PM', startTime: '12:00 PM', endTime: '01:00 PM', startMin: 720, duration: 60, pIndex: 3 },
      // Lunch Gap
      { id: 'S-L4', label: '01:40 PM - 02:40 PM', startTime: '01:40 PM', endTime: '02:40 PM', startMin: 820, duration: 60, pIndex: 4 },
      { id: 'S-L5', label: '02:40 PM - 03:40 PM', startTime: '02:40 PM', endTime: '03:40 PM', startMin: 880, duration: 60, pIndex: 5 },
      { id: 'S-L6', label: '03:40 PM - 04:40 PM', startTime: '03:40 PM', endTime: '04:40 PM', startMin: 940, duration: 60, pIndex: 6 },
    ],
    Lab: [
      { id: 'S-LAB1', label: '10:00 AM - 01:00 PM', startTime: '10:00 AM', endTime: '01:00 PM', startMin: 600, duration: 180, pIndex: 1 },
      { id: 'S-LAB2', label: '01:40 PM - 04:40 PM', startTime: '01:40 PM', endTime: '04:40 PM', startMin: 820, duration: 180, pIndex: 4 },
    ]
  }
};

const AddSchedule = () => {
  const navigate = useNavigate();
  const { axios } = useAppContext(); // Use standard axios from context

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // --- ROOMS GENERATION ---
  const roomGroups = useMemo(() => {
    const floors = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (let floor = 1; floor <= 5; floor++) {
      for (let roomNum = 1; roomNum <= 20; roomNum++) {
        const roomCode = `E${floor}${roomNum.toString().padStart(2, '0')}`;
        floors[floor].push(roomCode);
      }
    }
    return floors;
  }, []);

  const getFloorColor = (floor) => {
    const colors = ["#374151", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#9333ea"];
    return colors[parseInt(floor)] || colors[0];
  };

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    branch: 'CSE', 
    year: '1',     
    section: 'A', 
    subject: '',
    room: '',
    type: 'Lecture', 
    batch: '', 
    slotId: '' // We store the Config ID (e.g., '1-L1') to look up details
  });

  // --- DERIVE AVAILABLE SLOTS ---
  const availableSlots = useMemo(() => {
    const isFirstYear = formData.year === '1';
    const config = isFirstYear ? SCHEDULE_CONFIG.YEAR_1 : SCHEDULE_CONFIG.SENIOR;
    
    if (formData.type === 'Leisure') return config.Lecture; // Leisure fits in lecture slots
    if (formData.type === 'Lab') return config.Lab;
    return config.Lecture;
  }, [formData.year, formData.type]);

  // --- HANDLERS ---
  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      slotId: '', // Reset time when type changes
      batch: type === 'Lab' ? '1' : '', // Default batch 1 for Lab
      // Auto-set dummy values for Leisure
      subject: type === 'Leisure' ? 'Leisure' : prev.subject === 'Leisure' ? '' : prev.subject,
      room: type === 'Leisure' ? 'N/A' : (prev.room === 'N/A' ? roomGroups[1][0] : prev.room),
      section: type === 'Leisure' ? 'N/A' : (prev.section === 'N/A' ? 'A' : prev.section),
    }));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);

    // 1. Validation
    if (formData.type === 'Lab' && !formData.batch) {
      setError("Please select a Batch (1 or 2) for Lab.");
      setLoading(false); return;
    }
    if (formData.type !== 'Leisure' && !formData.subject.trim()) {
       setError("Subject is required.");
       setLoading(false); return;
    }
    if (formData.type !== 'Leisure' && !formData.room) {
       setError("Room is required.");
       setLoading(false); return;
    }
    if (!formData.slotId) {
       setError("Please select a Time Slot.");
       setLoading(false); return;
    }

    try {
      // 2. Lookup Slot Details from Config
      const slotDetails = availableSlots.find(s => s.id === formData.slotId);
      if(!slotDetails) throw new Error("Invalid Time Slot");
      const payload = {
        day: formData.day,
        branch: formData.branch,
        year: Number(formData.year),
        section: formData.section,
        subject: formData.subject,
        room: formData.room,
        type: formData.type,
        batch: formData.type === 'Lab' ? Number(formData.batch) : null,
        startTime: slotDetails.startTime,
        endTime: slotDetails.endTime,
        // 🔥 FIX: Explicitly map 'pIndex' to 'periodIndex'
        periodIndex: Number(slotDetails.pIndex) 
      };

      // 3. API Call
      const res = await axios.post('/api/faculty/add-schedule', payload);
      
      if (res.data.success) {
        toast.success(`Added: ${formData.subject} (${formData.day})`);
        navigate('/faculty/schedule'); // Redirect to dashboard
      }

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Failed to add schedule";
      
      if (msg.includes('Conflict')) {
        setError(msg); // Show specific conflict message from backend
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const theme = formData.type === 'Lab' ? 'purple' : formData.type === 'Leisure' ? 'green' : 'indigo';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* ERROR MODAL */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setError(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Scheduling Conflict</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button onClick={() => setError(null)} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              Okay, I'll fix it
            </button>
          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div className={`bg-white w-full max-w-2xl rounded-3xl shadow-xl border overflow-hidden transition-all duration-300 border-${theme}-100`}>
        
        {/* HEADER */}
        <div className={`px-8 py-6 flex justify-between items-center transition-colors duration-300 bg-${theme}-600`}>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-white/90" /> Add Class
            </h2>
            <p className="text-white/80 text-sm mt-1">Add a new slot to your timetable.</p>
          </div>
          <button onClick={() => navigate('/faculty/schedule')} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1"><Calendar size={14} /> Day</label>
              <select name="day" value={formData.day} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d} className={d === currentDayName ? "font-bold text-indigo-600" : ""}>{d} {d === currentDayName ? '(Today)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1"><GraduationCap size={14} /> Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
                {BRANCH_OPTIONS.map(b => (
                  <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC SECTION */}
          <div className={`p-5 rounded-2xl border grid grid-cols-1 gap-6 transition-colors duration-300 bg-${theme}-50 border-${theme}-100`}>
            
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Year</label>
                    <select name="year" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value, slotId: ''})} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className={`text-xs font-bold uppercase tracking-wider text-${theme}-900 flex items-center gap-1`}>
                        {formData.type === 'Leisure' ? <Coffee size={14} /> : <Clock size={14} />} Type
                    </label>
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        {['Lecture', 'Lab', 'Leisure'].map((type) => (
                        <button key={type} type="button" onClick={() => handleTypeChange(type)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.type === type ? (type === 'Leisure' ? 'bg-green-500 text-white' : (type === 'Lab' ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white')) : 'text-gray-500 hover:bg-gray-50'}`}>
                            {type}
                        </button>
                        ))}
                    </div>
                </div>
            </div>

            {formData.type === 'Lab' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold uppercase tracking-wide text-purple-800 mb-2 flex items-center gap-1">
                  <Grid size={12}/> Select Batch
                </label>
                <div className="flex gap-4">
                  {[1, 2].map(b => (
                    <label key={b} className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${formData.batch === String(b) ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
                      <input type="radio" name="batch" value={b} checked={formData.batch === String(b)} onChange={handleChange} className="hidden"/>
                      <span className="font-bold text-sm">Batch {b}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* TIME SLOT SELECTOR */}
            <div className="w-full">
              <label className={`text-xs font-bold uppercase tracking-wide text-${theme}-800 mb-2 block`}>Select Time Slot</label>
              <select 
                name="slotId" 
                value={formData.slotId} 
                onChange={handleChange} 
                className={`w-full p-3 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-${theme}-500 bg-white`}
              >
                <option value="" disabled>-- Select Time --</option>
                {availableSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Subject</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input 
                    name="subject" 
                    type="text" 
                    placeholder="Subject Name" 
                    value={formData.subject} 
                    onChange={handleChange} 
                    readOnly={formData.type === 'Leisure'}
                    className={`w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium ${formData.type === 'Leisure' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800'}`}
                  />
                </div>
             </div>

             <div className={`space-y-2 ${formData.type === 'Leisure' ? 'opacity-50' : ''}`}>
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Section</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <select 
                    name="section" 
                    value={formData.section} 
                    onChange={handleChange} 
                    disabled={formData.type === 'Leisure'}
                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    {formData.type === 'Leisure' ? <option>N/A</option> : SECTION_OPTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
             </div>

             <div className={`space-y-2 ${formData.type === 'Leisure' ? 'opacity-50' : ''}`}>
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Room</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <select 
                    name="room" 
                    value={formData.room} 
                    onChange={handleChange} 
                    disabled={formData.type === 'Leisure'}
                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                  >
                    {formData.type === 'Leisure' ? <option>N/A</option> : (
                      <>
                        <option value="" disabled>Select Room</option>
                        {Object.entries(roomGroups).map(([floor, rooms]) => (
                          <optgroup key={floor} label={`Floor ${floor}`} style={{ color: getFloorColor(floor) }}>
                            {rooms.map(r => <option key={r} value={r} className="text-gray-800">{r}</option>)}
                          </optgroup>
                        ))}
                      </>
                    )}
                  </select>
                </div>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className={`w-full py-4 text-white font-bold rounded-xl shadow-lg shadow-${theme}-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${formData.type === 'Leisure' ? 'bg-green-600 hover:bg-green-700' : formData.type === 'Lab' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <><Save size={20} /> Save Schedule</>}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AddSchedule;