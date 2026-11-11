const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const auth = require('../middleware/auth');
const uploadReceipt = require('../middleware/multer');

router.use(auth);

// P2P Transfer with optional receipt attachment
router.post('/', uploadReceipt.single('receipt'), transferController.executeTransfer);

// Savings Vault Pocket Endpoints
router.get('/vault', transferController.getVaultInfo);
router.post('/vault/deposit', transferController.depositToVault);
router.post('/vault/withdraw', transferController.withdrawFromVault);

// Analytics and Insights
router.get('/analytics', transferController.getAnalytics);

// History & Search
router.get('/', transferController.getTransactions);

// Receipt Download / Payload
router.get('/:reference/receipt', transferController.downloadReceipt);

module.exports = router;
