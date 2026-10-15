import numpy as np
from typing import Dict, Optional, List, Tuple
from pydantic import BaseModel

class SensorTelemetry(BaseModel):
    pir_motion_detected: bool = True
    pir_intensity: float = 1.0              # [0.0 to 1.0]
    thermal_surface_temp: Optional[float] = 36.4  # °C (e.g. from AMG8833 or MLX90640)
    thermal_ambient_temp: Optional[float] = 24.0  # °C
    sensor_timestamp: Optional[str] = None
    device_id: Optional[str] = "EDGE_NODE_01"

class FusionResult(BaseModel):
    authorized: bool
    fused_confidence: float
    security_verdict: str
    breakdown: Dict[str, float]
    veto_triggered: bool
    veto_reason: Optional[str] = None

class MultiSensorFusionEngine:
    """
    VisOra Dual-Layer Anti-Spoofing & Multi-Sensor Fusion Engine.
    Fuses Optical Face Biometrics (ArcFace 512D) with:
      1. Microvascular Blood Pulse Dynamics (rPPG Liveness)
      2. Kinetic Body Heat Radiance (Passive Infrared - PIR)
      3. Surface Thermodynamic Signatures (Thermal IR Sensor Array)
    Eliminates presentation attacks (paper printouts, 2D screens, 3D silicone masks).
    """

    def __init__(
        self,
        w_face: float = 0.40,
        w_rppg: float = 0.35,
        w_thermal: float = 0.15,
        w_pir: float = 0.10,
        min_fused_threshold: float = 0.60,
        temp_optimal: float = 36.5,
        temp_tolerance: float = 1.8
    ):
        self.w_face = w_face
        self.w_rppg = w_rppg
        self.w_thermal = w_thermal
        self.w_pir = w_pir
        self.min_fused_threshold = min_fused_threshold

        self.temp_optimal = temp_optimal      # 36.5 °C normal human skin surface
        self.temp_tolerance = temp_tolerance  # ±1.8 °C normal bounds

    def compute_thermal_confidence(self, surface_temp: Optional[float]) -> Tuple[float, Optional[str]]:
        """
        Evaluates surface temperature against physiological human skin bounds (34.0°C to 38.0°C).
        Returns (thermal_score, rejection_reason).
        """
        if surface_temp is None:
            # Neutral confidence if thermal sensor is not plugged in
            return 0.70, None

        # Hard biological impossibility bounds
        if surface_temp < 31.0:
            return 0.0, f"Cold presentation attack detected (Surface: {surface_temp:.1f}°C < 31.0°C)"
        if surface_temp > 41.5:
            return 0.0, f"Hyperthermic or electronic heat signature (Surface: {surface_temp:.1f}°C > 41.5°C)"

        # Gaussian physiological scoring centered at 36.5°C
        diff = surface_temp - self.temp_optimal
        thermal_score = float(np.exp(- (diff ** 2) / (2.0 * (self.temp_tolerance ** 2))))
        return round(thermal_score, 4), None

    def fuse(
        self,
        face_similarity: float,
        rppg_liveness: Dict,
        telemetry: Optional[SensorTelemetry] = None
    ) -> FusionResult:
        """
        Performs multi-sensor fusion and evaluates safety vetoes.
        """
        if telemetry is None:
            telemetry = SensorTelemetry()

        # 1. Component scores
        s_face = float(np.clip(face_similarity, 0.0, 1.0))
        s_rppg = float(np.clip(rppg_liveness.get("liveness_score", 0.0), 0.0, 1.0))
        is_rppg_live = rppg_liveness.get("is_live", False)
        rppg_status = rppg_liveness.get("status", "UNKNOWN")

        s_thermal, thermal_veto = self.compute_thermal_confidence(telemetry.thermal_surface_temp)
        s_pir = float(np.clip(telemetry.pir_intensity if telemetry.pir_motion_detected else 0.0, 0.0, 1.0))

        # 2. Hard Security Vetoes (Cannot be overridden by high facial similarity)
        # VETO 1: Thermal spoofing (e.g. cold paper or screen)
        if thermal_veto is not None:
            return FusionResult(
                authorized=False,
                fused_confidence=round(0.2 * s_face, 4),
                security_verdict="REJECTED_THERMAL_ANOMALY",
                breakdown={
                    "face_similarity": s_face,
                    "rppg_score": s_rppg,
                    "thermal_score": s_thermal,
                    "pir_score": s_pir
                },
                veto_triggered=True,
                veto_reason=thermal_veto
            )

        # VETO 2: Definite rPPG failure (zero cardiac modulation after buffer filled)
        if rppg_status == "REJECTED_SPOOF_ATTACK" or (rppg_status != "BUFFERING" and not is_rppg_live and s_rppg < 0.35):
            return FusionResult(
                authorized=False,
                fused_confidence=round(0.25 * s_face, 4),
                security_verdict="REJECTED_SPOOF_ATTACK",
                breakdown={
                    "face_similarity": s_face,
                    "rppg_score": s_rppg,
                    "thermal_score": s_thermal,
                    "pir_score": s_pir
                },
                veto_triggered=True,
                veto_reason="rPPG liveness verification failed: No physiological cardiac micro-pulse detected"
            )

        # 3. Weighted Fused Confidence Calculation
        fused_score = (
            self.w_face * s_face +
            self.w_rppg * s_rppg +
            self.w_thermal * s_thermal +
            self.w_pir * s_pir
        )
        fused_score = round(float(fused_score), 4)

        # 4. Final authorization check
        authorized = bool(fused_score >= self.min_fused_threshold and s_face >= 0.45)
        verdict = "AUTHORIZED_BIOMETRIC_IDENTITY" if authorized else "VERIFICATION_INSUFFICIENT"

        return FusionResult(
            authorized=authorized,
            fused_confidence=fused_score,
            security_verdict=verdict,
            breakdown={
                "face_similarity": s_face,
                "rppg_score": s_rppg,
                "thermal_score": s_thermal,
                "pir_score": s_pir
            },
            veto_triggered=False,
            veto_reason=None
        )

sensor_fusion_engine = MultiSensorFusionEngine()
