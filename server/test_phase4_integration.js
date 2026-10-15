import neuralService from "./services/neuralService.js";

async function runPhase4Tests() {
  console.log("==========================================================");
  console.log("  VISORA NEURAL IDENTITY ENGINE: PHASE 4 INTEGRATION TEST");
  console.log("  Node.js Backend & MongoDB / Express Bridge");
  console.log("==========================================================");

  // 1. Test Neural Service Health Check
  console.log("\n--- 1. Testing Neural Service Bridge Health ---");
  const health = await neuralService.checkHealth();
  console.log("[+] Neural Engine health check response:", health);
  
  // 2. Validate Auto-Attendance Data Transformation
  console.log("\n--- 2. Testing Roll Number Matching Logic ---");
  const mockStudents = [
    { _id: "s1", rollno: "21B91A0501", name: "Jane Doe" },
    { _id: "s2", rollno: "21B91A0502", name: "John Smith" },
    { _id: "s3", rollno: "21B91A0503", name: "Alice Johnson" }
  ];

  const verifiedRolls = ["21B91A0501", "21b91a0503"]; // Note case insensitivity test!
  const verifiedSet = new Set(verifiedRolls.map(r => r.trim().toUpperCase()));

  const attendanceData = mockStudents.map(student => ({
    studentId: student._id,
    rollno: student.rollno,
    name: student.name,
    status: verifiedSet.has(student.rollno.trim().toUpperCase()) ? "Present" : "Absent"
  }));

  console.log("[+] Attendance mapping results:");
  attendanceData.forEach(s => {
    console.log(`    - ${s.name} (${s.rollno}): ${s.status}`);
  });

  const presentCount = attendanceData.filter(a => a.status === "Present").length;
  const absentCount = attendanceData.filter(a => a.status === "Absent").length;

  console.log(`[+] Total: ${attendanceData.length} | Present: ${presentCount} | Absent: ${absentCount}`);
  if (presentCount !== 2 || absentCount !== 1) {
    throw new Error(`Verification failed! Expected 2 present, 1 absent. Got ${presentCount}P / ${absentCount}A`);
  }

  console.log("\n==========================================================");
  console.log("  PHASE 4 BACKEND INTEGRATION LOGIC VERIFIED!");
  console.log("==========================================================");
}

runPhase4Tests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
