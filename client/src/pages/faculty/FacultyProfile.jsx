import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiCalendar,
  FiEdit3,
  FiBookOpen,
  FiBriefcase
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const FacultyProfile = () => {
  const { axios, setFacultyInfo } = useAppContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Profile State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [image, setImage] = useState("");
  const [department, setDepartment] = useState(""); 
  const [designation, setDesignation] = useState(""); 

  // Fetch Faculty Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/faculty/is-auth");
        
        console.log("DEBUG: Faculty Data Received:", data); // <--- Check Console

        if (data.success) {
          const faculty = data.faculty;
          
          setName(faculty.name || "Faculty Member");
          
          // Check both 'phone' and 'phno' as backend schemas vary
          setPhone(faculty.phno || faculty.phone || "Not Provided");
          
          // Check both 'mail' and 'email'
          setEmail(faculty.mail || faculty.email || "Not Provided");
          
          setImage(faculty.image || "");
          setDepartment(faculty.department || "Not Assigned"); 
          setDesignation(faculty.designation || "Faculty"); 
          setCreatedAt(faculty.createdAt || new Date());
          
          // Update Context if available
          if(setFacultyInfo) setFacultyInfo(faculty);
        }
      } catch (error) {
        console.error("Profile Fetch Error:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [axios, setFacultyInfo]);

  const getAvatar = () => {
    if (image) return image;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "User"
    )}&background=4f46e5&color=fff&size=128&bold=true`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up p-6">

      {/* HEADER CARD */}
      <div className="relative bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Blue/Indigo Gradient for Faculty */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="px-8 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-6">

          {/* Avatar */}
          <div className="w-32 h-32 rounded-full border-4 border-white shadow-md bg-white overflow-hidden shrink-0">
            <img
              src={getAvatar()}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Name & Role */}
          <div className="flex-1 text-center md:text-left mb-2 w-full">
            <h1 className="text-2xl font-bold text-slate-800">{name}</h1>
            <div className="flex flex-col md:flex-row items-center gap-3 mt-1 text-slate-500">
              <div className="flex items-center gap-1">
                <FiBriefcase className="text-indigo-500" />
                <span className="text-sm font-medium">{designation}</span>
              </div>
              <span className="hidden md:block text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <FiBookOpen className="text-indigo-500" />
                <span className="text-sm font-medium">{department}</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate("/faculty/edit-profile")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
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
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FiUser size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Contact Information
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <FiMail className="text-slate-400 shrink-0" />
                <span className="font-medium truncate">{email}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <FiPhone className="text-slate-400 shrink-0" />
                <span className="font-medium">{phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FiShield size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Professional Details
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FiBriefcase size={14} />
                </div>
                <span className="font-medium">Designation</span>
              </div>
              <span className="text-slate-800 font-semibold text-right">
                {designation}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-dashed border-slate-100">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FiBookOpen size={14} />
                </div>
                <span className="font-medium">Department</span>
              </div>
              <span className="text-slate-800 font-semibold text-right">
                {department}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-dashed border-slate-100">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FiCalendar size={14} />
                </div>
                <span className="font-medium">Joined On</span>
              </div>
              <span className="text-slate-800 font-semibold">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FacultyProfile;