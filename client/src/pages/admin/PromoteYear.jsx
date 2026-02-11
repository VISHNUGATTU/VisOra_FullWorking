import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, ArrowRight, 
  GraduationCap, CheckCircle, XCircle, Lock, Key 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

const PromoteStudents = () => {
  const { adminInfo } = useAppContext();
  
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [promotionStatus, setPromotionStatus] = useState(null); 
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetBatch, setTargetBatch] = useState(null); // Stores which year is selected (1, 2, 3, 4)
  const [authData, setAuthData] = useState({ pass1: "", pass2: "" });

  // --- 1. OPEN MODAL ---
  const initiatePromotion = (year) => {
    setTargetBatch(year);
    setAuthData({ pass1: "", pass2: "" }); // Reset inputs
    setModalOpen(true);
  };

  // --- 2. VERIFY & EXECUTE PROMOTION ---
  const handleFinalPromote = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // STEP 1: Verify Credentials First
      const verifyRes = await axios.post("/api/admin/verify-passwords", {
        passwordOne: authData.pass1,
        passwordTwo: authData.pass2
      });

      if (!verifyRes.data.success) {
        throw new Error("Verification failed");
      }

      // STEP 2: If Verified, Promote the Batch
      const promoteRes = await axios.put('/api/admin/promote-batch', { 
        targetYear: targetBatch 
      });
      
      if (promoteRes.data.success) {
        setPromotionStatus({
          year: targetBatch,
          message: promoteRes.data.message,
          count: promoteRes.data.modifiedCount
        });
        toast.success("Batch Promoted Successfully!");
        setModalOpen(false); // Close Modal
      }

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Action Failed. Check passwords.");
    } finally {
      setLoading(false);
    }
  };

  // Helper text for the modal
  const getBatchLabel = (year) => {
    if (year === 4) return "Final Year → Alumni (Graduated)";
    return `Year ${year} → Year ${year + 1}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-green-600" /> Batch Promotion Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authenticated Admin: <span className="font-mono font-bold text-gray-700">{adminInfo?.adminId || "Unknown"}</span>
          </p>
        </div>
        <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wide rounded-lg border border-red-100 flex items-center gap-2">
          <AlertTriangle size={14} /> Sensitive Action Zone
        </div>
      </div>

      {/* SUCCESS REPORT */}
      {promotionStatus && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4 animate-in fade-in">
          <CheckCircle className="text-green-600 shrink-0 mt-1" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-800">Operation Successful</h3>
            <p className="text-green-700 mt-1 text-sm">{promotionStatus.message}</p>
            <div className="mt-2 text-xs font-mono bg-white/60 inline-block px-3 py-1 rounded text-green-800 font-bold border border-green-100">
              Database Records Modified: {promotionStatus.count}
            </div>
          </div>
          <button onClick={() => setPromotionStatus(null)} className="text-green-400 hover:text-green-700 transition-colors">
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* PROMOTION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PromotionCard 
          year={1} from="1st Year" to="2nd Year" color="blue" icon={<ArrowRight />} 
          onPromote={() => initiatePromotion(1)} 
        />
        <PromotionCard 
          year={2} from="2nd Year" to="3rd Year" color="indigo" icon={<ArrowRight />} 
          onPromote={() => initiatePromotion(2)} 
        />
        <PromotionCard 
          year={3} from="3rd Year" to="4th Year" color="purple" icon={<ArrowRight />} 
          onPromote={() => initiatePromotion(3)} 
        />
        <PromotionCard 
          year={4} from="Final Year" to="Alumni" color="orange" icon={<GraduationCap />} isFinal={true}
          onPromote={() => initiatePromotion(4)} 
        />
      </div>

      {/* FOOTER INSTRUCTIONS */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" /> Recommended Workflow
        </h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
          <li>Start by graduating the <b>Final Year</b> batch first.</li>
          <li>Then promote <b>3rd → 4th</b>, followed by <b>2nd → 3rd</b>, and finally <b>1st → 2nd</b>.</li>
        </ul>
      </div>

      {/* ================= MODAL: DUAL AUTH CONFIRMATION ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-red-50 p-6 border-b border-red-100 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                  <Lock className="text-red-600" size={20} /> Final Authorization
                </h3>
                <p className="text-xs text-red-600/80 mt-1 font-medium">
                  Confirming action for: <span className="underline">{getBatchLabel(targetBatch)}</span>
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-700 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFinalPromote} className="p-6 space-y-5 bg-white">
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 mb-4">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <b>Warning:</b> You are about to update academic records for an entire batch. 
                  This action is irreversible. Verify identity to proceed.
                </p>
              </div>

              {/* Password 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 items-center gap-1">
                  <Key className="text-indigo-500" size={12} /> Password 1
                </label>
                <input 
                  type="password" 
                  value={authData.pass1}
                  onChange={(e) => setAuthData({...authData, pass1: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800 text-center tracking-widest font-bold"
                  placeholder="Primary Key"
                  autoFocus
                  required
                />
              </div>

              {/* Password 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1 items-center gap-1">
                  <Key className="text-indigo-500" size={12} /> Password 2
                </label>
                <input 
                  type="password" 
                  value={authData.pass2}
                  onChange={(e) => setAuthData({...authData, pass2: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-slate-800 text-center tracking-widest font-bold"
                  placeholder="Secondary Key"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Verifying...
                    </span>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Verify & Promote Batch
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

// --- SUB-COMPONENT: CARD ---
const PromotionCard = ({ year, from, to, color, icon, isFinal, onPromote }) => {
  const styles = {
    blue:   { bg: 'bg-blue-50', text: 'text-blue-600', btn: 'hover:bg-blue-600', border: 'border-blue-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', btn: 'hover:bg-indigo-600', border: 'border-indigo-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', btn: 'hover:bg-purple-600', border: 'border-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', btn: 'hover:bg-orange-600', border: 'border-orange-100' },
  }[color];

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border ${styles.border} flex flex-col justify-between hover:shadow-lg transition-all duration-300 group`}>
      <div>
        <div className={`w-12 h-12 rounded-xl ${styles.bg} ${styles.text} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
          <span className="font-bold text-xl">{year}</span>
        </div>
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Promote Batch</h3>
        <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
          {from} <span className="text-gray-300 text-sm"><ArrowRight size={14}/></span> {to}
        </div>
      </div>
      <button
        onClick={onPromote}
        className={`mt-8 w-full py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2
          ${isFinal 
            ? 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-100' 
            : `bg-slate-900 ${styles.btn} shadow-lg shadow-slate-200`
          }`}
      >
        {icon} {isFinal ? "Graduate Batch" : "Promote"}
      </button>
    </div>
  );
};

export default PromoteStudents;