import React, { useState } from 'react';
import { 
  Bell, Moon, Globe, Shield, 
  Smartphone, LogOut, Save, CheckCircle 
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentSettings = () => {
  const { studentInfo, setStudentInfo, logout } = useAppContext();
  const [loading, setLoading] = useState(false);

  // Initial State from Context
  const [settings, setSettings] = useState({
    notifications: studentInfo?.settings?.notifications ?? true,
    theme: studentInfo?.settings?.theme ?? 'light',
    language: studentInfo?.settings?.language ?? 'English'
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await axios.put('/api/student/settings', settings);
      if (data.success) {
        setStudentInfo({ ...studentInfo, settings: data.settings });
        toast.success("Preferences Saved");
      }
    } catch (err) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900">App Settings</h1>
        <p className="text-gray-500 font-medium">Manage your notifications and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- NOTIFICATIONS --- */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Bell size={20}/></div>
            <h3 className="font-bold text-gray-800">Notifications</h3>
          </div>
          <ToggleItem 
            label="Attendance Alerts" 
            desc="Notify me when my attendance is marked"
            enabled={settings.notifications}
            onClick={() => setSettings({...settings, notifications: !settings.notifications})}
          />
          <p className="text-[10px] text-gray-400 font-medium italic">* Low attendance warnings will always be sent via email.</p>
        </div>

        {/* --- APPEARANCE --- */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Moon size={20}/></div>
            <h3 className="font-bold text-gray-800">Appearance</h3>
          </div>
          <div className="flex gap-2">
            <ThemeOption 
              label="Light" 
              active={settings.theme === 'light'} 
              onClick={() => setSettings({...settings, theme: 'light'})} 
            />
            <ThemeOption 
              label="Dark" 
              active={settings.theme === 'dark'} 
              onClick={() => setSettings({...settings, theme: 'dark'})} 
            />
          </div>
        </div>

        {/* --- LANGUAGE --- */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Globe size={20}/></div>
            <h3 className="font-bold text-gray-800">Regional</h3>
          </div>
          <select 
            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium text-sm"
            value={settings.language}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Telugu</option>
          </select>
        </div>

        {/* --- SESSION CONTROL --- */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><Shield size={20}/></div>
            <h3 className="font-bold text-gray-800">Security Session</h3>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-between p-3 hover:bg-red-50 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-gray-400 group-hover:text-red-600" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700 group-hover:text-red-600">Logout everywhere</p>
                <p className="text-[10px] text-gray-400">Terminates all active login sessions</p>
              </div>
            </div>
            <LogOut size={18} className="text-gray-300 group-hover:text-red-600" />
          </button>
        </div>

      </div>

      {/* SAVE BUTTON */}
      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          {loading ? "Saving..." : <><Save size={18}/> Save Preferences</>}
        </button>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const ToggleItem = ({ label, desc, enabled, onClick }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-bold text-gray-800">{label}</p>
      <p className="text-[10px] text-gray-400">{desc}</p>
    </div>
    <button 
      onClick={onClick}
      className={`w-12 h-6 rounded-full relative transition-all ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'right-1' : 'left-1'}`} />
    </button>
  </div>
);

const ThemeOption = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 p-3 rounded-xl border font-bold text-xs transition-all ${
      active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-50 border-gray-100 text-gray-400'
    }`}
  >
    {label}
  </button>
);

export default StudentSettings;