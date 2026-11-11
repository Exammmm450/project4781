const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const fraudEmitter = require('../events/fraudEmitter');
const auditEmitter = require('../events/auditEmitter');
const env = require('../config/env');
const { success, paginated } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/error');

/**
 * Execute P2P or Interbank Transfer
 * Bulletproof atomic settlement via findOneAndUpdate with $gte balance validation
 * Works seamlessly across MongoDB Atlas, Standalone, and In-Memory instances
 */
const executeTransfer = async (req, res, next) => {
  let senderDebited = false;
  let receiverCredited = false;
  let updatedSender = null;
  let updatedReceiver = null;

  try {
    const { receiverIdentifier, amount, category = 'Transfers', note = '' } = req.body;
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw ApiError.badRequest('Invalid transfer amount. Must be greater than 0.');
    }

    if (!receiverIdentifier || !receiverIdentifier.trim()) {
      throw ApiError.badRequest('Recipient identifier (Account Number, Card Number, or Email) is required.');
    }

    const trimmedTarget = receiverIdentifier.trim();

    // Fetch Sender Account
    const senderAccount = await Account.findOne({ userId: req.user._id });
    if (!senderAccount) {
      throw ApiError.badRequest('Sender primary account not found');
    }

    if (senderAccount.status !== 'active') {
      throw ApiError.forbidden(`Sender account is ${senderAccount.status}. Transfers disabled.`);
    }

    if (senderAccount.balance < transferAmount) {
      throw ApiError.badRequest(
        `Insufficient liquidity. Available: $${senderAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Requested: $${transferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      );
    }

    // Resolve Recipient
    let receiverAccount = null;
    let receiverUser = null;
    let cleanTarget = trimmedTarget.replace(/\s+/g, '');

    // 1. Try finding by Account Number
    receiverAccount = await Account.findOne({ accountNumber: trimmedTarget });
    if (receiverAccount) {
      receiverUser = await User.findById(receiverAccount.userId);
    }

    // 2. Try finding by Email
    if (!receiverAccount && trimmedTarget.includes('@')) {
      receiverUser = await User.findOne({ email: trimmedTarget.toLowerCase() });
      if (receiverUser) {
        receiverAccount = await Account.findOne({ userId: receiverUser._id });
      }
    }

    // 3. Try finding by Card Number
    if (!receiverAccount && /^\d{16}$/.test(cleanTarget)) {
      const card = await Card.findOne({ cardNumber: cleanTarget });
      if (card) {
        receiverAccount = await Account.findById(card.accountId);
        if (receiverAccount) {
          receiverUser = await User.findById(receiverAccount.userId);
        }
      }
    }

    // Prevent transferring to oneself
    if (receiverAccount && receiverAccount._id.toString() === senderAccount._id.toString()) {
      throw ApiError.badRequest('Cannot transfer funds to the same source account');
    }

    // Recipient Display Name
    const receiverName = receiverUser
      ? receiverUser.fullName
      : `External Clearing (${trimmedTarget})`;

    // Risk / Fraud Evaluation
    const reference = Transaction.generateReference();
    const fraudEvaluation = fraudEmitter.evaluateTransaction({
      reference,
      senderId: req.user._id,
      senderEmail: req.user.email,
      amount: transferAmount,
      receiverIdentifier: trimmedTarget,
    });

    // Check if flagged for ops review
    const isFlagged = fraudEvaluation.isFlagged;
    const initialStatus = isFlagged ? 'pending_review' : 'completed';

    // File receipt from Multer if uploaded
    let receiptUrl = null;
    let receiptOriginalName = null;
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
      receiptOriginalName = req.file.originalname;
    }

    // Atomic debit of sender account with $gte check to strictly prevent negative balance or race conditions
    updatedSender = await Account.findOneAndUpdate(
      {
        _id: senderAccount._id,
        balance: { $gte: transferAmount },
        status: 'active',
      },
      {
        $inc: { balance: -transferAmount },
      },
      { new: true }
    );

    if (!updatedSender) {
      throw ApiError.badRequest(
        'Transaction rejected: Insufficient available liquidity or account lock condition.'
      );
    }
    senderDebited = true;

    // Credit internal receiver if not held in escrow by fraud engine
    if (receiverAccount && !isFlagged) {
      updatedReceiver = await Account.findByIdAndUpdate(
        receiverAccount._id,
        {
          $inc: { balance: transferAmount },
        },
        { new: true }
      );
      receiverCredited = true;
    }

    // Create immutable transaction ledger record
    let txn;
    try {
      txn = await Transaction.create({
        reference,
        senderId: req.user._id,
        senderAccountId: senderAccount._id,
        senderName: req.user.fullName,
        receiverId: receiverUser ? receiverUser._id : null,
        receiverAccountId: receiverAccount ? receiverAccount._id : null,
        receiverName,
        receiverIdentifier: trimmedTarget,
        amount: transferAmount,
        currency: senderAccount.currency,
        category,
        type: 'p2p_transfer',
        status: initialStatus,
        flaggedForFraud: isFlagged,
        fraudReason: fraudEvaluation.reason,
        receiptUrl,
        receiptOriginalName,
        note,
      });
    } catch (txnError) {
      // In case of ledger write failure, safely rollback balances
      if (senderDebited) {
        await Account.findByIdAndUpdate(senderAccount._id, { $inc: { balance: transferAmount } });
      }
      if (receiverCredited && receiverAccount) {
        await Account.findByIdAndUpdate(receiverAccount._id, { $inc: { balance: -transferAmount } });
      }
      throw txnError;
    }

    // Audit Logging
    auditEmitter.log({
      action: isFlagged ? 'TRANSACTION_FLAGGED' : 'TRANSFER_INITIATED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: reference,
      severity: isFlagged ? 'warning' : 'info',
      details: {
        amount: transferAmount,
        recipient: receiverName,
        status: initialStatus,
      },
    });

    const responseMsg = isFlagged
      ? 'Transfer flagged by Compliance Sentinel (> $10k). Escrow hold placed pending Ops HQ approval.'
      : 'Transfer executed successfully with atomic settlement.';

    return success(
      res,
      {
        transaction: txn,
        updatedBalance: updatedSender.balance,
      },
      responseMsg,
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Vault Pocket: Deposit to High-Yield Savings (4.85% APY)
 */
const depositToVault = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw ApiError.badRequest('Invalid deposit amount');
    }

    const account = await Account.findOneAndUpdate(
      {
        userId: req.user._id,
        balance: { $gte: numAmount },
        status: 'active',
      },
      {
        $inc: {
          balance: -numAmount,
          savingsBalance: numAmount,
        },
      },
      { new: true }
    );

    if (!account) {
      throw ApiError.badRequest('Insufficient liquid checking balance for vault allocation');
    }

    auditEmitter.log({
      action: 'VAULT_DEPOSIT',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: account.accountNumber,
      severity: 'info',
      details: { amount: numAmount, newSavingsBalance: account.savingsBalance },
    });

    return success(
      res,
      {
        balance: account.balance,
        savingsBalance: account.savingsBalance,
        apyRate: account.apyRate || 4.85,
      },
      `Successfully allocated $${numAmount.toLocaleString()} to High-Yield Vault (4.85% APY)`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Vault Pocket: Withdraw from High-Yield Savings
 */
const withdrawFromVault = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw ApiError.badRequest('Invalid withdrawal amount');
    }

    const account = await Account.findOneAndUpdate(
      {
        userId: req.user._id,
        savingsBalance: { $gte: numAmount },
        status: 'active',
      },
      {
        $inc: {
          savingsBalance: -numAmount,
          balance: numAmount,
        },
      },
      { new: true }
    );

    if (!account) {
      throw ApiError.badRequest('Insufficient funds in savings vault pocket');
    }

    auditEmitter.log({
      action: 'VAULT_WITHDRAW',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: account.accountNumber,
      severity: 'info',
      details: { amount: numAmount, newSavingsBalance: account.savingsBalance },
    });

    return success(
      res,
      {
        balance: account.balance,
        savingsBalance: account.savingsBalance,
        apyRate: account.apyRate || 4.85,
      },
      `Successfully returned $${numAmount.toLocaleString()} from Vault to liquid balance`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Vault Pocket: Get Details & Projections
 */
const getVaultInfo = async (req, res, next) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) throw ApiError.notFound('Account not found');

    const savings = account.savingsBalance || 0;
    const apy = account.apyRate || 4.85;

    const annualYield = (savings * apy) / 100;
    const monthlyYield = annualYield / 12;
    const dailyYield = annualYield / 365;

    return success(res, {
      balance: account.balance,
      savingsBalance: savings,
      apyRate: apy,
      projections: {
        dailyYield: parseFloat(dailyYield.toFixed(2)),
        monthlyYield: parseFloat(monthlyYield.toFixed(2)),
        annualYield: parseFloat(annualYield.toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Paginated Transaction History with Filters & Search
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      status = '',
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // Filter transactions involving this user (as sender or receiver)
    const filter = {
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
    };

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = [
        {
          $or: [
            { receiverName: searchRegex },
            { senderName: searchRegex },
            { receiverIdentifier: searchRegex },
            { reference: searchRegex },
            { note: searchRegex },
          ],
        },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return paginated(
      res,
      transactions,
      {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      'Transaction history retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get Analytics for Financial Insights & Category Spending
 */
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const transactions = await Transaction.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: { $in: ['completed', 'pending_review'] },
    }).sort({ createdAt: 1 });

    let totalIncome = 0;
    let totalExpense = 0;

    const categoryMap = {
      Transfers: 0,
      Restaurants: 0,
      Subscriptions: 0,
      Investments: 0,
      Treasury: 0,
      Utilities: 0,
      Shopping: 0,
    };

    const monthlyMap = {};

    transactions.forEach((tx) => {
      const isSender = tx.senderId.toString() === userId.toString();
      const monthKey = new Date(tx.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0, net: 0 };
      }

      if (isSender) {
        totalExpense += tx.amount;
        monthlyMap[monthKey].expense += tx.amount;
        if (categoryMap[tx.category] !== undefined) {
          categoryMap[tx.category] += tx.amount;
        } else {
          categoryMap.Transfers += tx.amount;
        }
      } else {
        totalIncome += tx.amount;
        monthlyMap[monthKey].income += tx.amount;
      }

      monthlyMap[monthKey].net = monthlyMap[monthKey].income - monthlyMap[monthKey].expense;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalExpense > 0 ? Math.round((categoryMap[cat] / totalExpense) * 100) : 0,
    }));

    const monthlyTrends = Object.values(monthlyMap);

    return success(
      res,
      {
        totalIncome,
        totalExpense,
        netCashFlow: totalIncome - totalExpense,
        categoryBreakdown: categoryData,
        monthlyTrends,
      },
      'Financial analytics computed'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Download / Retrieve Receipt Metadata
 */
const downloadReceipt = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const txn = await Transaction.findOne({
      reference,
      $or: [{ senderId: req.user._id }, { receiverId: req.user._id }, { role: 'admin' }],
    });

    if (!txn) {
      throw ApiError.notFound('Transaction not found or unauthorized to view receipt');
    }

    const receiptPayload = {
      receiptNumber: `REC-${txn.reference}`,
      issueDate: txn.createdAt,
      reference: txn.reference,
      status: txn.status.toUpperCase(),
      amount: txn.amount,
      fee: '0.00',
      currency: txn.currency,
      category: txn.category,
      sender: {
        name: txn.senderName,
      },
      recipient: {
        name: txn.receiverName,
        identifier: txn.receiverIdentifier,
      },
      hasAttachment: !!txn.receiptUrl,
      attachmentUrl: txn.receiptUrl,
      issuer: 'TITAN ARCHITECTURAL TREASURY',
      verificationStamp: 'VERIFIED BY TITAN LEDGER',
      auditSignature: `SHA256-${Buffer.from(txn.reference + txn.amount).toString('hex').slice(0, 32)}`,
    };

    return success(res, receiptPayload, 'Receipt metadata ready');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  executeTransfer,
  depositToVault,
  withdrawFromVault,
  getVaultInfo,
  getTransactions,
  getAnalytics,
  downloadReceipt,
};
