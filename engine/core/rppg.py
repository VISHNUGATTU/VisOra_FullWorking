import cv2
import numpy as np
import scipy.signal as signal
from scipy.fft import rfft, rfftfreq
from typing import Dict, List, Optional, Tuple

class RPPGLivenessDetector:
    """
    Remote Photoplethysmography (rPPG) Anti-Spoofing & Liveness Engine.
    Detects volumetric blood pulse variations (BVP) from subtle chrominance
    fluctuations in human facial skin capillaries across video frames.
    Exposes 2D paper printouts, digital screen replays, and silicone masks.
    """

    def __init__(
        self,
        fps: float = 30.0,
        min_bpm: float = 45.0,
        max_bpm: float = 160.0,
        snr_threshold_db: float = 2.0,
        min_power_threshold: float = 0.05,
        min_buffer_size: int = 25
    ):
        self.fps = fps
        self.min_freq = min_bpm / 60.0  # ~0.75 Hz
        self.max_freq = max_bpm / 60.0  # ~2.67 Hz
        self.snr_threshold_db = snr_threshold_db
        self.min_power_threshold = min_power_threshold
        self.min_buffer_size = min_buffer_size

    def extract_skin_roi(
        self,
        frame_bgr: np.ndarray,
        bbox: List[float],
        landmarks: Optional[List[List[float]]] = None
    ) -> Optional[np.ndarray]:
        """
        Extracts facial forehead and upper cheek Region of Interest (ROI),
        omitting eyes, hair, beard, and mouth for clean capillary pulse signals.
        """
        h, w = frame_bgr.shape[:2]
        x1, y1 = max(0, int(bbox[0])), max(0, int(bbox[1]))
        x2, y2 = min(w, int(bbox[2])), min(h, int(bbox[3]))

        bw = x2 - x1
        bh = y2 - y1
        if bw < 30 or bh < 30:
            return None

        # Forehead & upper cheek zone (middle 60% width, top 15% to 55% height)
        roi_x1 = int(x1 + 0.20 * bw)
        roi_x2 = int(x1 + 0.80 * bw)
        roi_y1 = int(y1 + 0.15 * bh)
        roi_y2 = int(y1 + 0.55 * bh)

        roi = frame_bgr[roi_y1:roi_y2, roi_x1:roi_x2]
        if roi.size == 0:
            return None
        return roi

    @staticmethod
    def compute_roi_mean_rgb(roi_bgr: np.ndarray) -> np.ndarray:
        """
        Averages RGB values across skin pixels inside the ROI.
        Uses skin-color filtering in HSV space to discard non-skin pixels.
        """
        hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)
        lower_skin1 = np.array([0, 20, 50], dtype=np.uint8)
        upper_skin1 = np.array([25, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_skin1, upper_skin1)

        skin_pixels = roi_bgr[mask > 0]
        if len(skin_pixels) > 50:
            mean_bgr = np.mean(skin_pixels, axis=0)
            return np.array([mean_bgr[2], mean_bgr[1], mean_bgr[0]], dtype=np.float32)

        mean_bgr = np.mean(roi_bgr, axis=(0, 1))
        return np.array([mean_bgr[2], mean_bgr[1], mean_bgr[0]], dtype=np.float32)

    def analyze_pulse(self, rgb_temporal_buffer: np.ndarray, effective_fps: Optional[float] = None) -> Dict:
        """
        Executes chrominance decomposition (CHROM algorithm), zero-phase bandpass
        filtering, and FFT Power Spectral Density (PSD) analysis on a temporal buffer.
        """
        fps = effective_fps or self.fps
        N = len(rgb_temporal_buffer)
        if N < self.min_buffer_size:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "heart_rate_bpm": 0.0,
                "snr_db": -99.0,
                "status": "BUFFERING",
                "message": f"Buffering frames ({N}/{self.min_buffer_size} needed)"
            }

        # 1. Temporal normalization: C_n(t) = C(t) / mean(C) - 1
        mean_rgb = np.mean(rgb_temporal_buffer, axis=0) + 1e-6
        norm_rgb = (rgb_temporal_buffer / mean_rgb) - 1.0

        r = norm_rgb[:, 0]
        g = norm_rgb[:, 1]
        b = norm_rgb[:, 2]

        # 2. Chrominance Signal Extraction (CHROM Method - de Haan & Jeanne)
        x_s = 3.0 * r - 2.0 * g
        y_s = 1.5 * r + g - 1.5 * b

        std_y = np.std(y_s) + 1e-6
        std_x = np.std(x_s)
        alpha = std_x / std_y
        bvp_raw = x_s - alpha * y_s

        # 3. Butterworth Bandpass Filter (Cardiac band: 0.75 Hz to 2.50 Hz)
        nyq = 0.5 * fps
        low = max(0.01, self.min_freq / nyq)
        high = min(0.99, self.max_freq / nyq)

        if low >= high:
            bvp_filtered = bvp_raw - np.mean(bvp_raw)
        else:
            b_filt, a_filt = signal.butter(2, [low, high], btype='bandpass')
            bvp_filtered = signal.filtfilt(b_filt, a_filt, bvp_raw)

        bvp_var = float(np.var(bvp_filtered))

        # 4. FFT Power Spectral Density
        window = np.hamming(N)
        bvp_windowed = bvp_filtered * window

        fft_len = max(256, N)
        fft_vals = rfft(bvp_windowed, n=fft_len)
        freqs = rfftfreq(fft_len, d=1.0 / fps)
        psd = np.abs(fft_vals) ** 2

        # 5. Peak Frequency Identification in Cardiac Band
        cardiac_mask = (freqs >= self.min_freq) & (freqs <= self.max_freq)
        if not np.any(cardiac_mask) or np.sum(psd[cardiac_mask]) == 0:
            return {
                "is_live": False,
                "liveness_score": 0.0,
                "heart_rate_bpm": 0.0,
                "snr_db": -99.0,
                "status": "REJECTED_NO_PULSE",
                "message": "Zero pulse activity detected"
            }

        cardiac_psd = psd[cardiac_mask]
        cardiac_freqs = freqs[cardiac_mask]
        peak_idx = np.argmax(cardiac_psd)
        dominant_freq = float(cardiac_freqs[peak_idx])
        peak_val = float(cardiac_psd[peak_idx])
        heart_rate_bpm = round(dominant_freq * 60.0, 1)

        # 6. Spectral Concentration & Signal-to-Noise Ratio (SNR)
        peak_delta = 0.18
        peak_mask = (freqs >= dominant_freq - peak_delta) & (freqs <= dominant_freq + peak_delta)
        sig_power = float(np.sum(psd[peak_mask]))

        noise_mask = cardiac_mask & ~peak_mask
        n_noise_bins = max(1, int(np.sum(noise_mask)))
        n_sig_bins = max(1, int(np.sum(peak_mask)))

        noise_density = (float(np.sum(psd[noise_mask])) / n_noise_bins) + 1e-8
        snr = sig_power / (noise_density * n_sig_bins)
        snr_db = round(float(10.0 * np.log10(max(1e-4, snr))), 2)

        # 7. Physical Liveness Decision:
        # Requires coherent physiological pulsation amplitude AND focused spectral energy
        has_pulsation = bool(peak_val >= self.min_power_threshold and bvp_var >= 1e-4)
        is_live = bool(has_pulsation and (snr_db >= self.snr_threshold_db))

        if not has_pulsation:
            liveness_score = round(float(min(0.20, (peak_val / self.min_power_threshold) * 0.20)), 4)
        else:
            liveness_score = round(float(1.0 / (1.0 + np.exp(-0.8 * (snr_db - self.snr_threshold_db)))), 4)

        status = "AUTHENTIC_LIVING_PULSE" if is_live else "REJECTED_SPOOF_ATTACK"

        return {
            "is_live": is_live,
            "liveness_score": liveness_score,
            "heart_rate_bpm": heart_rate_bpm,
            "snr_db": snr_db,
            "dominant_freq_hz": round(dominant_freq, 3),
            "status": status,
            "message": f"Pulse verified at {heart_rate_bpm} BPM (SNR: {snr_db} dB)" if is_live else "Spoof attack: lack of coherent physiological blood pulse"
        }

rppg_detector = RPPGLivenessDetector()
