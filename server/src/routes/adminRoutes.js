const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Enforce authentication & admin clearance
router.use(auth);
router.use(roleGuard(['admin']));

// 1. Financial Overview & Liquidity Pulse
router.get('/pulse', adminController.getLiquidityPulse);

// 2. Account Control & Risk Management (Bank Users & Accounts Directory)
router.get('/users', adminController.getUsers);
router.get('/users/:userId/details', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.toggleUserStatus);
router.patch('/users/:userId/limits', adminController.adjustLimits);
router.patch('/users/:userId/balance', adminController.adjustBalance);
router.post('/users/:userId/force-reset-session', adminController.forceResetSession);

// 3. Fraud & Flagged Transactions Monitor
router.get('/flagged', adminController.getFlaggedTransactions);
router.post('/flagged/:reference/review', adminController.reviewTransaction);

// 4. Security Audit Stream
router.get('/audit', adminController.getAuditLogs);
router.get('/audit/stream', adminController.streamAuditEvents);

module.exports = router;
