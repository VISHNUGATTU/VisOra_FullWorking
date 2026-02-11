import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiPhone,
  FiMail,
  FiCamera,
  FiSave,
  FiArrowLeft,
  FiBriefcase,
  FiHash,
  FiBookOpen
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import axios from "axios";

const FacultyEditProfile = () => {
  const { setFacultyInfo } = useAppContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isChanged, setIsChanged] = useState(false); // Track changes

  // Store initial data to compare against
  const [initialData, setInitialData] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    phno: "",
    mail: "",
    department: "",
    designation: "",
    facultyId: ""
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // 1. Fetch Current Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/faculty/is-auth");
        if (data.success) {
          const f = data.faculty;
          const initial = {
            name: f.name || "",
            phno: f.phno || f.phone || "", 
            mail: f.mail || f.email || "",
            department: f.department || "",
            designation: f.designation || "",
            facultyId: f.facultyId || ""
          };
          
          setFormData(initial);
          setInitialData(initial); // Save initial state
          setImagePreview(f.image || "");
        }
      } catch (error) {
        toast.error("Failed to fetch profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // 2. Check for Changes
  useEffect(() => {
    // Check if text fields differ from initial data
    const isTextChanged = 
      JSON.stringify(formData) !== JSON.stringify(initialData);
    
    // Check if image is selected
    const isImageChanged = imageFile !== null;

    setIsChanged(isTextChanged || isImageChanged);
  }, [formData, imageFile, initialData]);


  // 3. Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Handle Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 5. Submit Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isChanged) return; // Prevent submit if no changes

    setSaving(true);

    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("phno", formData.phno);

      if (imageFile) {
        payload.append("image", imageFile);
      }

      const { data } = await axios.put("/api/faculty/update-profile", payload, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (data.success) {
        toast.success("Profile updated successfully");
        setFacultyInfo(data.faculty); 
        navigate("/faculty/profile");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Profile...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Edit Profile</h1>
        <button
          onClick={() => navigate("/faculty/profile")}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition font-medium"
        >
          <FiArrowLeft /> Back to Profile
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="px-8 pb-8">
          
          {/* Image Upload Section */}
          <div className="relative -mt-12 mb-8 flex justify-center sm:justify-start">
            <div className="relative group">
              <img
                src={imagePreview || `https://ui-avatars.com/api/?name=${formData.name}`}
                alt="Profile"
                className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-md bg-white"
              />
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transition-transform active:scale-95">
                <FiCamera size={18} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange} 
                />
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* --- Editable Fields --- */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">
                Personal Details
              </h3>
            </div>

            <Input 
              label="Full Name" 
              icon={<FiUser />} 
              name="name" 
              value={formData.name || ""} 
              onChange={handleChange} 
            />

            <Input 
              label="Phone Number" 
              icon={<FiPhone />} 
              name="phno" 
              type="tel"
              value={formData.phno || ""} 
              onChange={handleChange} 
            />

            {/* --- Read-Only Fields --- */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">
                Academic Information (Read Only)
              </h3>
            </div>

            <ReadOnlyInput 
              label="Faculty ID" 
              icon={<FiHash />} 
              value={formData.facultyId || ""} 
            />

            <ReadOnlyInput 
              label="Email Address" 
              icon={<FiMail />} 
              value={formData.mail || ""} 
            />

            <ReadOnlyInput 
              label="Department" 
              icon={<FiBookOpen />} 
              value={formData.department || ""} 
            />

            <ReadOnlyInput 
              label="Designation" 
              icon={<FiBriefcase />} 
              value={formData.designation || ""} 
            />

          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-slate-50">
            <button
              type="button"
              onClick={() => navigate("/faculty/profile")}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              // Disabled if saving OR no changes detected
              disabled={saving || !isChanged} 
              className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all
                ${!isChanged 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" // Fade style
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95" // Active style
                }
              `}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <FiSave size={18} /> Save Changes
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

/* --- Helper Components --- */

const Input = ({ label, icon, value, onChange, name, type = "text" }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative">
      <div className="absolute left-3.5 top-3.5 text-slate-400">{icon}</div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-800 font-medium"
      />
    </div>
  </div>
);

const ReadOnlyInput = ({ label, icon, value }) => (
  <div className="space-y-1.5 opacity-70">
    <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
      {label} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">LOCKED</span>
    </label>
    <div className="relative">
      <div className="absolute left-3.5 top-3.5 text-slate-400">{icon}</div>
      <input
        value={value}
        readOnly
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 font-medium cursor-not-allowed focus:outline-none"
      />
    </div>
  </div>
);

export default FacultyEditProfile;