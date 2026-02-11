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
    )}&background=6366f1&color=fff&size=128&bold=true`;
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">

      {/* HEADER CARD */}
      <div className="relative bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>

        <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">

          {/* Avatar */}
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-white overflow-hidden">
            <img
              src={getAvatar()}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Name & Role */}
          <div className="flex-1 text-center md:text-left mb-2 w-full">
            <h1 className="text-2xl font-bold text-slate-800">{name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 mt-1">
              <FiShield className="text-indigo-500" />
              <span className="text-sm font-medium tracking-wide">
                ADMINISTRATOR
              </span>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate("/admin/edit-profile")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm"
            >
              <FiEdit3 size={18} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Contact Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FiUser />
            </span>
            Contact Information
          </h3>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center gap-3 mt-1 p-3 rounded-xl bg-slate-50">
                <FiMail className="text-slate-400" />
                <span className="font-medium text-slate-600">{mail}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex items-center gap-3 mt-1 p-3 rounded-xl bg-slate-50">
                <FiPhone className="text-slate-400" />
                <span className="font-medium text-slate-600">
                  {phone || "Not set"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <FiShield />
            </span>
            Account Details
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <div className="flex items-center gap-3 text-slate-600">
                <FiCalendar />
                <span className="font-medium">Joined On</span>
              </div>
              <span className="text-slate-800 font-semibold">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <div className="flex items-center gap-3 text-slate-600">
                <FiShield />
                <span className="font-medium">Status</span>
              </div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                Active
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminProfile;
