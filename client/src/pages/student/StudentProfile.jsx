import React, { useState } from 'react';
import { User, Phone, Hash, MapPin, GraduationCap, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentProfile = () => {
  const { studentInfo } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  // State for all three password fields
  const [passData, setPassData] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    // 1. Client-side Validation
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error("New passwords do not match!");
    }
    if (passData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    
    setLoading(true);
    try {
      // We only send current and new password to the backend
      const { data } = await axios.put('/api/student/update-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });

      if (data.success) {
        toast.success("Security Updated Successfully");
        setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-gray-900">Student Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: READ-ONLY INFO --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start">
            <img 
              src={studentInfo?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo?.name || "S")}`} 
              className="h-44 w-44 rounded-3xl object-cover border-4 border-gray-50 shadow-sm"
              alt="Official Record"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 w-full">
               <ReadOnlyItem icon={<User size={16}/>} label="Full Name" value={studentInfo?.name} />
               <ReadOnlyItem icon={<Hash size={16}/>} label="Roll Number" value={studentInfo?.rollno} />
               <ReadOnlyItem icon={<GraduationCap size={16}/>} label="Department" value={studentInfo?.branch} />
               <ReadOnlyItem icon={<MapPin size={16}/>} label="Academic Year" value={`${studentInfo?.year} Year - ${studentInfo?.section}`} />
               <ReadOnlyItem icon={<Phone size={16}/>} label="Contact" value={studentInfo?.phno} />
               <ReadOnlyItem icon={<ShieldCheck size={16}/>} label="Status" value="Verified Active" color="text-green-600" />
            </div>
          </div>
        </div>

        {/* --- RIGHT: SECURE PASSWORD UPDATE --- */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Lock size={20}/></div>
            <h3 className="font-bold text-gray-800">Security Settings</h3>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <PasswordField 
              label="Current Password" 
              value={passData.currentPassword} 
              show={showPass}
              toggle={() => setShowPass(!showPass)}
              onChange={(val) => setPassData({...passData, currentPassword: val})} 
            />

            <div className="h-px bg-gray-100 my-2" />

            <PasswordField 
              label="New Password" 
              value={passData.newPassword} 
              show={showPass}
              toggle={() => setShowPass(!showPass)}
              onChange={(val) => setPassData({...passData, newPassword: val})} 
            />

            <PasswordField 
              label="Confirm New Password" 
              value={passData.confirmPassword} 
              show={showPass}
              toggle={() => setShowPass(!showPass)}
              onChange={(val) => setPassData({...passData, confirmPassword: val})} 
            />

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Update Security Key"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const PasswordField = ({ label, value, onChange, show, toggle }) => (
  <div className="space-y-1.5 relative">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={show ? "text" : "password"}
      required
      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <button 
      type="button"
      onClick={toggle}
      className="absolute right-3 top-8 text-gray-400 hover:text-indigo-600 transition-colors"
    >
      {show ? <EyeOff size={18}/> : <Eye size={18}/>}
    </button>
  </div>
);

const ReadOnlyItem = ({ icon, label, value, color = "text-gray-800" }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
      <span className="text-indigo-500">{icon}</span> {label}
    </p>
    <p className={`font-bold text-sm ${color}`}>{value || "---"}</p>
  </div>
);

export default StudentProfile;