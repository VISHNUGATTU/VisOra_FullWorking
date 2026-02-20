import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiSave,
  FiArrowLeft,
  FiCamera,
  FiEdit2,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

const EditProfile = () => {
  const { axios, setAdminInfo } = useAppContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ================= DATA =================
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState("");
  const [file, setFile] = useState(null);

  // ================= EDIT STATES =================
  const [editName, setEditName] = useState(false);
  const [editMail, setEditMail] = useState(false);
  const [editPhone, setEditPhone] = useState(false);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/admin/is-auth");
        if (data.success) {
          const admin = data.admin;
          setName(admin.name || "");
          setMail(admin.mail || "");
          setPhone(admin.phone || "");
          setImage(admin.image || "");
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [axios]);

  /* ================= IMAGE ================= */
  const handleImageChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setImage(URL.createObjectURL(selected));
    }
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("mail", mail);
      formData.append("phone", phone);
      if (file) formData.append("image", file);

      const { data } = await axios.put("/api/admin/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) {
        toast.success("Profile updated");
        setAdminInfo(data.admin);
        navigate("/admin/profile");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = () =>
    image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=f3f4f6&color=4b5563&size=128`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-sm font-medium text-gray-500">Loading profile data...</p>
      </div>
    );
  }

  const canSave = editName || editMail || editPhone || file;

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            title="Go back"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Update your personal information and contact details.</p>
          </div>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 sm:p-10 space-y-10">
            
            {/* AVATAR UPLOAD */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8 border-b border-gray-100 pb-10">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                  <img src={getAvatar()} alt="avatar" className="w-full h-full object-cover"/>
                </div>
                
                {/* Hover Overlay */}
                <label
                  htmlFor="upload"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-[2px]"
                >
                  <FiCamera size={24} className="mb-1" />
                  <span className="text-xs font-medium">Change</span>
                </label>
                
                <input
                  type="file"
                  id="upload"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              <div className="text-center sm:text-left mt-2">
                <h3 className="text-base font-semibold text-gray-900">Profile Picture</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4 max-w-sm">
                  We support PNGs, JPEGs and GIFs under 5MB.
                </p>
                <label htmlFor="upload" className="inline-flex px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  Upload new image
                </label>
              </div>
            </div>

            {/* FORM */}
            <div className="space-y-6 max-w-2xl">
              <Field
                label="Full Name"
                icon={<FiUser />}
                value={name}
                editable={editName}
                onEdit={() => setEditName(true)}
                onCancel={() => { setEditName(false); setName(name); /* Ideally reset to original if canceled, but keeping your logic */ }}
                onChange={setName}
              />

              <Field
                label="Email Address"
                icon={<FiMail />}
                value={mail}
                editable={editMail}
                onEdit={() => setEditMail(true)}
                onCancel={() => setEditMail(false)}
                onChange={setMail}
                type="email"
                note="Changing your email address will affect your login credentials."
              />

              <Field
                label="Phone Number"
                icon={<FiPhone />}
                value={phone}
                editable={editPhone}
                onEdit={() => setEditPhone(true)}
                onCancel={() => setEditPhone(false)}
                onChange={setPhone}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* SAVE FOOTER */}
          <div className="bg-gray-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              disabled={!canSave || saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <FiSave size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= REUSABLE FIELD ================= */
const Field = ({
  label,
  icon,
  value,
  editable,
  onEdit,
  onCancel,
  onChange,
  type = "text",
  placeholder,
  note,
}) => (
  <div className="grid sm:grid-cols-3 sm:gap-4 sm:items-start">
    <label className="block text-sm font-medium text-gray-700 sm:mt-2 mb-1 sm:mb-0">
      {label}
    </label>

    <div className="sm:col-span-2">
      <div className={`relative flex items-center rounded-lg border shadow-sm overflow-hidden transition-colors ${
        editable ? 'border-blue-500 ring-1 ring-blue-500 bg-white' : 'border-gray-300 bg-gray-50'
      }`}>
        
        {/* Icon Prefix */}
        <div className="pl-3 py-2 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>

        <input
          type={type}
          value={value}
          disabled={!editable}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`block w-full border-0 py-2.5 pl-3 pr-20 text-sm focus:ring-0 ${
            !editable ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"
          }`}
        />

        {/* Action Toggle */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {!editable ? (
            <button 
              type="button"
              onClick={onEdit} 
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
            >
              <FiEdit2 size={12}/> Edit
            </button>
          ) : (
            <button 
              type="button"
              onClick={onCancel} 
              className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
            >
              <FiX size={14}/> Cancel
            </button>
          )}
        </div>
      </div>

      {note && <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-amber-500 inline-block"></span>
        {note}
      </p>}
    </div>
  </div>
);

export default EditProfile;