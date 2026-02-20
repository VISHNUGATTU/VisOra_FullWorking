import Log from '../models/Log.js';

/**
 * @param {string} actionType - E.g., 'UPDATE_PROFILE', 'ADD_STUDENT'
 * @param {string} title - Short summary of the action
 * @param {string} message - Detailed description
 * @param {Object} actor - { userId, role, name, ipAddress }
 * @param {Object} metadata - Any extra data (old values, IDs, etc.)
 * @param {string} status - 'Success', 'Failed', or 'Warning'
 */
export const logAction = async ({ 
  actionType, 
  title, 
  message, 
  actor, 
  metadata = {}, 
  status = 'Success' 
}) => {
  try {
    await Log.create({
      actionType: actionType.toUpperCase(),
      title,
      message,
      actor: {
        userId: actor?.userId,
        role: actor?.role || 'System',
        name: actor?.name || 'System',
        ipAddress: actor?.ipAddress || ''
      },
      metadata,
      status
    });
  } catch (error) {
    console.error("Logger Error:", error.message);
  }
};