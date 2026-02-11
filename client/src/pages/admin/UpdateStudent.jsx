import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEdit,
  FiSave,
  FiUpload,
  FiLink,
  FiSearch,
  FiArrowLeft,
  FiLayers,
  FiGrid,
  FiLock
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

// Comprehensive Branch List
const branchOptions = [
  { code: "CSE", name: "CSE - Computer Science" },
  { code: "CSE-AI", name: "CSE - AI & ML" },
  { code: "CSE-DS", name: "CSE - Data Science" },
  { code: "IT", name: "IT - Information Tech" },
  { code: "ECE", name: "ECE - Electronics" },
  { code: "EEE", name: "EEE - Electrical" },
  { code: "ME", name: "ME - Mechanical" },
  { code: "CE", name: "CE - Civil" },
  { code: "CS", name: "CS - Cyber Security" },
];

const UpdateStudent = () => {
  const navigate = useNavigate();
  const { axios } = useAppContext();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  // Image State
  const [imageMode, setImageMode] = useState("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");

  /* ================= LIVE SEARCH ================= */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `/api/student/search?q=${query}`
        );
        setResults(data.students || []);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  /* ================= LOAD STUDENT ================= */
  const loadStudent = (stu) => {
    setStudent({
        ...stu,
        year: stu.year || 1,
        section: stu.section || "A"
    });
    setImageUrl(stu.image || "");
    setImageMode("url");
    setImageFile(null);
    setNewPassword(""); // Reset password field
    setResults([]);
    setQuery(""); 
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const fd = new FormData();

      // Append text fields
      Object.entries(student).forEach(([k, v]) => {
        if (!["_id", "__v", "createdAt", "updatedAt", "image", "password"].includes(k)) {
          if (v !== "" && v !== null) fd.append(k, v);
        }
      });

      // Handle Password Update (Only if admin typed a new one)
      if (newPassword.trim()) {
        fd.append("password", newPassword);
      }

      // Handle Image Logic
      if (imageMode === "url") {
          fd.set("image", imageUrl);
      }
      if (imageMode === "upload" && imageFile) {
          fd.set("image", imageFile);
      }

      await axios.put(
        `/api/student/update/${student.rollno}`,
        fd
      );

      toast.success("Student updated successfully");
      setStudent(null);
      setQuery("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
                <FiEdit size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
            Update Student
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

      {/* SEARCH */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-4 text-gray-400" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Name, Roll No, or Email..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm"
        />

        {/* RESULTS */}
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-white border rounded-xl shadow-xl overflow-hidden">
            {results.map((s) => (
              <div
                key={s._id}
                onClick={() => loadStudent(s)}
                className="flex items-center gap-4 p-4 hover:bg-orange-50 cursor-pointer border-b last:border-0"
              >
                <img
                  src={s.image || "https://via.placeholder.com/150"}
                  alt={s.name}
                  className="h-10 w-10 rounded-full object-cover border"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {s.rollno} • {s.branch} • Year {s.year}
                  </p>
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT FORM */}
      {student && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <img src={student.image || imageUrl || "https://via.placeholder.com/150"} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" alt="Profile" />
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Editing: {student.name}</h2>
                    <p className="text-sm text-slate-500">{student.rollno}</p>
                </div>
            </div>

            <form
            onSubmit={handleUpdate}
            className="grid md:grid-cols-2 gap-6"
            >
            <Input
                label="Student Name"
                value={student.name}
                onChange={(e) =>
                setStudent({ ...student, name: e.target.value })
                }
            />

            <Input
                label="Roll Number"
                value={student.rollno}
                disabled
            />

            {/* Branch */}
            <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                Branch
                </label>
                <div className="relative">
                    <select
                        value={student.branch}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium text-slate-700"
                    >
                        {branchOptions.map((b) => (
                            <option key={b.code} value={b.code}>
                            {b.name}
                            </option>
                        ))}
                    </select>
                    <FiLayers className="absolute right-4 top-3.5 text-slate-400" />
                </div>
            </div>

            {/* Year & Section Row */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                        Year
                    </label>
                    <select
                        value={student.year}
                        onChange={(e) => setStudent({ ...student, year: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700"
                    >
                        {[1, 2, 3, 4].map((y) => (
                            <option key={y} value={y}>{y} Year</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                        Section
                    </label>
                    <div className="relative">
                        <select
                            value={student.section}
                            disabled // <--- DISABLED ADDED HERE
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700 appearance-none cursor-not-allowed"
                        >
                            {["A", "B", "C", "D"].map((sec) => (
                                <option key={sec} value={sec}>Sec {sec}</option>
                            ))}
                        </select>
                        <FiGrid className="absolute right-4 top-3.5 text-slate-400" />
                    </div>
                </div>
            </div>

            <Input
                label="Email"
                value={student.mail}
                onChange={(e) =>
                setStudent({ ...student, mail: e.target.value })
                }
            />

            <Input
                label="Phone"
                value={student.phno}
                onChange={(e) =>
                setStudent({ ...student, phno: e.target.value })
                }
            />

            {/* Password Reset Field */}
            <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                    Reset Password
                </label>
                <div className="relative">
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700"
                    />
                    <FiLock className="absolute right-4 top-3.5 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Only enter if you want to change it.</p>
            </div>


            {/* IMAGE */}
            <div className="md:col-span-2 space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase">Profile Image</label>
                <div className="flex gap-6 text-sm font-medium text-slate-600">
                <label className="flex gap-2 items-center cursor-pointer hover:text-orange-600 transition">
                    <input
                    type="radio"
                    checked={imageMode === "url"}
                    onChange={() => setImageMode("url")}
                    className="accent-orange-600"
                    />
                    <FiLink /> URL
                </label>

                <label className="flex gap-2 items-center cursor-pointer hover:text-orange-600 transition">
                    <input
                    type="radio"
                    checked={imageMode === "upload"}
                    onChange={() => setImageMode("upload")}
                    className="accent-orange-600"
                    />
                    <FiUpload /> Upload File
                </label>
                </div>

                {imageMode === "url" && (
                <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                )}

                {imageMode === "upload" && (
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                    setImageFile(e.target.files[0])
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                )}
            </div>

            <div className="md:col-span-2 text-right pt-4 border-t border-slate-100">
                <button
                disabled={loading}
                className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200
                hover:bg-orange-700 transition active:scale-95 disabled:opacity-70 flex items-center gap-2 ml-auto"
                >
                <FiSave />
                {loading ? "Updating..." : "Save Changes"}
                </button>
            </div>
            </form>
        </div>
      )}
    </div>
  );
};

/* ================= Reusable Input ================= */
const Input = ({ label, ...props }) => (
  <div>
    <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
      {label}
    </label>
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-700"
    />
  </div>
);

export default UpdateStudent;