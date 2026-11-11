const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', cardController.getCards);
router.post('/issue', cardController.issueCard);
router.patch('/:id/freeze', cardController.toggleFreezeCard);
router.patch('/:id/limit', cardController.updateCardLimit);
router.get('/:id/details', cardController.getCardDetails);

module.exports = router;
