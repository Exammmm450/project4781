const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    receiverAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    receiverName: {
      type: String,
      required: true,
    },
    receiverIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Transaction amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    category: {
      type: String,
      enum: ['Transfers', 'Restaurants', 'Subscriptions', 'Investments', 'Treasury', 'Utilities', 'Shopping'],
      default: 'Transfers',
      index: true,
    },
    type: {
      type: String,
      enum: ['p2p_transfer', 'card_payment', 'deposit', 'withdrawal', 'fee'],
      default: 'p2p_transfer',
    },
    status: {
      type: String,
      enum: ['completed', 'pending_review', 'rejected', 'refunded'],
      default: 'completed',
      index: true,
    },
    flaggedForFraud: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudReason: {
      type: String,
      default: null,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    receiptOriginalName: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.statics.generateReference = function () {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TXN-${timestamp}-${randomStr}`;
};

module.exports = mongoose.model('Transaction', transactionSchema);

