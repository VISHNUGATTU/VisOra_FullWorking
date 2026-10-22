import dotenv from "dotenv";
dotenv.config();

/**
 * VisOra Telegram Reporting Bot Service (Patent Claim 1f, Claim 6 & Claim 10g).
 * Autonomously delivers summarized attendance reports to faculty and administrators
 * immediately after session completion or upon institutional portal sync.
 */
class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    this.chatId = process.env.TELEGRAM_CHAT_ID || "";
    this.apiUrl = "https://api.telegram.org";
    this.recentDispatches = [];
  }

  /**
   * Returns current Telegram bot operational status.
   */
  getStatus() {
    const isConfigured = Boolean(
      this.botToken &&
      this.chatId &&
      !this.botToken.includes("your_telegram") &&
      !this.chatId.includes("your_telegram")
    );
    return {
      configured: isConfigured,
      mode: isConfigured ? "LIVE" : "SIMULATED",
      chatId: this.chatId ? `${this.chatId.slice(0, 4)}****` : "NOT_SET",
      dispatchesCount: this.recentDispatches.length
    };
  }

  /**
   * Dispatches a real-time attendance report to the configured Telegram chat/group.
   * Falls back to a rich simulated dispatch if token/chat is not set in development.
   */
  async sendAttendanceReport({
    subject,
    branch,
    year,
    section,
    facultyName = "Faculty Member",
    presentCount = 0,
    absentCount = 0,
    totalStudents = 0,
    absentRollNumbers = [],
    randomOffsetMin = 15,
    date = new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
    timeSlot = "Scheduled Hour"
  }) {
    const percentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : "100.0";
    const absenteesFormatted = absentRollNumbers.length > 0
      ? absentRollNumbers.slice(0, 15).join(", ") + (absentRollNumbers.length > 15 ? ` +${absentRollNumbers.length - 15} more` : "")
      : "None (100% Attendance)";

    // Format rich Markdown card matching Patent Specification Fig. 4
    const messageText = [
      "🏛️ *VISORA SMART ATTENDANCE REPORT*",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `📅 *Date:* ${date} | *Slot:* ${timeSlot}`,
      `📚 *Subject:* ${subject}`,
      `👥 *Class:* ${branch} Year ${year} - Sec ${section}`,
      `👨‍🏫 *Faculty:* ${facultyName}`,
      "",
      "📊 *Attendance Analytics:*",
      `✅ *Present:* ${presentCount} / ${totalStudents} (${percentage}%)`,
      `❌ *Absent:* ${absentCount} Students`,
      `⏱️ *Randomized Trigger:* +${randomOffsetMin}m into Lecture (Anti-Proxy)`,
      `🛡️ *Liveness Verification:* Capillary rPPG + Thermal Veto Active`,
      "",
      "⚠️ *Absentee Roll Numbers:*",
      `\`${absenteesFormatted}\``,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "🤖 _Dispatched autonomously by VisOra Neural Engine_",
      "📜 _Indian Patent App No: 202641036876_"
    ].join("\n");

    const dispatchRecord = {
      timestamp: new Date().toISOString(),
      subject,
      classCode: `${branch}-${year}${section}`,
      presentCount,
      absentCount,
      totalStudents,
      mode: this.getStatus().mode,
      delivered: true
    };

    // If real Telegram credentials are provided, send HTTP request
    if (this.getStatus().configured) {
      try {
        const url = `${this.apiUrl}/bot${this.botToken}/sendMessage`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: messageText,
            parse_mode: "Markdown"
          })
        });

        const data = await response.json();
        if (!response.ok) {
          console.warn("[TelegramService] Telegram API error:", data.description);
          dispatchRecord.delivered = false;
          dispatchRecord.error = data.description;
        } else {
          console.log(`[TelegramService] Successfully sent live Telegram report to ${this.chatId}. Message ID: ${data.result?.message_id}`);
          dispatchRecord.messageId = data.result?.message_id;
        }
      } catch (err) {
        console.error("[TelegramService] Network failure sending Telegram message:", err.message);
        dispatchRecord.delivered = false;
        dispatchRecord.error = err.message;
      }
    } else {
      // Production Simulation Mode: log formatted output cleanly
      console.log("\n=======================================================");
      console.log("  [TELEGRAM BOT NOTIFICATION DISPATCH - VisOra Patent Claim 1f/6]");
      console.log(messageText);
      console.log("=======================================================\n");
      dispatchRecord.delivered = true;
      dispatchRecord.simulated = true;
    }

    this.recentDispatches.unshift(dispatchRecord);
    if (this.recentDispatches.length > 50) this.recentDispatches.pop();

    return {
      success: dispatchRecord.delivered,
      mode: dispatchRecord.mode,
      formattedReport: messageText,
      record: dispatchRecord
    };
  }
}

export const telegramService = new TelegramService();
export default telegramService;
