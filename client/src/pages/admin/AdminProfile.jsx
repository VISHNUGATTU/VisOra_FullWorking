import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiCalendar,
  FiEdit3
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const AdminProfile = () => {
  const { axios, setAdminInfo } = useAppContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Profile State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mail, setMail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [image, setImage] = useState("");

  // Fetch Admin Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/admin/is-auth");
        if (data.success) {
          const admin = data.admin;
          setName(admin.name || "");
          setPhone(admin.phone || "");
          setMail(admin.mail || "");
          setImage(admin.image || "");
          setCreatedAt(admin.createdAt || new Date());
          setAdminInfo(admin);
        }
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [axios, setAdminInfo]);

  const getAvatar = () => {
    if (image) return image;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=f3f4f6&color=4b5563&size=128`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-sm font-medium text-gray-500">Loading profile data...</p>
      </div>
    );
  }

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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{name}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold tracking-wide uppercase">
                  <FiShield size={12} />
                  System Administrator
                </span>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="mb-2 sm:mb-4">
              <button
                onClick={() => navigate("/admin/edit-profile")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm w-full sm:w-auto justify-center"
              >
                <FiEdit3 size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Contact Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FiUser size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Contact Information</h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <FiMail className="text-gray-400 shrink-0" size={18}/>
                  <span className="text-sm font-medium text-gray-900 break-all">{mail}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <FiPhone className="text-gray-400 shrink-0" size={18} />
                  <span className="text-sm font-medium text-gray-900">
                    {phone || <span className="text-gray-400 italic">Not provided</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <FiShield size={18} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Account Details</h3>
            </div>

            <div className="px-6 py-2">
              <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <FiCalendar size={16} className="text-gray-400" />
                  <span>Member Since</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {new Date(createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <FiShield size={16} className="text-gray-400" />
                  <span>Account Status</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminProfile;