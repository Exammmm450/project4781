const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    iban: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP'],
      default: 'USD',
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Account balance cannot be negative'],
    },
    savingsBalance: {
      type: Number,
      default: 0,
      min: [0, 'Savings balance cannot be negative'],
    },
    apyRate: {
      type: Number,
      default: 4.85,
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'closed'],
      default: 'active',
    },
    tier: {
      type: String,
      enum: ['standard', 'premium', 'institutional'],
      default: 'premium',
    },
  },
  {
    timestamps: true,
  }
);

// Helper static to generate account number
accountSchema.statics.generateAccountNumber = function () {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `ACC-${part1}-${part2}`;
};

accountSchema.statics.generateIBAN = function () {
  const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
  return `US89NEOB${digits}`;
};

module.exports = mongoose.model('Account', accountSchema);

