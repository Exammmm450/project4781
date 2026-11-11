const User = require('../models/User');
const Account = require('../models/Account');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const auditEmitter = require('../events/auditEmitter');
const { success, paginated } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/error');

/**
 * 1. Financial Overview & Liquidity Pulse
 */
const getLiquidityPulse = async (req, res, next) => {
  try {
    // Total deposits across all platform accounts
    const accountStats = await Account.aggregate([
      {
        $group: {
          _id: null,
          totalLiquidity: { $sum: '$balance' },
          totalSavings: { $sum: '$savingsBalance' },
          totalAccounts: { $sum: 1 },
          activeAccounts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
    ]);

    const totalLiquidity = (accountStats[0]?.totalLiquidity || 0) + (accountStats[0]?.totalSavings || 0);
    const totalAccounts = accountStats[0]?.totalAccounts || 0;

    // 24h transfer volume
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const volumeStats = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: past24h },
          status: { $in: ['completed', 'pending_review'] },
        },
      },
      {
        $group: {
          _id: null,
          volume24h: { $sum: '$amount' },
          count24h: { $sum: 1 },
        },
      },
    ]);

    const volume24h = volumeStats[0]?.volume24h || 0;
    const count24h = volumeStats[0]?.count24h || 0;

    // Count pending fraud review items
    const pendingFraudCount = await Transaction.countDocuments({
      status: 'pending_review',
    });

    // Total Users
    const totalUsers = await User.countDocuments();
    const suspendedUsers = await User.countDocuments({ status: { $in: ['suspended', 'frozen'] } });

    // Hourly flow for past 24 hours for Ops velocity chart
    const hourlyAggregation = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: past24h },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          volume: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const hourlyVelocity = hourlyAggregation.map((h) => ({
      hour: `${h._id.toString().padStart(2, '0')}:00`,
      volume: h.volume,
      transactions: h.transactions,
    }));

    return success(
      res,
      {
        totalLiquidity,
        volume24h,
        count24h,
        pendingFraudCount,
        totalAccounts,
        totalUsers,
        suspendedUsers,
        reserveCoverageRatio: '142.8%',
        settlementSpeedAvg: '48ms',
        hourlyVelocity,
      },
      'Liquidity pulse calculated'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Account Control & Risk Management - List Clients
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', role = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');

      // Also look up account IDs matching accountNumber or IBAN
      const matchingAccounts = await Account.find({
        $or: [{ accountNumber: regex }, { iban: regex }],
      }).select('userId');
      const accountUserIds = matchingAccounts.map((a) => a.userId);

      filter.$or = [
        { fullName: regex },
        { email: regex },
        { _id: { $in: accountUserIds } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Attach user accounts for liquidity inspection
    const userIds = users.map((u) => u._id);
    const accounts = await Account.find({ userId: { $in: userIds } });
    const accountMap = {};
    accounts.forEach((acc) => {
      accountMap[acc.userId.toString()] = acc;
    });

    const enrichedUsers = users.map((u) => {
      const acc = accountMap[u._id.toString()];
      return {
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        tier: u.tier,
        dailyLimit: u.dailyLimit,
        tokenVersion: u.tokenVersion,
        createdAt: u.createdAt,
        account: acc
          ? {
              accountNumber: acc.accountNumber,
              iban: acc.iban,
              balance: acc.balance,
              savingsBalance: acc.savingsBalance || 0,
              currency: acc.currency,
              status: acc.status,
            }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return paginated(
      res,
      enrichedUsers,
      {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      'Client registry retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle User Status (Active / Frozen / Suspended)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'frozen'].includes(status)) {
      throw ApiError.badRequest('Invalid status. Allowed: active, suspended, frozen');
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw ApiError.notFound('Target user not found');
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;

    // If suspending or freezing, force session reset
    if (status !== 'active') {
      targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    }

    await targetUser.save();

    // Also update associated accounts
    await Account.updateMany(
      { userId: targetUser._id },
      { status: status === 'active' ? 'active' : 'frozen' }
    );

    auditEmitter.log({
      action: status === 'active' ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: targetUser._id.toString(),
      severity: status === 'active' ? 'info' : 'critical',
      details: {
        targetEmail: targetUser.email,
        oldStatus,
        newStatus: status,
      },
    });

    return success(res, targetUser, `User status updated to '${status}'`);
  } catch (err) {
    next(err);
  }
};

/**
 * Adjust User Limits & Tier
 */
const adjustLimits = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { dailyLimit, tier } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (dailyLimit !== undefined) {
      user.dailyLimit = Math.max(0, parseFloat(dailyLimit));
    }

    if (tier && ['standard', 'premium', 'institutional'].includes(tier)) {
      user.tier = tier;
      await Account.updateMany({ userId: user._id }, { tier });
    }

    await user.save();

    auditEmitter.log({
      action: 'LIMIT_ADJUSTED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: user._id.toString(),
      severity: 'info',
      details: {
        dailyLimit: user.dailyLimit,
        tier: user.tier,
      },
    });

    return success(res, user, 'Client limits and tier updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Adjust Client Balance (Deposit / Credit or Debit)
 */
const adjustBalance = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, type = 'credit', reason = 'Manual Admin Balance Adjustment' } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw ApiError.badRequest('Adjustment amount must be a positive number');
    }

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const account = await Account.findOne({ userId });
    if (!account) throw ApiError.notFound('User bank account not found');

    if (type === 'debit' && account.balance < numAmount) {
      throw ApiError.badRequest(`Cannot debit more than account balance ($${account.balance.toLocaleString()})`);
    }

    const delta = type === 'credit' ? numAmount : -numAmount;
    account.balance += delta;
    await account.save();

    // Create tracking transaction
    const reference = Transaction.generateReference();
    await Transaction.create({
      reference,
      senderId: type === 'credit' ? req.user._id : user._id,
      senderAccountId: account._id,
      senderName: type === 'credit' ? 'Titan Central Treasury' : user.fullName,
      receiverId: type === 'credit' ? user._id : req.user._id,
      receiverAccountId: account._id,
      receiverName: type === 'credit' ? user.fullName : 'Titan Central Treasury',
      receiverIdentifier: account.accountNumber,
      amount: numAmount,
      currency: account.currency,
      category: 'Treasury',
      type: type === 'credit' ? 'deposit' : 'withdrawal',
      status: 'completed',
      note: `Ops HQ Adjustment: ${reason}`,
    });

    auditEmitter.log({
      action: 'BALANCE_ADJUSTED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: user._id.toString(),
      severity: 'critical',
      details: {
        targetUser: user.email,
        type,
        amount: numAmount,
        newBalance: account.balance,
        reason,
      },
    });

    return success(
      res,
      { account, newBalance: account.balance },
      `Account successfully ${type === 'credit' ? 'credited' : 'debited'} with $${numAmount.toLocaleString()} USD`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get Comprehensive User Details (Cards, Recent Txns, Account)
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const account = await Account.findOne({ userId });
    const cards = await Card.find({ userId }).select('+cvv +cardNumber');
    const recentTransactions = await Transaction.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return success(
      res,
      {
        user,
        account,
        cards,
        recentTransactions,
      },
      'User details retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Force Session Reset / Token Revocation in 1-Click
 */
const forceResetSession = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    auditEmitter.log({
      action: 'SESSION_FORCE_RESET',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: user._id.toString(),
      severity: 'warning',
      details: {
        targetEmail: user.email,
        newTokenVersion: user.tokenVersion,
      },
    });

    return success(
      res,
      { tokenVersion: user.tokenVersion },
      `Active sessions for ${user.email} have been revoked immediately`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Fraud & Flagged Transactions Monitor
 */
const getFlaggedTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      $or: [{ flaggedForFraud: true }, { status: 'pending_review' }],
    };

    if (status) {
      filter.status = status;
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
      },
      'Flagged risk transactions retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Review Flagged Transaction: Approve, Reject, or Refund
 */
const reviewTransaction = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const { decision, reason = '' } = req.body;

    if (!['approve', 'reject', 'refund'].includes(decision)) {
      throw ApiError.badRequest("Decision must be 'approve', 'reject', or 'refund'");
    }

    const txn = await Transaction.findOne({ reference });
    if (!txn) {
      throw ApiError.notFound('Transaction not found');
    }

    const senderAccount = await Account.findById(txn.senderAccountId);
    let receiverAccount = txn.receiverAccountId
      ? await Account.findById(txn.receiverAccountId)
      : null;

    if (decision === 'approve') {
      if (txn.status !== 'pending_review') {
        throw ApiError.badRequest(`Cannot approve transaction with status '${txn.status}'`);
      }

      if (receiverAccount) {
        await Account.findByIdAndUpdate(receiverAccount._id, { $inc: { balance: txn.amount } });
      }

      txn.status = 'completed';
      txn.flaggedForFraud = false;
      txn.metadata = { ...txn.metadata, opsApprovedBy: req.user.email, approvedAt: new Date(), opsNote: reason };
      await txn.save();

      auditEmitter.log({
        action: 'TRANSACTION_APPROVED',
        actorId: req.user._id,
        actorEmail: req.user.email,
        targetId: txn.reference,
        severity: 'info',
        details: { amount: txn.amount, decision, opsNote: reason },
      });

      return success(res, txn, 'Transaction approved by Ops HQ. Funds cleared.');
    }

    if (decision === 'reject') {
      if (txn.status !== 'pending_review') {
        throw ApiError.badRequest(`Cannot reject transaction with status '${txn.status}'`);
      }

      // Refund sender escrowed balance
      if (senderAccount) {
        await Account.findByIdAndUpdate(senderAccount._id, { $inc: { balance: txn.amount } });
      }

      txn.status = 'rejected';
      txn.metadata = { ...txn.metadata, opsRejectedBy: req.user.email, rejectedAt: new Date(), opsNote: reason };
      await txn.save();

      auditEmitter.log({
        action: 'TRANSACTION_REJECTED',
        actorId: req.user._id,
        actorEmail: req.user.email,
        targetId: txn.reference,
        severity: 'critical',
        details: { amount: txn.amount, decision, opsNote: reason },
      });

      return success(res, txn, 'Transaction rejected. Escrow balance restored to sender.');
    }

    if (decision === 'refund') {
      if (txn.status !== 'completed') {
        throw ApiError.badRequest(`Only completed transactions can be refunded`);
      }

      if (senderAccount) {
        await Account.findByIdAndUpdate(senderAccount._id, { $inc: { balance: txn.amount } });
      }

      if (receiverAccount && receiverAccount.balance >= txn.amount) {
        await Account.findByIdAndUpdate(receiverAccount._id, { $inc: { balance: -txn.amount } });
      }

      txn.status = 'refunded';
      txn.metadata = { ...txn.metadata, opsRefundedBy: req.user.email, refundedAt: new Date(), opsNote: reason };
      await txn.save();

      auditEmitter.log({
        action: 'TRANSACTION_REFUNDED',
        actorId: req.user._id,
        actorEmail: req.user.email,
        targetId: txn.reference,
        severity: 'warning',
        details: { amount: txn.amount, decision, opsNote: reason },
      });

      return success(res, txn, 'Transaction successfully refunded.');
    }
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Security Audit Stream History
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, severity = '', action = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (severity) filter.severity = severity;
    if (action) filter.action = action;

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return paginated(
      res,
      logs,
      {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
      'Security audit logs retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Live Security Audit Stream (SSE - Server Sent Events)
 */
const streamAuditEvents = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');

  const recent = auditEmitter.getRecentEvents();
  if (recent.length > 0) {
    res.write(`data: ${JSON.stringify({ type: 'BACKFILL', events: recent })}\n\n`);
  }

  const onBroadcast = (event) => {
    res.write(`data: ${JSON.stringify({ type: 'EVENT', event })}\n\n`);
  };

  auditEmitter.on('broadcast', onBroadcast);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    auditEmitter.removeListener('broadcast', onBroadcast);
    res.end();
  });
};

module.exports = {
  getLiquidityPulse,
  getUsers,
  toggleUserStatus,
  adjustLimits,
  adjustBalance,
  getUserDetails,
  forceResetSession,
  getFlaggedTransactions,
  reviewTransaction,
  getAuditLogs,
  streamAuditEvents,
};
