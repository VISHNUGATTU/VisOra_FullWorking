import React, { useEffect, useState } from "react";
import {
  FiEdit,
  FiSave,
  FiUpload,
  FiLink,
  FiSearch,
  FiArrowLeft,
  FiBriefcase,
  FiUserCheck,
  FiLock,
  FiPhone,
  FiMail,
  FiImage
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const departmentOptions = [
  "CSE, CSBS & IT",
  "CSE - Cyber Security, DS & AIDS",
  "CSE - AIML & IoT",
  "ECE",
  "Civil Engineering",
  "Mechanical Engineering",
  "EIE",
  "Automobile Engineering",
];

const designationOptions = [
  "HOD",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lab Technician",
];

const UpdateFaculty = () => {
  const { axios } = useAppContext(); // Removed 'admin' destructuring if not strictly needed for logic to avoid lint warnings
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(false);

  // Image State
  const [imageMode, setImageMode] = useState("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");

  /* ================= LIVE SEARCH (FIXED) ================= */
  useEffect(() => {
    // 1. Don't search if empty
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const delay = setTimeout(async () => {
      try {
        // ✅ Corrected Route to match your facultyRouter
        const { data } = await axios.get(
          `/api/faculty/search?q=${query}`,
          { signal: controller.signal }
        );
        setResults(data.faculty || []);
      } catch (err) {
        if (err.name === "CanceledError") return;
        // Handle auth errors silently
        if (err.response?.status === 401) {
           setResults([]);
           return;
        }
        setResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
    
    // 🛑 CRITICAL FIX: Only [query] is here. 
    // Removing 'axios' and 'admin' stops the infinite loop.
  }, [query]);


  /* ================= IMAGE PREVIEW LOGIC ================= */
  useEffect(() => {
    if (imageMode === "url") {
      setPreview(imageUrl || (faculty?.image));
    } else if (imageMode === "upload" && imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } 
  }, [imageMode, imageUrl, imageFile, faculty?.image]);

  /* ================= LOAD FACULTY ================= */
  const loadFaculty = (fac) => {
    setFaculty(fac);
    setImageUrl(fac.image || "");
    setImageMode("url");
    setImageFile(null);
    setNewPassword(""); 
    setResults([]);
    setQuery("");
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const fd = new FormData();

      // Only append allowed fields
      if (faculty.name) fd.append("name", faculty.name);
      if (faculty.phno) fd.append("phno", faculty.phno);
      if (faculty.mail) fd.append("mail", faculty.mail);
      if (faculty.designation) fd.append("designation", faculty.designation);

      // Password Logic
      if (newPassword.trim()) {
        fd.append("password", newPassword);
      }

      // Image Logic
      if (imageMode === "url" && imageUrl) {
          fd.append("image", imageUrl);
      } else if (imageMode === "upload" && imageFile) {
          fd.append("image", imageFile);
      }

      // ✅ Corrected Route: /api/faculty/update
      await axios.put(
        `/api/faculty/update/${faculty.facultyId}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success("Faculty updated successfully");
      
      // Reset logic
      setFaculty(null);
      setQuery("");
      setNewPassword("");
      
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const getDesignationSelectValue = () => {
    if (!faculty?.designation) return "";
    return designationOptions.includes(faculty.designation)
      ? faculty.designation
      : "Other";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
                <FiUserCheck size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
             Update Faculty
            </h1>
        </div>

        <button
          onClick={() => navigate("/admin/faculty-management")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
          border border-slate-200 bg-white text-slate-600
          font-medium hover:bg-slate-50 transition"
        >
          <FiArrowLeft />
          Back
        </button>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-4 text-gray-400" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Name, Faculty ID, or Email..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
        />

        {/* RESULTS DROPDOWN */}
        {results.length > 0 && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {results.map((f) => (
              <div
                key={f._id}
                onClick={() => loadFaculty(f)}
                className="flex items-center gap-4 p-4 hover:bg-indigo-50 cursor-pointer border-b last:border-0 transition-colors"
              >
                <img
                  src={f.image || "https://via.placeholder.com/150"}
                  alt={f.name}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{f.name}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {f.facultyId} • {f.department}
                  </p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Select
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT FORM */}
      {faculty && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            
            {/* PROFILE HEADER */}
            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100">
                <div className="relative">
                    <img 
                        src={preview || faculty.image || "https://via.placeholder.com/150"} 
                        className="w-20 h-20 rounded-full object-cover border-4 border-slate-50 shadow-sm" 
                        alt="Profile" 
                    />
                    <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{faculty.name}</h2>
                    <div className="flex gap-3 text-sm text-slate-500 mt-1">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{faculty.facultyId}</span>
                        <span>•</span>
                        <span>{faculty.department}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-6">
                
                <Input
                    label="Faculty Name"
                    value={faculty.name}
                    onChange={(e) => setFaculty({ ...faculty, name: e.target.value })}
                />

                <div className="opacity-70">
                    <Input
                        label="Faculty ID"
                        value={faculty.facultyId}
                        disabled
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Cannot be changed directly.</p>
                </div>

                <div className="opacity-70">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Department</label>
                    <div className="relative">
                        <select
                            value={faculty.department}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none appearance-none font-medium text-slate-600 cursor-not-allowed"
                        >
                            <option value="">{faculty.department}</option>
                        </select>
                        <FiLock className="absolute right-4 top-3.5 text-slate-400" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Designation</label>
                    <div className="relative">
                        <select
                            value={getDesignationSelectValue()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFaculty({
                                ...faculty,
                                designation: val === "Other" ? "" : val,
                                });
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium text-slate-700"
                        >
                            <option value="">Select Designation</option>
                            {designationOptions.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                            <option value="Other">Other (Specify)</option>
                        </select>
                        <FiUserCheck className="absolute right-4 top-3.5 text-slate-400" />
                    </div>
                    
                    {getDesignationSelectValue() === "Other" && (
                        <input
                            type="text"
                            placeholder="Specify Designation"
                            value={faculty.designation}
                            onChange={(e) => setFaculty({ ...faculty, designation: e.target.value })}
                            className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 animate-fade-in-up"
                        />
                    )}
                </div>

                <div className="relative">
                    <Input
                        label="Email Address"
                        value={faculty.mail}
                        onChange={(e) => setFaculty({ ...faculty, mail: e.target.value })}
                    />
                    <FiMail className="absolute right-4 top-9 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                    <Input
                        label="Phone Number"
                        value={faculty.phno}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if(val.length <= 10) setFaculty({...faculty, phno: val});
                        }}
                    />
                    <FiPhone className="absolute right-4 top-9 text-slate-400 pointer-events-none" />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reset Password</label>
                    <div className="relative">
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                        />
                        <FiLock className="absolute right-4 top-3.5 text-slate-400" />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 mt-2">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-500 uppercase">Profile Image</label>
                        <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setImageMode("url")}
                                className={`px-3 py-1.5 rounded-md transition-all ${imageMode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                URL
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageMode("upload")}
                                className={`px-3 py-1.5 rounded-md transition-all ${imageMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Upload
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="shrink-0 w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <FiImage className="text-slate-300 text-3xl" />
                            )}
                        </div>

                        <div className="grow">
                            {imageMode === "url" ? (
                                <input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FiUpload className="w-6 h-6 text-slate-400 mb-1" />
                                        <p className="text-xs text-slate-500">
                                            {imageFile ? imageFile.name : "Click to upload New Image"}
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

                <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => {
                            setFaculty(null);
                            setQuery("");
                        }}
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading ? "Updating..." : (
                            <>
                                <FiSave /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, className = "", ...props }) => (
  <div className={className}>
    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
      {label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed placeholder-slate-400 transition-all"
    />
  </div>
);

export default UpdateFaculty;