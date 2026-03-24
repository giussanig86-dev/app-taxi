/**
 * SDI SYNC LOG MODEL
 */

const mongoose = require('mongoose');

const sdiSyncLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  syncStartedAt: { type: Date, required: true, index: true },
  syncCompletedAt: Date,

  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress',
    index: true
  },

  fattureScaricare: Number,
  fattureImportate: Number,
  fattureDuplicate: Number,
  fattureErrori: Number,

  syncErrors: [{
    identificativoSdi: String,
    errorMessage: String,
    timestamp: Date
  }],

  apiCallsDuration: Number,
  parsingDuration: Number
}, {
  timestamps: true
});

sdiSyncLogSchema.index({ userId: 1, syncStartedAt: -1 });

const SdiSyncLog = mongoose.model('SdiSyncLog', sdiSyncLogSchema);

module.exports = SdiSyncLog;
