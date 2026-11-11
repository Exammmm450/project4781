const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    cardNumber: {
      type: String,
      required: true,
      unique: true,
    },
    maskedNumber: {
      type: String,
      required: true,
    },
    cardHolder: {
      type: String,
      required: true,
      trim: true,
    },
    expiryMonth: {
      type: String,
      required: true,
    },
    expiryYear: {
      type: String,
      required: true,
    },
    cvv: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      enum: ['VISA', 'MASTERCARD'],
      default: 'VISA',
    },
    type: {
      type: String,
      enum: ['virtual', 'physical'],
      default: 'virtual',
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'cancelled'],
      default: 'active',
      index: true,
    },
    monthlyLimit: {
      type: Number,
      default: 15000,
    },
    spentThisMonth: {
      type: Number,
      default: 0,
    },
    colorTheme: {
      type: String,
      default: 'quantum-violet', // 'quantum-violet', 'cyber-cyan', 'neon-emerald', 'obsidian-gold'
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Card', cardSchema);

