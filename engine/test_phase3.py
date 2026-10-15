import sys
import time
from pathlib import Path
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.config import config
from engine.core.rppg import rppg_detector
from engine.core.sensor_fusion import sensor_fusion_engine, SensorTelemetry

def generate_synthetic_rppg_signal(
    duration_sec: float = 2.0,
    fps: float = 30.0,
    heart_rate_bpm: float = 72.0,
    noise_amplitude: float = 0.002,
    pulse_amplitude: float = 0.015
) -> np.ndarray:
    """
    Simulates diffuse capillary reflectance in human skin.
    Green channel exhibits strong absorption dips at systolic peaks.
    """
    num_samples = int(duration_sec * fps)
    t = np.linspace(0, duration_sec, num_samples)
    freq = heart_rate_bpm / 60.0  # e.g. 1.2 Hz for 72 BPM

    # Base skin color: R=180, G=130, B=110
    base_r = 180.0
    base_g = 130.0
    base_b = 110.0

    # Physiological pulse waveform (fundamental + 2nd harmonic)
    cardiac_wave = pulse_amplitude * np.sin(2 * np.pi * freq * t) + 0.3 * pulse_amplitude * np.sin(4 * np.pi * freq * t)

    # Green channel carries strongest hemoglobin absorption signal
    r_signal = base_r * (1.0 + 0.5 * cardiac_wave + np.random.normal(0, noise_amplitude, num_samples))
    g_signal = base_g * (1.0 - 1.0 * cardiac_wave + np.random.normal(0, noise_amplitude, num_samples))
    b_signal = base_b * (1.0 + 0.2 * cardiac_wave + np.random.normal(0, noise_amplitude, num_samples))

    return np.column_stack([r_signal, g_signal, b_signal]).astype(np.float32)

def generate_spoof_paper_signal(duration_sec: float = 2.0, fps: float = 30.0) -> np.ndarray:
    """Simulates a printed paper photo: static diffuse reflection + camera sensor noise."""
    num_samples = int(duration_sec * fps)
    base_r, base_g, base_b = 180.0, 130.0, 110.0
    # Zero cardiac modulation, only flat noise
    noise = np.random.normal(0, 0.001, (num_samples, 3))
    return np.array([base_r, base_g, base_b], dtype=np.float32) * (1.0 + noise)

