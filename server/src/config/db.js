const mongoose = require('mongoose');
const env = require('./env');
const { generateVirtualCardPayload } = require('../utils/luhnGen');

let memoryServer = null;

/**
 * Seed initial sample platform data if DB is empty
 */
async function seedInitialData() {
  const User = require('../models/User');
  const Account = require('../models/Account');
  const Card = require('../models/Card');
  const Transaction = require('../models/Transaction');
  const AuditLog = require('../models/AuditLog');

  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('[Database] Empty database detected. Seeding flagship demo records...');

  // 1. Create Super Admin
  const adminUser = await User.create({
    fullName: 'Alexander Vance (Ops Commander)',
    email: 'admin@titan.internal',
    password: 'AdminPass123!',
    role: 'admin',
    tier: 'institutional',
    status: 'active',
    dailyLimit: 10000000,
  });

  const adminAccount = await Account.create({
    userId: adminUser._id,
    accountNumber: 'ACC-0001-9999',
    iban: 'US89NEOB0001999900019999',
    currency: 'USD',
    balance: 2450000.00,
    tier: 'institutional',
    status: 'active',
  });

  const adminCardData = generateVirtualCardPayload('MASTERCARD');
  await Card.create({
    userId: adminUser._id,
    accountId: adminAccount._id,
    cardNumber: adminCardData.cardNumber,
    maskedNumber: adminCardData.maskedNumber,
    cardHolder: 'ALEXANDER VANCE',
    expiryMonth: adminCardData.expiryMonth,
    expiryYear: adminCardData.expiryYear,
    cvv: adminCardData.cvv,
    brand: 'MASTERCARD',
    colorTheme: 'obsidian-gold',
    monthlyLimit: 250000,
  });

  // 2. Create Regular Flagship User
  const standardUser = await User.create({
    fullName: 'Elena Rostova',
    email: 'elena.rostova@quantum.io',
    password: 'UserPass123!',
    role: 'user',
    tier: 'premium',
    status: 'active',
    dailyLimit: 75000,
  });

  const standardAccount = await Account.create({
    userId: standardUser._id,
    accountNumber: 'ACC-8492-3104',
    iban: 'US89NEOB8492310484923104',
    currency: 'USD',
    balance: 84250.00,
    tier: 'premium',
    status: 'active',
  });

  const userCardData = generateVirtualCardPayload('VISA');
  await Card.create({
    userId: standardUser._id,
    accountId: standardAccount._id,
    cardNumber: userCardData.cardNumber,
    maskedNumber: userCardData.maskedNumber,
    cardHolder: 'ELENA ROSTOVA',
    expiryMonth: userCardData.expiryMonth,
    expiryYear: userCardData.expiryYear,
    cvv: userCardData.cvv,
    brand: 'VISA',
    colorTheme: 'quantum-violet',
    monthlyLimit: 30000,
    spentThisMonth: 3450,
  });

  // 3. Create Additional Mock Counterparty
  const merchantUser = await User.create({
    fullName: 'Satoshi Capital Partners',
    email: 'treasury@satoshicapital.com',
    password: 'PartnerPass123!',
    role: 'user',
    tier: 'institutional',
    status: 'active',
    dailyLimit: 500000,
  });

  const merchantAccount = await Account.create({
    userId: merchantUser._id,
    accountNumber: 'ACC-7721-0012',
    iban: 'US89NEOB7721001277210012',
    currency: 'USD',
    balance: 512000.00,
    tier: 'institutional',
    status: 'active',
  });

  // 4. Seed Representative Transactions
  const demoTransactions = [
    {
      reference: 'TXN-ALPHA-01',
      senderId: adminUser._id,
      senderAccountId: adminAccount._id,
      senderName: adminUser.fullName,
      receiverId: standardUser._id,
      receiverAccountId: standardAccount._id,
      receiverName: standardUser.fullName,
      receiverIdentifier: standardAccount.accountNumber,
      amount: 15000.00,
      currency: 'USD',
      category: 'Investments',
      type: 'p2p_transfer',
      status: 'completed',
      flaggedForFraud: false,
      note: 'Q4 Institutional Yield Dividend',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      reference: 'TXN-BETA-02',
      senderId: standardUser._id,
      senderAccountId: standardAccount._id,
      senderName: standardUser.fullName,
      receiverId: null,
      receiverAccountId: null,
      receiverName: 'Le Bernardin Michelin Dining',
      receiverIdentifier: 'POS-LEBERNARDIN-NY',
      amount: 485.50,
      currency: 'USD',
      category: 'Restaurants',
      type: 'card_payment',
      status: 'completed',
      flaggedForFraud: false,
      note: 'Executive Dinner',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      reference: 'TXN-GAMMA-03',
      senderId: standardUser._id,
      senderAccountId: standardAccount._id,
      senderName: standardUser.fullName,
      receiverId: null,
      receiverAccountId: null,
      receiverName: 'Bloomberg Professional Terminal',
      receiverIdentifier: 'SUB-BLOOMBERG-LP',
      amount: 2200.00,
      currency: 'USD',
      category: 'Subscriptions',
      type: 'card_payment',
      status: 'completed',
      flaggedForFraud: false,
      note: 'Monthly Market Data License',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      reference: 'TXN-DELTA-04',
      senderId: standardUser._id,
      senderAccountId: standardAccount._id,
      senderName: standardUser.fullName,
      receiverId: merchantUser._id,
      receiverAccountId: merchantAccount._id,
      receiverName: merchantUser.fullName,
      receiverIdentifier: merchantAccount.accountNumber,
      amount: 12500.00,
      currency: 'USD',
      category: 'Treasury',
      type: 'p2p_transfer',
      status: 'pending_review',
      flaggedForFraud: true,
      fraudReason: 'Automated Compliance: Transfer amount ($12,500) exceeds platform high-value threshold ($10,000)',
      note: 'Off-market Liquidity Allocation',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  ];

  await Transaction.insertMany(demoTransactions);

  // 5. Seed Initial Audit Logs
  await AuditLog.create([
    {
      action: 'AUTH_REGISTER',
      actorId: adminUser._id,
      actorEmail: adminUser.email,
      targetId: adminUser._id.toString(),
      severity: 'critical',
      details: { role: 'admin', clearance: 'OMEGA' },
    },
    {
      action: 'ROLE_ESCALATED',
      actorId: adminUser._id,
      actorEmail: adminUser.email,
      targetId: adminUser._id.toString(),
      severity: 'critical',
      details: { note: 'Stealth master key invoked during initialization' },
    },
    {
      action: 'TRANSACTION_FLAGGED',
      actorId: standardUser._id,
      actorEmail: standardUser.email,
      targetId: 'TXN-DELTA-04',
      severity: 'warning',
      details: { amount: 12500.00, reason: 'Exceeds $10,000 threshold' },
    },
  ]);

  console.log('[Database] Flagship demo environment seeded successfully.');
  console.log('  -> Admin Login: admin@titan.internal / AdminPass123!');
  console.log('  -> User Login:  elena.rostova@quantum.io / UserPass123!');
  console.log('  -> Stealth Master Key: bankadmin6453');
}

/**
 * Connect to MongoDB with automatic In-Memory fallback
 */
const connectDB = async () => {
  try {
    // Attempt standard connection first with 8s timeout for Atlas cloud clusters
    console.log(`[Database] Attempting connection to MongoDB: ${env.mongoUri}`);
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[Database] Connected to external MongoDB cluster at ${env.mongoUri}`);
    await seedInitialData();
  } catch (err) {
    console.warn(`[Database] External MongoDB unavailable (${err.message}). Initializing embedded high-performance MongoDB instance...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'neobank_db',
          launchTimeout: 60000, // 60 seconds for Windows process spinup
        },
      });

      const uri = memoryServer.getUri();
      await mongoose.connect(uri);
      console.log(`[Database] Embedded in-memory MongoDB operational at ${uri}`);
      await seedInitialData();
    } catch (memErr) {
      console.error('[Database] Fatal: Failed to initialize in-memory database:', memErr);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
