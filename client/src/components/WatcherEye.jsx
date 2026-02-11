import React from "react";

const WatcherEye = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
      <svg
        width="600"
        height="400"
        viewBox="0 0 200 150"
        className="opacity-0 animate-eye-cycle" // Controls the full appear/disappear cycle
      >
        <defs>
          {/* GLOW FILTER */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* GRADIENT FOR IRIS */}
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" /> {/* Indigo-400 */}
            <stop offset="100%" stopColor="#312e81" /> {/* Indigo-900 */}
          </radialGradient>
          
          {/* CLIP PATH FOR EYELIDS (Blinking Effect) */}
          <clipPath id="eyelid-clip">
            <rect x="0" y="0" width="200" height="150" className="animate-blink-mask" />
          </clipPath>
        </defs>

        {/* GROUP WITH CLIP PATH (Everything inside is masked by eyelids) */}
        <g clipPath="url(#eyelid-clip)" filter="url(#glow)">
          
          {/* SCLERA (Eye Shape Outline) */}
          <path
            d="M 10,75 Q 100,10 190,75 Q 100,140 10,75"
            fill="none"
            stroke="#4f46e5" // Indigo-600
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
          
          {/* TECH GRID LINES INSIDE EYE (Optional Detail) */}
          <path d="M 10,75 L 190,75" stroke="#4f46e5" strokeWidth="0.5" strokeOpacity="0.2" />
          <path d="M 100,10 L 100,140" stroke="#4f46e5" strokeWidth="0.5" strokeOpacity="0.2" />

          {/* THE PUPIL (Moves Left/Right) */}
          <g className="animate-scan">
            {/* Outer Iris */}
            <circle cx="100" cy="75" r="28" stroke="#6366f1" strokeWidth="1" fill="url(#irisGrad)" opacity="0.8" />
            {/* Inner Pupil (Glowing Center) */}
            <circle cx="100" cy="75" r="12" fill="#e0e7ff" />
            {/* Scanning Laser Line */}
            <rect x="98" y="47" width="4" height="56" fill="#a5b4fc" opacity="0.5" />
          </g>
        </g>
      </svg>

      {/* CSS ANIMATIONS */}
      <style>{`
        /* 1. MASTER CYCLE: Controls visibility (Total 10s loop) */
        @keyframes eye-cycle {
          0% { opacity: 0; transform: scale(0.9); }       /* Start Hidden */
          10% { opacity: 1; transform: scale(1); }        /* Fade In */
          80% { opacity: 1; transform: scale(1); }        /* Stay Visible */
          90% { opacity: 0; transform: scale(1.1); }      /* Fade Out */
          100% { opacity: 0; }                            /* Stay Hidden */
        }

        /* 2. BLINK MASK: Controls the opening/closing of eyelids */
        @keyframes blink-mask {
          0%, 5% { height: 0px; y: 75; }                 /* Closed */
          15% { height: 150px; y: 0; }                   /* Open */
          75% { height: 150px; y: 0; }                   /* Stay Open */
          85% { height: 0px; y: 75; }                    /* Close */
          100% { height: 0px; y: 75; }                   /* Stay Closed */
        }

        /* 3. SCAN: Controls the pupil movement */
        @keyframes scan {
          0%, 20% { transform: translateX(0); }          /* Center */
          35% { transform: translateX(-40px); }          /* Look Left */
          50% { transform: translateX(-40px); }          /* Hold Left */
          65% { transform: translateX(40px); }           /* Look Right */
          80% { transform: translateX(0); }              /* Back Center */
        }

        .animate-eye-cycle {
          animation: eye-cycle 10s ease-in-out infinite;
        }
        .animate-blink-mask {
          animation: blink-mask 10s ease-in-out infinite;
        }
        .animate-scan {
          transform-origin: center;
          animation: scan 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default WatcherEye;