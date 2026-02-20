import React, { useState } from 'react';
import { User, Phone, Hash, MapPin, GraduationCap, Lock, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentProfile = () => {
  const { studentInfo } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  const [passData, setPassData] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error("New passwords do not match!");
    }
    if (passData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    
    setLoading(true);
    try {
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

  const getAvatar = () => {
    if (studentInfo?.image) return studentInfo.image;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      studentInfo?.name || "Student"
    )}&background=f3f4f6&color=4b5563&size=128`;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative">
            <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
          </div>

          <div className="px-6 sm:px-10 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 relative -mt-16 sm:-mt-20">
            {/* Avatar */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-md bg-white overflow-hidden shrink-0 z-10">
              <img
                src={getAvatar()}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name & Role */}
            <div className="flex-1 text-center sm:text-left mb-2 mt-4 sm:mt-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{studentInfo?.name || "Student Name"}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm font-medium text-gray-600">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold tracking-wide uppercase">
                  <ShieldCheck size={14} />
                  Verified Active
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  {studentInfo?.rollno || "ROLL NUMBER"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LEFT: Academic Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <GraduationCap size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Academic Profile</h3>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5">
              <ReadOnlyItem icon={<GraduationCap />} label="Department" value={studentInfo?.branch} />
              <ReadOnlyItem icon={<MapPin />} label="Year & Section" value={`${studentInfo?.year} Year - Section ${studentInfo?.section}`} />
              <ReadOnlyItem icon={<Mail />} label="College Email" value={studentInfo?.mail} />
              <ReadOnlyItem icon={<Phone />} label="Contact Number" value={studentInfo?.phno} />
              
              <div className="mt-auto pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  To update your academic details, please contact the administration office.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Security Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Lock size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Security Settings</h3>
            </div>

            <div className="p-6">
              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                <PasswordField 
                  label="Current Password" 
                  value={passData.currentPassword} 
                  show={showPass}
                  toggle={() => setShowPass(!showPass)}
                  onChange={(val) => setPassData({...passData, currentPassword: val})} 
                />

                <div className="h-px bg-gray-100 my-4" />

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

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading || !passData.currentPassword || !passData.newPassword || !passData.confirmPassword}
                    className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Updating...</>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const PasswordField = ({ label, value, onChange, show, toggle }) => (
  <div className="space-y-1 relative">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      <input 
        type={show ? "text" : "password"}
        required
        className="block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button 
        type="button"
        onClick={toggle}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        {show ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  </div>
);

const ReadOnlyItem = ({ icon, label, value }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-1">
      {React.cloneElement(icon, { size: 14, className: "text-gray-400" })}
      {label}
    </label>
    <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
      {value || <span className="text-gray-400 italic">Not available</span>}
    </div>
  </div>
);

export default StudentProfile;