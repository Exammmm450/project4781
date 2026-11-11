const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorEmail: {
      type: String,
      default: 'system@titan.internal',
    },
    targetId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    ip: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'Internal Node Engine',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);

