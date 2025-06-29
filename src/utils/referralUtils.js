// Utility functions for referral system

/**
 * Generate a test referral link for development
 * @param {string} referralCode - The referral code
 * @returns {string} - Complete referral URL
 */
export const generateReferralLink = (referralCode) => {
  const baseUrl = import.meta.env.VITE_APP_DOMAIN || window.location.origin;
  return `${baseUrl}/?ref=${referralCode}`;
};

/**
 * Extract referral code from URL
 * @param {string} url - The URL to extract from
 * @returns {string|null} - The referral code or null
 */
export const extractReferralCode = (url = window.location.href) => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('ref');
};

/**
 * Validate referral code format
 * @param {string} code - The referral code to validate
 * @returns {boolean} - Whether the code is valid format
 */
export const isValidReferralCodeFormat = (code) => {
  if (!code || typeof code !== 'string') return false;
  // Should be 6-10 characters, alphanumeric
  return /^[A-Z0-9]{6,10}$/.test(code);
};

/**
 * Store referral code in localStorage for signup process
 * @param {string} code - The referral code
 */
export const storeReferralCode = (code) => {
  if (isValidReferralCodeFormat(code)) {
    localStorage.setItem('referralCode', code);
  }
};

/**
 * Get stored referral code from localStorage
 * @returns {string|null} - The stored referral code
 */
export const getStoredReferralCode = () => {
  return localStorage.getItem('referralCode');
};

/**
 * Clear stored referral code
 */
export const clearStoredReferralCode = () => {
  localStorage.removeItem('referralCode');
};

/**
 * Generate a sample referral code for testing
 * @param {string} prefix - Optional prefix
 * @returns {string} - A test referral code
 */
export const generateTestReferralCode = (prefix = 'TEST') => {
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
};

/**
 * Create a test referral URL for development
 * @returns {string} - A complete test referral URL
 */
export const createTestReferralUrl = () => {
  const testCode = generateTestReferralCode();
  return generateReferralLink(testCode);
};