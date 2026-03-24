/**
 * SERVIZIO AUDIT LOG
 */

const AuditLog = require('../models/AuditLog');

const logAction = async ({
  userId,
  action,
  resource,
  resourceId,
  changes = {},
  performedBy,
  ip,
  userAgent,
  note
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      changes,
      performedBy: performedBy || userId,
      ip,
      userAgent,
      note
    });
  } catch (err) {
    // Non bloccare l'operazione principale se il log fallisce
    console.error('Errore audit log:', err.message);
  }
};

module.exports = { logAction };
