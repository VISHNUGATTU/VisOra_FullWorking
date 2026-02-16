import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiUserPlus,
  FiUpload,
  FiLink,
  FiArrowLeft,
  FiLayers,
  FiGrid
} from "react-icons/fi";

const AddStudent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    year: "",      
    section: "",   
    branch: "",
    rollno: "",
    mail: "",
    phno: "",
  });

  // Image handling
  const [imageMode, setImageMode] = useState("url"); // "url" | "upload"
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- CLIENT SIDE VALIDATION ---
  const validateForm = () => {
    const { name, password, branch, rollno, mail, phno, year, section } = formData;

    // 1. Check Empty
    if (!name || !password || !branch || !rollno || !mail || !phno || !year || !section) {
      toast.error("All fields are mandatory");
      return false;
    }

    // 2. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // 3. Validate Phone (10 Digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phno)) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }

    // 4. Validate Password
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run Validation
    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = new FormData();

      // Append all text fields
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });

      // Handle Image
      if (imageMode === "url" && imageUrl) {
        payload.append("image", imageUrl);
      } else if (imageMode === "upload" && imageFile) {
        payload.append("image", imageFile);
      }

      const { data } = await axios.post(
        "/api/student/add",
        payload,
        { 
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" } 
        }
      );

      toast.success(data.message || "Student added successfully");

      // Reset Form
      setFormData({
        name: "",
        password: "",
        year: "1",
        section: "A",
        branch: "",
        rollno: "",
        mail: "",
        phno: "",
      });
      setImageUrl("");
      setImageFile(null);
      setImageMode("url");

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
            <FiUserPlus size={22} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Add Student
          </h1>
        </div>

        <button
          onClick={() => navigate("/admin/student-management")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
          border border-slate-200 bg-white text-slate-700
          font-medium hover:bg-slate-100 transition"
        >
          <FiArrowLeft />
          Back
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Input
            label="Student Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
          />

          <Input
            label="Roll Number"
            name="rollno"
            value={formData.rollno}
            onChange={handleChange}
            placeholder="e.g. 21X41A0501"
          />

          {/* Branch Selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              Branch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 appearance-none"
              >
                <option value="">Select Branch</option>
                <option value="CSE">CSE - Computer Science</option>
                <option value="CSE-AI">CSE - AI & ML</option>
                <option value="CSE-DS">CSE - Data Science</option>
                <option value="IT">IT - Information Tech</option>
                <option value="ECE">ECE - Electronics</option>
                <option value="EEE">EEE - Electrical</option>
                <option value="ME">ME - Mechanical</option>
                <option value="CE">CE - Civil</option>
                <option value="CS">CS - Cyber Security</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                <FiLayers />
              </div>
            </div>
          </div>

          {/* Academic Info Row (Year & Section) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Year
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              >
                <option values="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Section
              </label>
              <div className="relative">
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 appearance-none"
                >
                  {["A","B","C","D"].map(sec => (
                     <option key={sec} value={sec}>Sec {sec}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                  <FiGrid />
                </div>
              </div>
            </div>
          </div>

          <Input
            label="Email Address"
            name="mail"
            type="email"
            value={formData.mail}
            onChange={handleChange}
            placeholder="student@college.edu"
          />

          <Input
            label="Phone Number"
            name="phno"
            type="tel" 
            value={formData.phno}
            onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if(val.length <= 10) setFormData({...formData, phno: val});
            }}
            placeholder="10 Digit Mobile Number"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min 6 Characters"
          />

          {/* Image Section */}
          <div className="md:col-span-2 space-y-3 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Profile Image
            </label>

            <div className="flex gap-6 text-sm font-medium text-slate-600 mb-2">
              <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition">
                <input
                  type="radio"
                  checked={imageMode === "url"}
                  onChange={() => setImageMode("url")}
                  className="accent-indigo-600"
                />
                <FiLink /> Image URL
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition">
                <input
                  type="radio"
                  checked={imageMode === "upload"}
                  onChange={() => setImageMode("upload")}
                   className="accent-indigo-600"
                />
                <FiUpload /> Upload Image
              </label>
            </div>

            {imageMode === "url" && (
              <input
                type="text"
                placeholder="https://image-url.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl
                border border-slate-200 bg-slate-50
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            )}

            {imageMode === "upload" && (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition active:scale-95 disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-indigo-200"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   Adding Student...
                </span>
              ) : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= Reusable Input ================= */

const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
      {label} <span className="text-red-500">*</span>
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl
      border border-slate-200 bg-slate-50
      focus:outline-none focus:ring-2 focus:ring-indigo-500
      font-medium text-slate-800 placeholder:text-slate-400 transition-all"
    />
  </div>
);

export default AddStudent;