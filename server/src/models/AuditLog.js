/**
 * AUDIT LOG MODEL
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'view', 'approve', 'reject', 'login', 'logout'],
    required: true,
    index: true
  },

  resource: {
    type: String,
    enum: ['users', 'corrispettivi', 'fatture_attive', 'costi', 'versamenti', 'chilometri'],
    required: true,
    index: true
  },

  resourceId: mongoose.Schema.Types.ObjectId,

  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  ip: String,
  userAgent: String,
  note: String
}, {
  timestamps: true
});

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, resource: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 anno TTL

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
