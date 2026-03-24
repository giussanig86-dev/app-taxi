/**
 * CRITTOGRAFIA AES-256-GCM
 * Per campi sensibili (P.IVA, Codice Fiscale, token API)
 */

const crypto = require('crypto');
const { ENCRYPTION_KEY } = require('./env');

const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  if (!text) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) return encryptedData;

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
