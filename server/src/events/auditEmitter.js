const EventEmitter = require('events');
const AuditLog = require('../models/AuditLog');

class AuditEmitter extends EventEmitter {
  constructor() {
    super();
    this.recentEvents = []; // In-memory buffer for real-time terminal feed
    this.maxBufferSize = 50;

    // Internal listener to persist audit logs to MongoDB
    this.on('audit', async (eventData) => {
      try {
        const logEntry = new AuditLog({
          action: eventData.action,
          actorId: eventData.actorId || null,
          actorEmail: eventData.actorEmail || 'system@titan.internal',
          targetId: eventData.targetId || null,
          details: eventData.details || {},
          severity: eventData.severity || 'info',
          ip: eventData.ip || '127.0.0.1',
          userAgent: eventData.userAgent || 'Titan Core Engine',
        });

        await logEntry.save();

        const enriched = {
          _id: logEntry._id,
          ...eventData,
          createdAt: logEntry.createdAt,
        };

        // Maintain in-memory circular buffer
        this.recentEvents.unshift(enriched);
        if (this.recentEvents.length > this.maxBufferSize) {
          this.recentEvents.pop();
        }

        // Broadcast to live SSE stream listeners
        this.emit('broadcast', enriched);
      } catch (err) {
        console.error('[AuditEmitter] Failed to persist audit log:', err.message);
      }
    });
  }

  /**
   * Log an audit action
   * @param {Object} payload 
   */
  log(payload) {
    this.emit('audit', payload);
  }

  /**
   * Get recent audit events for instant terminal bootstrap
   */
  getRecentEvents() {
    return this.recentEvents;
  }
}

const auditEmitter = new AuditEmitter();
module.exports = auditEmitter;

