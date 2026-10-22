import React from "react";

const WatcherEye = () => {
  return (
    <div
      className="watcher-eye pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 400"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="watcher-eye-svg"
      >
        <defs>
          <filter id="watcher-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="watcher-iris" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ecfeff" />
            <stop offset="18%" stopColor="#67e8f9" />
            <stop offset="48%" stopColor="#0891b2" />
            <stop offset="78%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#172554" />
          </radialGradient>

          <linearGradient id="watcher-outline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="watcher-laser-gradient">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>

          <pattern id="watcher-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.5"
              strokeOpacity="0.12"
            />
          </pattern>

          <clipPath id="watcher-eye-clip">
            <rect
              x="0"
              y="0"
              width="600"
              height="400"
              className="watcher-blink-mask"
            />
          </clipPath>
        </defs>

        <g className="watcher-eye-cycle">
          <g clipPath="url(#watcher-eye-clip)">
            {/* Technical rings */}
            <circle
              cx="300"
              cy="200"
              r="125"
              fill="none"
              stroke="#2563eb"
              strokeWidth="1"
              strokeOpacity="0.2"
              strokeDasharray="3 9"
              className="watcher-outer-ring"
            />

            <circle
              cx="300"
              cy="200"
              r="105"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1"
              strokeOpacity="0.25"
              strokeDasharray="2 7"
              className="watcher-inner-ring"
            />

            {/* Eye outline */}
            <path
              d="M75 200 Q300 30 525 200 Q300 370 75 200Z"
              fill="#071326"
              fillOpacity="0.45"
              stroke="url(#watcher-outline)"
              strokeWidth="1.6"
            />

            <path
              d="M90 200 Q300 48 510 200 Q300 352 90 200Z"
              fill="url(#watcher-grid)"
              opacity="0.6"
            />

            <path
              d="M75 200H525 M300 30V370"
              stroke="#38bdf8"
              strokeWidth="0.7"
              strokeOpacity="0.18"
              strokeDasharray="4 7"
            />

            {/* Moving iris */}
            <g className="watcher-pupil">
              <circle
                cx="300"
                cy="200"
                r="68"
                fill="#0891b2"
                opacity="0.15"
                filter="url(#watcher-glow)"
              />

              <circle
                cx="300"
                cy="200"
                r="58"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.3"
                strokeOpacity="0.75"
              />

              <circle
                cx="300"
                cy="200"
                r="48"
                fill="url(#watcher-iris)"
                opacity="0.9"
              />

              <circle
                cx="300"
                cy="200"
                r="37"
                fill="none"
                stroke="#cffafe"
                strokeWidth="1"
                strokeOpacity="0.45"
                strokeDasharray="2 4"
              />

              <circle
                cx="300"
                cy="200"
                r="29"
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="1"
                strokeOpacity="0.5"
              />

              {Array.from({ length: 16 }, (_, i) => (
                <line
                  key={i}
                  x1="300"
                  y1="165"
                  x2="300"
                  y2="176"
                  stroke="#ecfeff"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  transform={`rotate(${i * 22.5} 300 200)`}
                />
              ))}

              {/* Pupil */}
              <circle
                cx="300"
                cy="200"
                r="19"
                fill="#020817"
                stroke="#a5f3fc"
                strokeWidth="1.5"
              />

              <circle
                cx="300"
                cy="200"
                r="8"
                fill="#ecfeff"
                filter="url(#watcher-glow)"
              />

              <circle
                cx="294"
                cy="194"
                r="3.5"
                fill="#ffffff"
              />
            </g>

            {/* Scanning laser */}
            <g className="watcher-laser">
              <rect
                x="95"
                y="198"
                width="410"
                height="2"
                fill="url(#watcher-laser-gradient)"
              />
            </g>

            {/* Eye corners */}
            <g
              fill="none"
              stroke="#67e8f9"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            >
              <path d="M75 200l13-7M75 200l13 7" />
              <path d="M525 200l-13-7M525 200l-13 7" />
            </g>
          </g>

          {/* Corner indicators */}
          <g
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeOpacity="0.4"
          >
            <path d="M120 115V100H145" />
            <path d="M455 100H480V115" />
            <path d="M120 285V300H145" />
            <path d="M455 300H480V285" />
          </g>
        </g>
      </svg>

      <style>{`
        .watcher-eye-svg {
          display: block;
          max-width: 760px;
          overflow: visible;
          opacity: 0;
          animation: watcher-visibility 10s ease-in-out infinite;
        }

        .watcher-eye-cycle {
          transform-origin: 300px 200px;
          animation: watcher-scale 10s ease-in-out infinite;
        }

        .watcher-blink-mask {
          animation: watcher-blink 10s ease-in-out infinite;
        }

        .watcher-pupil {
          transform-origin: 300px 200px;
          animation: watcher-look 10s ease-in-out infinite;
        }

        .watcher-laser {
          animation: watcher-scan 10s ease-in-out infinite;
        }

        .watcher-outer-ring {
          transform-origin: 300px 200px;
          animation: watcher-rotate 30s linear infinite;
        }

        .watcher-inner-ring {
          transform-origin: 300px 200px;
          animation: watcher-rotate-reverse 22s linear infinite;
        }

        @keyframes watcher-visibility {
          0%, 100% { opacity: 0; }
          10% { opacity: 0.35; }
          20%, 75% { opacity: 0.7; }
          90% { opacity: 0; }
        }

        @keyframes watcher-scale {
          0%, 100% { transform: scale(0.94); }
          12%, 80% { transform: scale(1); }
          90% { transform: scale(1.04); }
        }

        @keyframes watcher-blink {
          0%, 5%, 90%, 100% {
            height: 0px;
            y: 200px;
          }
          15%, 78% {
            height: 400px;
            y: 0px;
          }
          85% {
            height: 0px;
            y: 200px;
          }
        }

        @keyframes watcher-look {
          0%, 20%, 80%, 100% { transform: translateX(0); }
          35%, 45% { transform: translateX(-24px); }
          60%, 70% { transform: translateX(24px); }
        }

        @keyframes watcher-scan {
          0%, 20%, 80%, 100% {
            opacity: 0;
            transform: translateY(-30px);
          }
          30% {
            opacity: 0.8;
            transform: translateY(-15px);
          }
          50% {
            opacity: 0.55;
            transform: translateY(20px);
          }
          70% {
            opacity: 0.8;
            transform: translateY(-5px);
          }
        }

        @keyframes watcher-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes watcher-rotate-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .watcher-eye-svg,
          .watcher-eye-cycle,
          .watcher-blink-mask,
          .watcher-pupil,
          .watcher-laser,
          .watcher-outer-ring,
          .watcher-inner-ring {
            animation: none !important;
          }

          .watcher-eye-svg {
            opacity: 0.35;
          }

          .watcher-blink-mask {
            height: 400px;
            y: 0px;
          }
        }
      `}</style>
    </div>
  );
};

export default WatcherEye;