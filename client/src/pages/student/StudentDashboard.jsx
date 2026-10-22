import React, { useEffect, useState } from 'react';
import { 
  Book, AlertCircle, CheckCircle, Clock, Loader2, Info, 
  ShieldCheck, Calculator, Target, TrendingUp, Sparkles, ChevronRight 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Target Simulator States
  const [simSubject, setSimSubject] = useState('OVERALL');
  const [targetGoal, setTargetGoal] = useState(75);
  const [simulateMisses, setSimulateMisses] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await axios.get('/api/student/dashboard', { withCredentials: true });
        if (data.success) setData(data);
      } catch (err) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 text-indigo-600 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="font-medium text-gray-500">Loading your subjects...</p>
      </div>
    );
  }

  const { profile, overall, subjects } = data;

  // Helper function for 3-tier color system
  const getStatusConfig = (percentage) => {
    if (percentage >= 75) return { 
      bar: 'bg-emerald-500', text: 'text-emerald-600', 
      badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', label: 'Safe' 
    };
    if (percentage >= 50) return { 
      bar: 'bg-amber-500', text: 'text-amber-600', 
      badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', label: 'Warning' 
    };
    return { 
      bar: 'bg-rose-500', text: 'text-rose-600', 
      badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', label: 'Critical' 
    };
  };

  // --- TARGET SIMULATOR CALCULATIONS ---
  const activeSubjectData = simSubject === 'OVERALL'
    ? {
        name: 'Overall Attendance',
        totalClasses: overall.totalClasses || 0,
        presentClasses: overall.presentClasses || 0,
        percentage: overall.percentage || 0
      }
    : subjects.find(s => s.subject === simSubject) || {
        name: simSubject,
        totalClasses: 0,
        presentClasses: 0,
        percentage: 0
      };

  const currentPresent = activeSubjectData.presentClasses;
  const currentTotal = activeSubjectData.totalClasses;
  const currentPct = currentTotal > 0 ? (currentPresent / currentTotal) * 100 : 100;

  // 1. Classes needed to reach targetGoal (if current < target)
  let classesNeeded = 0;
  if (currentPct < targetGoal) {
    const targetRatio = targetGoal / 100;
    classesNeeded = Math.ceil((targetRatio * currentTotal - currentPresent) / (1 - targetRatio));
    if (classesNeeded < 0) classesNeeded = 0;
  }

  // 2. Classes safe to miss before falling below targetGoal (if current >= target)
  let safeToMiss = 0;
  if (currentPct >= targetGoal && currentTotal > 0) {
    const targetRatio = targetGoal / 100;
    safeToMiss = Math.floor((currentPresent / targetRatio) - currentTotal);
    if (safeToMiss < 0) safeToMiss = 0;
  }

  // 3. Projected percentage if missing future classes
  const projectedTotal = currentTotal + Number(simulateMisses);
  const projectedPct = projectedTotal > 0 ? (currentPresent / projectedTotal) * 100 : 100;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/50 min-h-screen font-sans animate-in fade-in duration-500 pb-16">
      
      {/* 1. WELCOME & OVERALL STATS HERO */}
      <div className="bg-gray-900 rounded-3xl p-6 md:p-10 text-white shadow-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
        
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 text-2xl md:text-3xl font-bold shadow-inner">
            {profile.name[0]}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-gray-400 text-sm font-medium">
              <span>{profile.rollno}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span>{profile.branch}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span>Year {profile.year}</span>
              {profile.biometricEnrolled && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck size={12} /> Neural ID Enrolled
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto text-left md:text-center bg-white/5 p-5 md:p-6 rounded-2xl backdrop-blur-md border border-white/10 relative z-10 min-w-[240px]">
          <p className="text-xs uppercase font-semibold tracking-wider text-gray-400 mb-2">Overall Attendance</p>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-4xl font-bold text-white">{overall.percentage.toFixed(1)}%</h2>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-1000 ease-out rounded-full" 
              style={{ width: `${overall.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE TARGET SIMULATOR & WHAT-IF PLANNER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Attendance Target Simulator</h2>
              <p className="text-xs text-gray-500">Plan future attendance, calculate safe margins to miss, or solve required classes to reach your goal.</p>
            </div>
          </div>

          {/* Subject Selector */}
          <select
            value={simSubject}
            onChange={(e) => {
              setSimSubject(e.target.value);
              setSimulateMisses(0);
            }}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="OVERALL">Overall Aggregate</option>
            {subjects.map((s, idx) => (
              <option key={idx} value={s.subject}>{s.subject}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Column 1: Target Goal Setting */}
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Target Threshold</span>
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {targetGoal}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[75, 80, 85, 90].map((goal) => (
                <button
                  key={goal}
                  onClick={() => setTargetGoal(goal)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    targetGoal === goal
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {goal}%
                </button>
              ))}
            </div>

            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={targetGoal}
              onChange={(e) => setTargetGoal(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-gray-400">Institutional examination cutoff requirement is 75%.</p>
          </div>

          {/* Column 2: Required or Safe Calculations */}
          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-5 rounded-2xl border border-indigo-100/80 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Goal Analysis</span>
              <p className="text-xs text-gray-600 mt-1">
                Currently at <strong className="text-gray-900">{currentPct.toFixed(1)}%</strong> ({currentPresent}/{currentTotal} classes).
              </p>
            </div>

            <div className="my-4">
              {currentPct < targetGoal ? (
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-rose-600">+{classesNeeded} Classes</p>
                  <p className="text-xs text-rose-700 font-medium">
                    Must attend next {classesNeeded} consecutive sessions without missing to reach {targetGoal}%.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-emerald-600">{safeToMiss} Classes</p>
                  <p className="text-xs text-emerald-700 font-medium">
                    Safe buffer: You can miss up to {safeToMiss} session{safeToMiss === 1 ? '' : 's'} and stay above {targetGoal}%.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-indigo-500 font-medium">
              Target benchmark: {targetGoal}% cutoff
            </div>
          </div>

          {/* Column 3: What-If Missing Slider */}
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">What-If Planner</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                Miss next {simulateMisses} class{simulateMisses === '1' || simulateMisses === 1 ? '' : 'es'}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={simulateMisses}
              onChange={(e) => setSimulateMisses(Number(e.target.value))}
              className="w-full accent-rose-500"
            />

            <div className="p-3 bg-white rounded-xl border border-gray-200/80 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Projected %:</span>
              <span className={`text-lg font-bold ${projectedPct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {projectedPct.toFixed(1)}%
              </span>
            </div>

            <p className="text-[11px] text-gray-400">
              {projectedPct >= 75
                ? '✅ Stays safely above the mandatory 75% threshold.'
                : '⚠️ Warning: Drops attendance below exam eligibility criteria.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SUBJECT-WISE BREAKDOWN HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Subject Breakdown</h3>
          <p className="text-xs text-gray-500">Course-by-course performance and individual attendance tracking.</p>
        </div>
      </div>

      {/* 4. SUBJECT-WISE GRID */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub, index) => {
          const status = getStatusConfig(sub.percentage);
          const isCritical = sub.percentage < 75;

          return (
            <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col h-full group">
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-gray-50 text-gray-600 rounded-xl group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                  <Book size={20} />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide ${status.badgeBg} ${status.badgeText}`}>
                  {sub.status || status.label}
                </span>
              </div>
              
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900 text-lg mb-1.5 leading-tight">{sub.subject}</h3>
                <p className="text-sm text-gray-500 font-medium">
                  {sub.presentClasses} <span className="text-gray-400 font-normal">/ {sub.totalClasses} classes attended</span>
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-end justify-between">
                   <span className="text-3xl font-bold text-gray-900">{sub.percentage.toFixed(0)}%</span>
                </div>
                
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${status.bar}`} 
                    style={{ width: `${sub.percentage}%` }}
                  />
                </div>

                {/* Conditional Actionable Insight */}
                <div className="h-6 mt-2">
                  {isCritical ? (
                    <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium bg-rose-50/50 p-1.5 rounded-lg w-fit">
                      <AlertCircle size={14}/> 
                      <span>Attend <strong>{sub.classesToAttend}</strong> more classes to reach 75%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                      <CheckCircle size={14}/> On track
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentDashboard;