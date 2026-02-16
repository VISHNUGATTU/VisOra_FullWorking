import React, { useState } from 'react';
import axios from 'axios';
import { FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useAppContext } from '../../context/AppContext'; // Assuming you have this context for token/auth

const ChangeFacultyPassword = () => {
  const { user } = useAppContext(); // To get the auth token if needed
  
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  // --- Handle Input Change ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear errors when user starts typing again
    if (status.error) setStatus({ ...status, error: '' });
  };

  // --- Toggle Visibility ---
  const toggleShow = (field) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] });
  };

  // --- Handle Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    const { oldPassword, newPassword, confirmPassword } = formData;

    // 1. Client-Side Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setStatus({ loading: false, error: 'All fields are required', success: '' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ loading: false, error: 'New passwords do not match', success: '' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ loading: false, error: 'Password must be at least 6 characters', success: '' });
      return;
    }

    if (oldPassword === newPassword) {
      setStatus({ loading: false, error: 'New password cannot be the same as the old one', success: '' });
      return;
    }

    // 2. API Call
    try {
      const response = await axios.post(
        '/api/faculty/change-password',
        { oldPassword, newPassword },
        {
          headers: { Authorization: `Bearer ${user?.token}` } // Ensure token is sent
        }
      );

      if (response.data.success) {
        setStatus({ loading: false, error: '', success: response.data.message });
        // Clear form
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password';
      setStatus({ loading: false, error: msg, success: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
          <FiLock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
          <p className="text-sm text-gray-500">Update your account password securely</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* --- Old Password --- */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <div className="relative">
            <input
              type={showPassword.old ? "text" : "password"}
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => toggleShow('old')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
            >
              {showPassword.old ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        {/* --- New Password --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => toggleShow('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
              >
                {showPassword.new ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* --- Confirm Password --- */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword.confirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-4 pr-10 py-2.5 border rounded-lg focus:ring-2 transition-all 
                  ${formData.confirmPassword && formData.newPassword !== formData.confirmPassword 
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50" 
                    : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => toggleShow('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
              >
                {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
        </div>

        {/* --- Status Messages --- */}
        {status.error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg animate-fade-in">
            <FiAlertCircle size={18} />
            <span>{status.error}</span>
          </div>
        )}

        {status.success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg animate-fade-in">
            <FiCheck size={18} />
            <span>{status.success}</span>
          </div>
        )}

        {/* --- Submit Button --- */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={status.loading}
            className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
              ${status.loading 
                ? "bg-indigo-400 cursor-not-allowed" 
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"}`}
          >
            {status.loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangeFacultyPassword;