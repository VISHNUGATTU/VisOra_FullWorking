import React, { useEffect, useState, useMemo } from 'react';
import { 
  CalendarIcon, User, AlertCircle, ArrowLeft, Loader2, 
  CheckCircle, ShieldCheck, Search, Filter, MessageSquare, 
  Send, X, Sparkles, RefreshCw, Cpu
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalPresent: 0,
    totalAbsent: 0,
    biometricVerifiedCount: 0,
    percentage: 100
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'present', 'absent'
  const [searchQuery, setSearchQuery] = useState('');

  // Dispute Modal State
  const [disputeRecord, setDisputeRecord] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputedRecordIds, setDisputedRecordIds] = useState(new Set());

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/student/history', { withCredentials: true });
      if (data.success) {
        setHistory(data.history || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filtered list by Tab and Search
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Tab filter
      if (activeTab === 'present' && item.status !== 'Present') return false;
      if (activeTab === 'absent' && item.status !== 'Absent') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const subjectMatch = (item.subject || '').toLowerCase().includes(query);
        const facultyMatch = (item.faculty || '').toLowerCase().includes(query);
        return subjectMatch || facultyMatch;
      }
      return true;
    });
  }, [history, activeTab, searchQuery]);

  // Handle Dispute Submission
  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeRecord) return;
    if (!disputeReason.trim()) {
      return toast.error('Please enter a brief reason or explanation for your dispute.');
    }

    try {
      setSubmittingDispute(true);
      const res = await axios.post('/api/student/dispute-attendance', {
        attendanceId: disputeRecord.id,
        reason: disputeReason.trim()
      });

      if (res.data.success) {
        toast.success('Dispute sent to faculty for review!');
        setDisputedRecordIds((prev) => new Set(prev).add(disputeRecord.id));
        setDisputeRecord(null);
        setDisputeReason('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit dispute.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 text-indigo-600 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="font-medium text-gray-500">Loading your comprehensive attendance ledger...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-gray-50/50 font-sans animate-in fade-in duration-500 pb-16">
      
      {/* 1. HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl shadow-sm border border-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Attendance Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">Comprehensive audit trail of all classes held, attended, and verified.</p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 shadow-sm transition-all"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {/* 2. SUMMARY METRICS HERO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Total Classes</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{summary.totalSessions}</p>
          <p className="text-xs text-gray-400 mt-1">Held to date</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <p className="text-xs uppercase font-semibold text-emerald-600 tracking-wider">Attended</p>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">{summary.totalPresent}</p>
          <p className="text-xs text-emerald-600/80 mt-1">Sessions present</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
          <p className="text-xs uppercase font-semibold text-rose-600 tracking-wider">Absences</p>
          <p className="text-2xl md:text-3xl font-bold text-rose-600 mt-1">{summary.totalAbsent}</p>
          <p className="text-xs text-rose-600/80 mt-1">Missed sessions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-semibold text-indigo-600 tracking-wider">Attendance %</p>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
              {summary.percentage >= 75 ? 'Safe' : 'Warning'}
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-indigo-700 mt-1">{summary.percentage}%</p>
          <div className="flex items-center gap-1 text-[11px] text-indigo-600/80 mt-1">
            <ShieldCheck size={12} />
            <span>{summary.biometricVerifiedCount} Neural verified</span>
          </div>
        </div>
      </div>

      {/* 3. TABS & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Sessions ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('present')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'present'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Present ({summary.totalPresent})
          </button>
          <button
            onClick={() => setActiveTab('absent')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'absent'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Absences ({summary.totalAbsent})
          </button>
        </div>

        {/* Live Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subject or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN RECORDS FEED */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No records found</h2>
          <p className="text-gray-500 mt-1 text-sm">
            {searchQuery
              ? `No records matching "${searchQuery}". Try a different keyword.`
              : activeTab === 'absent'
              ? "You haven't missed a single class in this category. Perfect streak!"
              : 'Attendance records for your class will appear here once marked by faculty.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredHistory.map((record) => {
            const isPresent = record.status === 'Present';
            const isBiometric = record.isBiometricVerified;
            const hasDisputed = disputedRecordIds.has(record.id);

            return (
              <div 
                key={record.id}
                className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                  {/* Calendar Badge */}
                  <div className={`flex flex-col items-center justify-center rounded-xl px-3.5 py-2.5 min-w-[70px] border transition-colors ${
                    isPresent
                      ? 'bg-emerald-50/50 border-emerald-100 group-hover:bg-emerald-100/60 text-emerald-800'
                      : 'bg-rose-50/50 border-rose-100 group-hover:bg-rose-100/60 text-rose-800'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold mt-0.5 leading-none">
                      {new Date(record.date).getDate()}
                    </span>
                  </div>

                  {/* Subject & Meta Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-base truncate">{record.subject}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                        record.type === 'Lab' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {record.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1 text-gray-600">
                        <User size={13} className="text-gray-400" /> {record.faculty}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric' })}</span>
                      
                      {/* Biometric or Mode Pill */}
                      {isPresent && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            isBiometric
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isBiometric ? <ShieldCheck size={11} className="text-emerald-600" /> : <Cpu size={11} />}
                            {record.modeLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Status Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {isPresent ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={14} className="text-emerald-600" /> Present
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Absent
                      </span>
                      <button
                        onClick={() => {
                          setDisputeRecord(record);
                          setDisputeReason('');
                        }}
                        disabled={hasDisputed}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          hasDisputed
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <MessageSquare size={13} />
                        {hasDisputed ? 'Dispute Pending' : 'Dispute Absence'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. DISPUTE MODAL */}
      {disputeRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Dispute Absence Record</h3>
                <p className="text-xs text-gray-500 mt-0.5">Submit an attendance claim directly to your instructor for review.</p>
              </div>
              <button 
                onClick={() => setDisputeRecord(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Subject:</span>
                <span className="font-semibold text-gray-800">{disputeRecord.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Faculty:</span>
                <span className="font-semibold text-gray-800">{disputeRecord.faculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-semibold text-gray-800">{new Date(disputeRecord.date).toLocaleDateString()}</span>
              </div>
            </div>

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Reason / Claim Explanation
                </label>
                <textarea
                  rows={3}
                  required
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you were present (e.g. Arrived on time, was presenting at podium, biometric scan sync delay)..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submittingDispute ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INSTITUTIONAL AUDIT NOTICE */}
      <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 flex gap-3 items-start">
        <Sparkles className="text-indigo-600 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Neural Verification System:</span> Attended sessions verified via the VisOra Neural Identity Engine (SCRFD RetinaFace + ArcFace 512D) are cryptographically committed to institutional ledger records with tamper-proof signatures.
        </p>
      </div>

    </div>
  );
};

export default AttendanceHistory;