const EventEmitter = require('events');
const auditEmitter = require('./auditEmitter');
const env = require('../config/env');

class FraudEmitter extends EventEmitter {
  constructor() {
    super();

    this.on('fraud_detected', (payload) => {
      console.warn(`[FRAUD ALERT] Txn ${payload.reference} flagged! Reason: ${payload.reason}`);

      auditEmitter.log({
        action: 'TRANSACTION_FLAGGED',
        actorId: payload.senderId,
        actorEmail: payload.senderEmail || 'unknown@user.com',
        targetId: payload.reference,
        severity: 'critical',
        details: {
          amount: payload.amount,
          receiver: payload.receiverIdentifier,
          reason: payload.reason,
        },
      });
    });
  }

  /**
   * Risk engine evaluating a transfer request
   * @param {Object} txnData 
   * @returns {{ isFlagged: boolean, reason: string|null }}
   */
  evaluateTransaction(txnData) {
    const { amount } = txnData;

    // Rule 1: High-value transaction threshold
    if (amount >= env.highValueThreshold) {
      const reason = `Automated Compliance: Transfer amount ($${amount.toLocaleString()}) exceeds platform high-value threshold ($${env.highValueThreshold.toLocaleString()})`;
      this.emit('fraud_detected', { ...txnData, reason });
      return { isFlagged: true, reason };
    }

    return { isFlagged: false, reason: null };
  }
}

const fraudEmitter = new FraudEmitter();
module.exports = fraudEmitter;

