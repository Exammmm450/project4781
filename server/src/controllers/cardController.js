const Card = require('../models/Card');
const Account = require('../models/Account');
const { generateVirtualCardPayload } = require('../utils/luhnGen');
const { success } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/error');
const auditEmitter = require('../events/auditEmitter');

/**
 * List Cards for current user with full credentials explicitly included
 */
const getCards = async (req, res, next) => {
  try {
    const cards = await Card.find({ userId: req.user._id })
      .select('+cvv +cardNumber')
      .sort({ createdAt: -1 });
    return success(res, cards, 'Cards retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Issue new Virtual Card with Luhn Algorithm
 */
const issueCard = async (req, res, next) => {
  try {
    const { brand = 'VISA', colorTheme = 'obsidian-black', monthlyLimit = 15000 } = req.body;

    const account = await Account.findOne({ userId: req.user._id, status: 'active' });
    if (!account) {
      throw ApiError.badRequest('No active bank account found to attach virtual card to');
    }

    const payload = generateVirtualCardPayload(brand);

    const card = await Card.create({
      userId: req.user._id,
      accountId: account._id,
      cardNumber: payload.cardNumber,
      maskedNumber: payload.maskedNumber,
      cardHolder: req.user.fullName.toUpperCase(),
      expiryMonth: payload.expiryMonth,
      expiryYear: payload.expiryYear,
      cvv: payload.cvv,
      brand: payload.brand,
      colorTheme: colorTheme === 'titanium-white' ? 'titanium-white' : 'obsidian-black',
      monthlyLimit: Number(monthlyLimit) || 15000,
    });

    auditEmitter.log({
      action: 'CARD_ISSUED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: card._id.toString(),
      severity: 'info',
      details: {
        brand: card.brand,
        maskedNumber: card.maskedNumber,
        theme: card.colorTheme,
      },
    });

    return success(res, card, 'Virtual card issued successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 1-Click Freeze / Unfreeze Card
 */
const toggleFreezeCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findOne({ _id: id, userId: req.user._id }).select('+cvv +cardNumber');
    if (!card) {
      throw ApiError.notFound('Card not found or access denied');
    }

    const nextStatus = card.status === 'active' ? 'frozen' : 'active';
    card.status = nextStatus;
    await card.save();

    auditEmitter.log({
      action: nextStatus === 'frozen' ? 'CARD_FROZEN' : 'CARD_UNFROZEN',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: card._id.toString(),
      severity: 'warning',
      details: {
        cardId: card._id,
        maskedNumber: card.maskedNumber,
        newStatus: nextStatus,
      },
    });

    return success(
      res,
      card,
      `Card successfully ${nextStatus === 'frozen' ? 'frozen (locked)' : 'unfrozen (active)'}`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Update Monthly Spending Limit on Card
 */
const updateCardLimit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { monthlyLimit } = req.body;
    const limit = parseFloat(monthlyLimit);

    if (isNaN(limit) || limit < 100) {
      throw ApiError.badRequest('Monthly limit must be at least $100');
    }

    const card = await Card.findOne({ _id: id, userId: req.user._id }).select('+cvv +cardNumber');
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    const oldLimit = card.monthlyLimit;
    card.monthlyLimit = limit;
    await card.save();

    auditEmitter.log({
      action: 'CARD_LIMIT_UPDATED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: card._id.toString(),
      severity: 'info',
      details: { oldLimit, newLimit: limit },
    });

    return success(res, card, `Card monthly spending limit updated to $${limit.toLocaleString()}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Unmask Card Details (CVV + Full Number) with Audit Trail
 */
const getCardDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await Card.findOne({ _id: id, userId: req.user._id }).select('+cvv +cardNumber');
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    auditEmitter.log({
      action: 'CARD_DETAILS_VIEWED',
      actorId: req.user._id,
      actorEmail: req.user.email,
      targetId: card._id.toString(),
      severity: 'info',
      details: {
        maskedNumber: card.maskedNumber,
      },
    });

    return success(res, card, 'Card credentials decrypted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCards,
  issueCard,
  toggleFreezeCard,
  updateCardLimit,
  getCardDetails,
};
