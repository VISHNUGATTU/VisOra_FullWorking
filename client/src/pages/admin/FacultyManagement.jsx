import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUserPlus,
  FiEdit,
  FiTrash2
} from "react-icons/fi";

const FacultyManagement = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Add Faculty",
      desc: "Register a new faculty into the system",
      icon: <FiUserPlus />,
      path: "/admin/faculty-management/add",
      color: "indigo",
    },
    {
      title: "Update Faculty",
      desc: "Edit existing faculty details",
      icon: <FiEdit />,
      path: "/admin/faculty-management/update",
      color: "purple",
    },
    {
      title: "Delete Faculty",
      desc: "Remove a faculty permanently",
      icon: <FiTrash2 />,
      path: "/admin/faculty-management/delete",
      color: "red",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-slate-800">
        Faculty Management
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={() => navigate(c.path)}
            className={`p-6 rounded-3xl bg-white border border-slate-100 shadow-sm
              hover:shadow-md transition text-left`}
          >
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-xl
              bg-${c.color}-50 text-${c.color}-600 mb-4`}
            >
              {c.icon}
            </div>
            <h3 className="font-bold text-slate-800">{c.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FacultyManagement;