def run_phase3_tests():
    print("=" * 68)
    print("  VISORA NEURAL IDENTITY ENGINE: PHASE 3 TEST SUITE")
    print("  Anti-Spoofing: rPPG Liveness Detection & Multi-Sensor Fusion")
    print(f"  Patent Ref: {config.PATENT_REF}")
    print("=" * 68)

    # -----------------------------------------------------------------
    # TEST 1: rPPG BLOOD VOLUME PULSE (BVP) LIVENESS DETECTION
    # -----------------------------------------------------------------
    print("\n--- 1. Testing rPPG Physiological Pulse Detection ---")

    # Case 1A: Genuine Living Human (72 BPM)
    target_bpm = 72.0
    live_buffer = generate_synthetic_rppg_signal(duration_sec=2.0, fps=30.0, heart_rate_bpm=target_bpm)
    res_live = rppg_detector.analyze_pulse(live_buffer, effective_fps=30.0)

    print(f"[+] Case 1A (Living Human Face):")
    print(f"    - Target BPM: {target_bpm} BPM")
    print(f"    - Extracted BPM: {res_live['heart_rate_bpm']} BPM")
    print(f"    - SNR: {res_live['snr_db']} dB (Threshold: {rppg_detector.snr_threshold_db} dB)")
    print(f"    - Liveness Score: {res_live['liveness_score']}")
    print(f"    - Verdict: {res_live['status']} (is_live={res_live['is_live']})")

    assert res_live["is_live"] is True, "Living human pulse should be recognized as authentic"
    assert abs(res_live["heart_rate_bpm"] - target_bpm) <= 6.0, f"BPM must be within ±6 BPM (got {res_live['heart_rate_bpm']})"
    assert res_live["snr_db"] >= rppg_detector.snr_threshold_db, "SNR must exceed threshold"

    # Case 1B: Spoof Attack (Printed Paper Photo / Static Mask)
    spoof_buffer = generate_spoof_paper_signal(duration_sec=2.0, fps=30.0)
    res_spoof = rppg_detector.analyze_pulse(spoof_buffer, effective_fps=30.0)

    print(f"\n[+] Case 1B (Printed Paper Presentation Attack):")
    print(f"    - Extracted BPM: {res_spoof['heart_rate_bpm']} BPM")
    print(f"    - SNR: {res_spoof['snr_db']} dB")
    print(f"    - Liveness Score: {res_spoof['liveness_score']}")
    print(f"    - Verdict: {res_spoof['status']} (is_live={res_spoof['is_live']})")

    assert res_spoof["is_live"] is False, "Printed photo must be rejected as spoof attack"
    assert res_spoof["status"] == "REJECTED_SPOOF_ATTACK" or res_spoof["liveness_score"] < 0.50

    # -----------------------------------------------------------------
    # TEST 2: MULTI-SENSOR FUSION (PIR + THERMAL + rPPG + ARCFACE)
    # -----------------------------------------------------------------
    print("\n--- 2. Testing Multi-Sensor Fusion & Security Veto Matrix ---")

    # Scenario 2.1: Authenticated Living Student
    legit_telemetry = SensorTelemetry(
        pir_motion_detected=True,
        pir_intensity=0.95,
        thermal_surface_temp=36.4,  # Normal forehead skin temp
        thermal_ambient_temp=24.0,
        device_id="GATE_NODE_01"
    )
    fusion_legit = sensor_fusion_engine.fuse(
        face_similarity=0.92,
        rppg_liveness=res_live,
        telemetry=legit_telemetry
    )
    print(f"[+] Scenario 2.1 (Living Student at Attendance Gate):")
    print(f"    - Fused Confidence: {fusion_legit.fused_confidence}")
    print(f"    - Verdict: {fusion_legit.security_verdict}")
    print(f"    - Authorized: {fusion_legit.authorized}")
    print(f"    - Veto Triggered: {fusion_legit.veto_triggered}")
    assert fusion_legit.authorized is True, "Legitimate student should be authorized"
    assert fusion_legit.veto_triggered is False

    # Scenario 2.2: Paper Mask Attack (High ArcFace Match, but Cold Surface & Zero Pulse)
    paper_telemetry = SensorTelemetry(
        pir_motion_detected=True,
        pir_intensity=0.8,
        thermal_surface_temp=22.5,  # Room temperature paper printout!
        thermal_ambient_temp=22.0
    )
    fusion_paper = sensor_fusion_engine.fuse(
        face_similarity=0.96,  # Impressively high face match!
        rppg_liveness=res_spoof,
        telemetry=paper_telemetry
    )
    print(f"\n[+] Scenario 2.2 (High-Res Printed Photo Presentation Attack):")
    print(f"    - Face Match Similarity: 0.96 (ArcFace)")
    print(f"    - Thermal Reading: 22.5°C")
    print(f"    - Fused Confidence: {fusion_paper.fused_confidence}")
    print(f"    - Verdict: {fusion_paper.security_verdict}")
    print(f"    - Veto Triggered: {fusion_paper.veto_triggered}")
    print(f"    - Veto Reason: {fusion_paper.veto_reason}")
    assert fusion_paper.authorized is False, "Paper spoof must NOT be authorized"
    assert fusion_paper.veto_triggered is True
    assert "Cold presentation attack" in fusion_paper.veto_reason or "Thermal" in fusion_paper.security_verdict

    # Scenario 2.3: Tablet / Smartphone Screen Replay Attack
    screen_telemetry = SensorTelemetry(
        pir_motion_detected=True,
        pir_intensity=0.9,
        thermal_surface_temp=27.0,  # Cold glass surface
        thermal_ambient_temp=24.0
    )
    fusion_screen = sensor_fusion_engine.fuse(
        face_similarity=0.89,
        rppg_liveness=res_spoof,  # Zero biological cardiac wave
        telemetry=screen_telemetry
    )
    print(f"\n[+] Scenario 2.3 (Tablet Screen Video Replay Attack):")
    print(f"    - Face Match Similarity: 0.89")
    print(f"    - Thermal Surface: 27.0°C")
    print(f"    - Fused Confidence: {fusion_screen.fused_confidence}")
    print(f"    - Verdict: {fusion_screen.security_verdict}")
    print(f"    - Authorized: {fusion_screen.authorized}")
    print(f"    - Veto Triggered: {fusion_screen.veto_triggered}")
    assert fusion_screen.authorized is False, "Screen replay must be rejected"
    assert fusion_screen.veto_triggered is True

    # Scenario 2.4: Thermal Confidence Function Test
    t_normal, _ = sensor_fusion_engine.compute_thermal_confidence(36.5)
    t_cold, v_cold = sensor_fusion_engine.compute_thermal_confidence(20.0)
    t_hot, v_hot = sensor_fusion_engine.compute_thermal_confidence(45.0)

    print(f"\n[+] Thermal Confidence Curve Verification:")
    print(f"    - 36.5°C score: {t_normal} (Ideal biological)")
    print(f"    - 20.0°C score: {t_cold} | Veto: {v_cold}")
    print(f"    - 45.0°C score: {t_hot} | Veto: {v_hot}")
    assert t_normal >= 0.95, "36.5°C should have ~1.0 confidence"
    assert t_cold == 0.0 and v_cold is not None, "20.0°C must trigger hard veto"
    assert t_hot == 0.0 and v_hot is not None, "45.0°C must trigger hard veto"

    print("\n" + "=" * 68)
    print("  ALL PHASE 3 ANTI-SPOOFING & MULTI-SENSOR FUSION TESTS PASSED!")
    print("=" * 68)

if __name__ == "__main__":
    run_phase3_tests()
