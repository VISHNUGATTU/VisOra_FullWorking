import Notification from '../models/Notification.js';

/* ===============================================================
   1. CREATE NOTIFICATION (Enforces Sender/Recipient Rules)
=============================================================== */
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, recipient } = req.body;

    if (!title || !message || !recipient?.role || !recipient?.userIds) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const { userIds, role: targetRole } = recipient;
    const isBroadcast = userIds.includes('BROADCAST');

    // --- IDENTIFY SENDER ---
    let senderRole, senderName;
    if (req.faculty) {
      senderRole = 'Faculty';
      senderName = req.faculty.name;
    } else if (req.student) { 
      senderRole = 'Student';
      senderName = req.student.name;
    } else {
      senderRole = 'Admin';
      senderName = 'Administrator';
    }

    const senderData = {
      id: req.userId,
      role: senderRole,
      name: senderName
    };

    // --- ENFORCE STRICT COMMUNICATION RULES ---
    if (senderRole === 'Admin') {
      // Admin cannot send to an individual student
      if (targetRole === 'Student' && !isBroadcast) {
        return res.status(403).json({ success: false, message: "Admins can only send broadcast notifications to all students." });
      }
    } else if (senderRole === 'Faculty') {
      // Faculty cannot send to other faculty
      if (targetRole === 'Faculty') {
         return res.status(403).json({ success: false, message: "Faculty cannot send notifications to other faculty members." });
      }
      // Faculty can only send broadcasts/general messages to Admin
      if (targetRole === 'Admin' && !isBroadcast) {
         return res.status(403).json({ success: false, message: "Faculty can only send general notifications to the Admin." });
      }
    } else if (senderRole === 'Student') {
      // Students can ONLY message specific faculty
      if (targetRole !== 'Faculty' || isBroadcast) {
        return res.status(403).json({ success: false, message: "Students can only send notifications to specific faculty members." });
      }
    }

    // --- CREATE NOTIFICATION(S) ---
    // CASE 1: Broadcast
    if (isBroadcast) {
      const broadcast = await Notification.create({
        title, message, type: type || 'Info', sender: senderData, recipient: { role: targetRole, userId: 'BROADCAST' }
      });
      return res.status(201).json({ success: true, data: broadcast });
    }

    // CASE 2: Multiple/Single Specific Users
    const notifications = userIds.map(id => ({
      title, message, type: type || 'Info', sender: senderData, recipient: { role: targetRole, userId: id }
    }));

    await Notification.insertMany(notifications);
    res.status(201).json({ success: true, message: `Alerts sent successfully to ${notifications.length} recipients.` });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================================================
   2. GET HISTORY (Sender's View - The "Sent" Tab)
=============================================================== */
export const getNotificationHistory = async (req, res) => {
  try {
    let query = {};
    
    // Dynamically filter "Sent" messages based on who is asking
    if (req.faculty) {
      query = { 'sender.id': req.userId, 'sender.role': 'Faculty' };
    } else if (req.student) {
      query = { 'sender.id': req.userId, 'sender.role': 'Student' };
    } else {
      query = { 'sender.role': 'Admin' }; 
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    const formattedHistory = notifications.map(notif => ({
      _id: notif._id,
      when: notif.createdAt,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      byWhom: { name: notif.sender?.name || "System Admin", role: notif.sender?.role || "Admin" },
      senderId: notif.sender?.id, 
      toWhom: { role: notif.recipient?.role, userId: notif.recipient?.userId },
      status: notif.isRead ? 'Read' : 'Unread'
    }));

    return res.status(200).json({ success: true, data: formattedHistory });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================================================
   3. GET USER NOTIFICATIONS (Recipient's View - Inbox)
=============================================================== */
const getUserNotifications = async (req, res, role) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const notifications = await Notification.find({
      'recipient.role': role,
      $or: [
        { 'recipient.userId': userId },
        { 'recipient.userId': 'BROADCAST' }
      ]
    }).sort({ createdAt: -1 });

    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, unread: unreadCount, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminNotifications = (req, res) => getUserNotifications(req, res, 'Admin');
export const getFacultyNotifications = (req, res) => getUserNotifications(req, res, 'Faculty');
export const getStudentNotifications = (req, res) => getUserNotifications(req, res, 'Student');

/* ===============================================================
   4. MARK AS READ (Updated to save correctly to DB)
=============================================================== */
export const markAsRead = async (req, res) => {
  try {
    // ✅ FIX: Use $or so users can mark direct messages AND broadcasts as read
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [
          { 'recipient.userId': req.userId },
          { 'recipient.userId': 'BROADCAST' },
          { 'recipient.role': 'Admin' } // Allows Admin to read generic admin alerts
        ]
      },
      { 
        $set: { isRead: true, readAt: new Date() } // ✅ Explicitly tells MongoDB to update this property
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found or unauthorized to read." });
    }
    
    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllReadByRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ success: false, message: "Role required" });

    // ✅ FIX: Allow updating broadcasts and direct messages to true in DB
    await Notification.updateMany(
      {
        'recipient.role': role,
        $or: [
          { 'recipient.userId': req.userId },
          { 'recipient.userId': 'BROADCAST' }
        ],
        isRead: false
      },
      { 
        $set: { isRead: true, readAt: new Date() } 
      }
    );

    return res.status(200).json({ success: true, message: `All ${role} notifications marked as read.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================================================
   5. DELETE NOTIFICATION (Strict Owner Only)
=============================================================== */
export const deleteNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || req.body.userId;
    const role = req.query.role || req.body.role; // Admin can delete anything

    if (!userId) return res.status(400).json({ success: false, message: "User ID is required." });

    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });

    // Admins can bypass this check, otherwise only the sender can delete
    if (role !== 'admin' && notification.sender?.id?.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Access Denied: You can only delete notifications you created." });
    }

    await Notification.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};