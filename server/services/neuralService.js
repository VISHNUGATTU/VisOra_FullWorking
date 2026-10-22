import dotenv from "dotenv";
dotenv.config();

const NEURAL_ENGINE_URL = process.env.NEURAL_ENGINE_URL || "http://localhost:8000";

/**
 * Service bridge between Node.js Express backend and
 * the Python FastAPI VisOra Neural Identity Engine.
 */
class NeuralService {
  constructor() {
    this.baseUrl = NEURAL_ENGINE_URL;
  }

  /**
   * Pings the Python Neural Engine to check service status & FAISS vector count.
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { online: false, status: "error", code: response.status };
      }

      const data = await response.json();
      return {
        online: true,
        status: data.status,
        app_name: data.app_name,
        version: data.version,
        patent: data.patent,
        vector_store: data.vector_store
      };
    } catch (err) {
      return {
        online: false,
        status: "offline",
        message: err.message || "Neural Engine unreachable"
      };
    }
  }

  /**
   * Enrolls a student face into the FAISS vector index via the Neural Engine.
   */
  async enrollStudent({ studentId, rollno, name, branch, year, section, imageUrl }) {
    if (!imageUrl) {
      console.warn(`[NeuralService] Skipping face enrollment for ${rollno}: No image URL provided.`);
      return { success: false, reason: "NO_IMAGE" };
    }

    try {
      const payload = {
        student_id: String(studentId),
        rollno: String(rollno).trim().toUpperCase(),
        name: String(name).trim(),
        branch: branch || "",
        year: year ? Number(year) : null,
        section: section || "",
        image_url: imageUrl
      };

      const response = await fetch(`${this.baseUrl}/api/v1/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`[NeuralService] Enrollment failed for ${rollno}:`, data.detail || data);
        return { success: false, error: data.detail || "Enrollment rejected" };
      }

      console.log(`[NeuralService] Successfully enrolled ${rollno} in 512D FAISS vector index.`);
      return { success: true, data };
    } catch (err) {
      console.warn(`[NeuralService] Could not reach Neural Engine for student ${rollno}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Removes a student embedding vector from the FAISS index.
   */
  async removeStudent(studentId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/remove/${studentId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      console.warn(`[NeuralService] Could not remove student vector ${studentId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Direct 1:N face identification from an image snapshot.
   */
  async identifyFaces({ imageUrl, imageBase64, branch, section, year }) {
    try {
      const payload = {
        image_url: imageUrl || null,
        image_base64: imageBase64 || null,
        filter_branch: branch || null,
        filter_section: section || null,
        filter_year: year ? Number(year) : null
      };

      const response = await fetch(`${this.baseUrl}/api/v1/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: errData.detail || "Identification failed" };
      }

      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Registers a lecture slot with the APScheduler Automation Module (Patent Claim 1c, 3).
   */
  async registerScheduleSlot({ slotId, subject, branch, year, section, startTime, endTime, minOffsetMin, maxOffsetMin, minPresenceDurationMin, room, runRelativeSeconds }) {
    try {
      const payload = {
        slot_id: String(slotId),
        subject: String(subject),
        branch: String(branch),
        year: Number(year),
        section: String(section),
        start_time: startTime || "09:00",
        end_time: endTime || "10:00",
        min_offset_min: minOffsetMin || 10,
        max_offset_min: maxOffsetMin || 25,
        min_presence_duration_min: minPresenceDurationMin || 15,
        room: room || "ROOM_101",
        run_relative_seconds: runRelativeSeconds || null
      };

      const response = await fetch(`${this.baseUrl}/api/v1/schedule/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      console.warn("[NeuralService] Failed to register lecture schedule with APScheduler:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves all scheduled lecture slots and their randomized trigger states.
   */
  async getScheduledSlots() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/schedule/slots`);
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Forces an immediate randomized capture trigger execution.
   */
  async triggerSlotCapture(slotId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/schedule/trigger/${slotId}`, {
        method: "POST"
      });
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves real-time student dwell times and presence duration breakdown (Patent Claim 1d, 4).
   */
  async getSessionPresence(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/audit/session/${sessionId}/presence`);
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Forces adaptive reactivation of camera recognition for new entrants (Patent Claim 1d).
   */
  async reactivateSession(sessionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/audit/session/${sessionId}/reactivate`, {
        method: "POST"
      });
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves deferred consolidated neural attendance for institutional portal checkbox auto-ticking (Patent Claim 1e, 6).
   */
  async getConsolidatedAttendance({ branch, year, section, subject, sessionId }) {
    try {
      const params = new URLSearchParams();
      if (branch) params.append("branch", branch);
      if (year) params.append("year", String(year));
      if (section) params.append("section", section);
      if (subject) params.append("subject", subject);
      if (sessionId) params.append("session_id", sessionId);

      const response = await fetch(`${this.baseUrl}/api/v1/audit/consolidated?${params.toString()}`);
      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export const neuralService = new NeuralService();
export default neuralService;


