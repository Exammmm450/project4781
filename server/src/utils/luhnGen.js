/**
 * Luhn Algorithm Generator & Validator
 * Conforms to ISO/IEC 7812 for payment card numbers
 */

/**
 * Validates a card number against Luhn algorithm (MOD 10)
 * @param {string} cardNumber 
 * @returns {boolean}
 */
function isValidLuhn(cardNumber) {
  if (!cardNumber) return false;
  const sanitized = String(cardNumber).replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Calculates check digit for a 15-digit prefix using Luhn algorithm
 * @param {string} prefix15 
 * @returns {number}
 */
function calculateLuhnCheckDigit(prefix15) {
  let sum = 0;
  // For calculating check digit at position 16, every odd index from left (1-based: 1st, 3rd, 5th...)
  // which corresponds to even index 0, 2, 4... will be multiplied by 2 when computing check digit
  for (let i = 0; i < prefix15.length; i++) {
    let digit = parseInt(prefix15.charAt(i), 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Generates a valid 16-digit card number with Luhn checksum
 * @param {'VISA'|'MASTERCARD'} brand 
 * @returns {string} 16-digit string
 */
function generateCardNumber(brand = 'VISA') {
  let prefix;
  if (brand.toUpperCase() === 'MASTERCARD') {
    // Mastercard starts with 51-55
    const secondDigit = Math.floor(Math.random() * 5) + 1; // 1 to 5
    prefix = `5${secondDigit}`;
  } else {
    // Visa starts with 4
    prefix = '4';
  }

  // Generate random digits up to 15 digits total
  let number = prefix;
  while (number.length < 15) {
    number += Math.floor(Math.random() * 10).toString();
  }

  const checkDigit = calculateLuhnCheckDigit(number);
  const fullNumber = number + checkDigit.toString();

  // Self-verification assertion
  if (!isValidLuhn(fullNumber)) {
    throw new Error('Luhn generation integrity check failed');
  }

  return fullNumber;
}

/**
 * Generates full virtual card attributes (number, CVV, expiry, masked)
 * @param {'VISA'|'MASTERCARD'} brand 
 * @returns {Object}
 */
function generateVirtualCardPayload(brand = 'VISA') {
  const cardNumber = generateCardNumber(brand);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const expiryMonth = String(currentMonth).padStart(2, '0');
  
  // Expiry is strictly 3 years from now
  const expiryYear = String((now.getFullYear() + 3) % 100).padStart(2, '0');
  const fullExpiryYear = now.getFullYear() + 3;

  // 3-digit CVV
  const cvv = String(Math.floor(100 + Math.random() * 900));

  const maskedNumber = `${cardNumber.slice(0, 4)} •••• •••• ${cardNumber.slice(12)}`;

  return {
    cardNumber,
    maskedNumber,
    cvv,
    expiryMonth,
    expiryYear,
    fullExpiryYear,
    brand: brand.toUpperCase() === 'MASTERCARD' ? 'MASTERCARD' : 'VISA',
  };
}

module.exports = {
  isValidLuhn,
  generateCardNumber,
  generateVirtualCardPayload,
};

