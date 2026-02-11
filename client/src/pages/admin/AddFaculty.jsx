import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiUserPlus,
  FiUpload,
  FiLink,
  FiArrowLeft,
  FiEye,
  FiEyeOff,
  FiImage
} from "react-icons/fi";

const AddFaculty = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    department: "",
    facultyId: "",
    mail: "",
    phno: "",
    designation: "",
  });

  // Image handling state
  const [imageMode, setImageMode] = useState("url"); // "url" | "upload"
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === "facultyId" ? value.toUpperCase() : value 
    });
  };

  // Handle Image Preview
  useEffect(() => {
    if (imageMode === "url") {
      setPreview(imageUrl);
    } else if (imageMode === "upload" && imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl); // Cleanup
    } else {
      setPreview(null);
    }
  }, [imageMode, imageUrl, imageFile]);

  // --- VALIDATION ---
  const validateForm = () => {
    const { name, password, department, facultyId, mail, phno, designation } = formData;

    if (!name || !password || !department || !facultyId || !mail || !phno || !designation) {
      toast.error("All fields are required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      toast.error("Invalid email address");
      return false;
    }

    if (phno.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = new FormData();

      // Append text fields
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });

      // Append Image logic
      if (imageMode === "url" && imageUrl) {
        payload.append("image", imageUrl); 
      } else if (imageMode === "upload" && imageFile) {
        payload.append("image", imageFile);
      }

      // ✅ FIX: Changed URL to match your facultyRouter definition
      // Your backend defines: facultyRouter.post("/add", ...) mounted at /api/faculty
      const { data } = await axios.post(
        "/api/faculty/add", 
        payload,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (data.success) {
        toast.success(data.message || "Faculty added successfully");
        
        // Reset Form
        setFormData({
          name: "", password: "", department: "", facultyId: "", mail: "", phno: "", designation: "",
        });
        setImageUrl("");
        setImageFile(null);
        setPreview(null);
      } else {
        toast.error(data.message || "Failed to add faculty");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Server Error: Failed to add faculty");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
            <FiUserPlus size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Add Faculty</h1>
        </div>

        <button
          onClick={() => navigate("/admin/faculty-management")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 transition"
        >
          <FiArrowLeft /> Back
        </button>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Name */}
          <Input 
            label="Faculty Name" 
            name="name" 
            placeholder="Dr. John Doe" 
            value={formData.name} 
            onChange={handleChange} 
          />

          {/* 2. Password with Toggle */}
          <div className="relative">
            <Input 
              label="Password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="******" 
              value={formData.password} 
              onChange={handleChange} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-slate-400 hover:text-indigo-600"
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          {/* 3. Department */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Department <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 appearance-none"
              >
                <option value="">Select Department</option>
                <option value="CSE, CSBS & IT">CSE, CSBS & IT</option>
                <option value="CSE - Cyber Security, DS & AIDS">CSE - Cyber Security, DS & AIDS</option>
                <option value="CSE - AIML & IoT">CSE - AIML & IoT</option>
                <option value="ECE">ECE</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="EIE">EIE</option>
                <option value="Automobile Engineering">Automobile Engineering</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* 4. Designation */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Designation <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 appearance-none"
              >
                <option value="">Select Designation</option>
                <option value="HOD">HOD</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lab Technician">Lab Technician</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* 5. Faculty ID */}
          <Input 
            label="Faculty ID" 
            name="facultyId" 
            placeholder="FAC001" 
            value={formData.facultyId} 
            onChange={handleChange} 
          />

          {/* 6. Phone Number */}
          <Input 
            label="Phone Number" 
            name="phno" 
            type="tel" 
            placeholder="9876543210" 
            value={formData.phno} 
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if(val.length <= 10) setFormData({...formData, phno: val});
            }} 
          />

          {/* 7. Email */}
          <div className="md:col-span-2">
            <Input 
              label="Email Address" 
              name="mail" 
              type="email" 
              placeholder="faculty@college.edu" 
              value={formData.mail} 
              onChange={handleChange} 
            />
          </div>

          {/* 8. Image Upload Section */}
          <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Profile Image
              </label>
              
              <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-3 py-1.5 rounded-md transition-all ${imageMode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`px-3 py-1.5 rounded-md transition-all ${imageMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Upload File
                </button>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              {/* Preview Box */}
              <div className="shrink-0 w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FiImage className="text-slate-300 text-3xl" />
                )}
              </div>

              {/* Input Area */}
              <div className="grow">
                {imageMode === "url" ? (
                  <input
                    type="text"
                    placeholder="https://example.com/photo.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiUpload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500">
                        {imageFile ? imageFile.name : "Click to upload PNG, JPG"}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2 flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <FiUserPlus /> Add Faculty Member
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

/* Reusable Input */
const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
      {label} <span className="text-red-500">*</span>
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-400 transition-all"
    />
  </div>
);

export default AddFaculty;