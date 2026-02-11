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
    )}&background=6366f1&color=fff&size=128&bold=true`;

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const canSave = editName || editMail || editPhone || file;

  /* ================= UI ================= */
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
        >
          <FiArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Edit Profile</h1>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-3xl shadow-sm border p-8 space-y-8">
        {/* AVATAR */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 shadow-md">
                <img src={getAvatar()} alt="avatar" className="w-full h-full object-cover rounded-full"/>
            </div>


            <input
              type="file"
              id="upload"
              hidden
              accept="image/*"
              onChange={handleImageChange}
            />

            <label
              htmlFor="upload"
              className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700"
            >
              <FiCamera size={16} />
            </label>
          </div>
        </div>

        {/* FORM */}
        <div className="space-y-6">

          {/* NAME */}
          <Field
            label="Full Name"
            icon={<FiUser />}
            value={name}
            editable={editName}
            onEdit={() => setEditName(true)}
            onCancel={() => setEditName(false)}
            onChange={setName}
          />

          {/* EMAIL */}
          <Field
            label="Email"
            icon={<FiMail />}
            value={mail}
            editable={editMail}
            onEdit={() => setEditMail(true)}
            onCancel={() => setEditMail(false)}
            onChange={setMail}
            type="email"
            note="Changing email affects login"
          />

          {/* PHONE */}
          <Field
            label="Phone"
            icon={<FiPhone />}
            value={phone}
            editable={editPhone}
            onEdit={() => setEditPhone(true)}
            onCancel={() => setEditPhone(false)}
            onChange={setPhone}
            placeholder="Enter phone number"
          />
        </div>

        {/* SAVE */}
        <div className="flex justify-end">
          <button
            disabled={!canSave || saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50"
          >
            <FiSave />
            {saving ? "Saving..." : "Save Changes"}
          </button>
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
  <div>
    <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>

    <div className="flex items-center gap-3 mt-1 p-3 rounded-xl bg-slate-50">
      <span className="text-slate-400">{icon}</span>

      <input
        type={type}
        value={value}
        disabled={!editable}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-transparent outline-none w-full font-medium ${
          !editable && "cursor-not-allowed text-slate-500"
        }`}
      />

      {!editable ? (
        <button onClick={onEdit} className="text-indigo-600">
          <FiEdit2 />
        </button>
      ) : (
        <button onClick={onCancel} className="text-red-500">
          <FiX />
        </button>
      )}
    </div>

    {note && <p className="text-[10px] text-orange-500 mt-1">{note}</p>}
  </div>
);

export default EditProfile;
