const User = require('../models/User');
const Account = require('../models/Account');
const Card = require('../models/Card');
const env = require('../config/env');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
} = require('../utils/tokens');
const { generateVirtualCardPayload } = require('../utils/luhnGen');
const { success, error } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/error');
const auditEmitter = require('../events/auditEmitter');

/**
 * Register New Account
 * Supports Stealth Admin Escalation via secretKey
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, secretKey } = req.body;

    if (!fullName || !email || !password) {
      throw ApiError.badRequest('Full name, email, and password are required');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Stealth Admin Escalation Logic
    let role = 'user';
    let isEscalated = false;
    if (secretKey && secretKey === env.adminSecretKey) {
      role = 'admin';
      isEscalated = true;
    }

    // Create user
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role,
      tier: role === 'admin' ? 'institutional' : 'premium',
      dailyLimit: role === 'admin' ? 1000000 : 50000,
    });

    // Generate primary USD account
    const initialBalance = role === 'admin' ? 1000000 : 25000;
    const account = await Account.create({
      userId: user._id,
      accountNumber: Account.generateAccountNumber(),
      iban: Account.generateIBAN(),
      currency: 'USD',
      balance: initialBalance,
      tier: user.tier,
    });

    // Auto-issue first virtual card
    const cardData = generateVirtualCardPayload('VISA');
    const card = await Card.create({
      userId: user._id,
      accountId: account._id,
      cardNumber: cardData.cardNumber,
      maskedNumber: cardData.maskedNumber,
      cardHolder: user.fullName.toUpperCase(),
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      cvv: cardData.cvv,
      brand: cardData.brand,
      colorTheme: role === 'admin' ? 'obsidian-gold' : 'quantum-violet',
      monthlyLimit: role === 'admin' ? 100000 : 15000,
    });

    // Generate dual JWTs
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set secure HttpOnly cookie for Refresh Token (strictly 1 hour expiry)
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    // Audit Log
    auditEmitter.log({
      action: isEscalated ? 'ROLE_ESCALATED' : 'AUTH_REGISTER',
      actorId: user._id,
      actorEmail: user.email,
      targetId: user._id.toString(),
      severity: isEscalated ? 'critical' : 'info',
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Browser',
      details: {
        role: user.role,
        isEscalated,
        accountNumber: account.accountNumber,
        initialBalance,
      },
    });

    return success(
      res,
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          tier: user.tier,
          status: user.status,
          dailyLimit: user.dailyLimit,
        },
        account,
        card,
        accessToken,
      },
      isEscalated
        ? 'Omega Admin clearance granted. Welcome to Command HQ.'
        : 'Welcome to Titan NeoBank. Account initialized successfully.',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Login
 * Supports Stealth Admin Escalation if secretKey provided on login
 */
const login = async (req, res, next) => {
  try {
    const { email, password, secretKey } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account is suspended. Contact Compliance.');
    }

    // Stealth Admin Escalation upon login
    let isEscalated = false;
    if (secretKey && secretKey === env.adminSecretKey && user.role !== 'admin') {
      user.role = 'admin';
      user.tier = 'institutional';
      user.dailyLimit = 1000000;
      await user.save();
      isEscalated = true;

      auditEmitter.log({
        action: 'ROLE_ESCALATED',
        actorId: user._id,
        actorEmail: user.email,
        targetId: user._id.toString(),
        severity: 'critical',
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Web Browser',
        details: { note: 'Role escalated to admin via stealth key on login' },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set 1-hour secure cookie
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    // Fetch primary account
    const account = await Account.findOne({ userId: user._id });

    auditEmitter.log({
      action: 'AUTH_LOGIN',
      actorId: user._id,
      actorEmail: user.email,
      targetId: user._id.toString(),
      severity: 'info',
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Browser',
      details: { role: user.role },
    });

    return success(
      res,
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          tier: user.tier,
          status: user.status,
          dailyLimit: user.dailyLimit,
        },
        account,
        accessToken,
      },
      'Authentication successful'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh Access Token
 * Strictly checks 1-hour maxAge cookie and token version
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw ApiError.unauthorized('Refresh token missing from secure cookie session');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return next(ApiError.unauthorized('Session expired. Please log in again.'));
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('Account is suspended');
    }

    // Check tokenVersion revocation
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      throw ApiError.unauthorized('Session has been revoked by Administrator');
    }

    // Issue refreshed pair
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

    return success(res, { accessToken: newAccessToken }, 'Token refreshed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Logout
 */
const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', getRefreshCookieOptions());
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Get Current User Profile with accounts and cards
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const account = await Account.findOne({ userId: user._id });
    const cards = await Card.find({ userId: user._id })
      .select('+cvv +cardNumber')
      .sort({ createdAt: -1 });

    return success(
      res,
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          tier: user.tier,
          status: user.status,
          dailyLimit: user.dailyLimit,
          createdAt: user.createdAt,
        },
        account,
        cards,
      },
      'User profile retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};

