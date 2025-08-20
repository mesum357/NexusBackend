/**
 * Utility functions for generating and managing Agent IDs
 */

/**
 * Generate a unique Agent ID based on entity type and timestamp
 * @param {string} entityType - The type of entity (shop, product, institute, hospital)
 * @param {string} prefix - Optional prefix for the Agent ID
 * @returns {string} A unique Agent ID
 */
function generateAgentId(entityType, prefix = '') {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Map entity types to short codes
  const entityCodes = {
    'shop': 'SHP',
    'product': 'PRD',
    'marketplace': 'PRD', // Products in marketplace
    'institute': 'INS',
    'hospital': 'HSP'
  };
  
  const entityCode = entityCodes[entityType.toLowerCase()] || 'ENT';
  const basePrefix = prefix || entityCode;
  
  // Format: PREFIX_TIMESTAMP_RANDOM (e.g., SHP_1703123456789_A1B2C3)
  return `${basePrefix}_${timestamp}_${randomSuffix}`;
}

/**
 * Generate a unique Agent ID for a shop
 * @param {string} shopName - The name of the shop
 * @returns {string} A unique Agent ID for the shop
 */
function generateShopAgentId(shopName) {
  // Create a prefix from shop name (first 3 letters, uppercase)
  const prefix = shopName ? shopName.substring(0, 3).toUpperCase() : 'SHP';
  return generateAgentId('shop', prefix);
}

/**
 * Generate a unique Agent ID for a product
 * @param {string} productTitle - The title of the product
 * @returns {string} A unique Agent ID for the product
 */
function generateProductAgentId(productTitle) {
  // Create a prefix from product title (first 3 letters, uppercase)
  const prefix = productTitle ? productTitle.substring(0, 3).toUpperCase() : 'PRD';
  return generateAgentId('product', prefix);
}

/**
 * Generate a unique Agent ID for an institute
 * @param {string} instituteName - The name of the institute
 * @returns {string} A unique Agent ID for the institute
 */
function generateInstituteAgentId(instituteName) {
  // Create a prefix from institute name (first 3 letters, uppercase)
  const prefix = instituteName ? instituteName.substring(0, 3).toUpperCase() : 'INS';
  return generateAgentId('institute', prefix);
}

/**
 * Generate a unique Agent ID for a hospital
 * @param {string} hospitalName - The name of the hospital
 * @returns {string} A unique Agent ID for the hospital
 */
function generateHospitalAgentId(hospitalName) {
  // Create a prefix from hospital name (first 3 letters, uppercase)
  const prefix = hospitalName ? hospitalName.substring(0, 3).toUpperCase() : 'HSP';
  return generateAgentId('hospital', prefix);
}

/**
 * Validate if an Agent ID format is correct
 * @param {string} agentId - The Agent ID to validate
 * @returns {boolean} True if the format is valid, false otherwise
 */
function validateAgentIdFormat(agentId) {
  if (!agentId || typeof agentId !== 'string') return false;
  
  // Expected format: PREFIX_TIMESTAMP_RANDOM
  const pattern = /^[A-Z]{2,4}_\d{13}_[A-Z0-9]{6}$/;
  return pattern.test(agentId);
}

/**
 * Extract information from an Agent ID
 * @param {string} agentId - The Agent ID to parse
 * @returns {object|null} Object with prefix, timestamp, and random suffix, or null if invalid
 */
function parseAgentId(agentId) {
  if (!validateAgentIdFormat(agentId)) return null;
  
  const parts = agentId.split('_');
  if (parts.length !== 3) return null;
  
  const [prefix, timestamp, randomSuffix] = parts;
  const date = new Date(parseInt(timestamp));
  
  return {
    prefix,
    timestamp: parseInt(timestamp),
    date,
    randomSuffix,
    entityType: getEntityTypeFromPrefix(prefix)
  };
}

/**
 * Get entity type from Agent ID prefix
 * @param {string} prefix - The prefix of the Agent ID
 * @returns {string} The entity type
 */
function getEntityTypeFromPrefix(prefix) {
  const prefixMap = {
    'SHP': 'shop',
    'PRD': 'product',
    'INS': 'institute',
    'HSP': 'hospital'
  };
  
  return prefixMap[prefix] || 'unknown';
}

module.exports = {
  generateAgentId,
  generateShopAgentId,
  generateProductAgentId,
  generateInstituteAgentId,
  generateHospitalAgentId,
  validateAgentIdFormat,
  parseAgentId,
  getEntityTypeFromPrefix
};
