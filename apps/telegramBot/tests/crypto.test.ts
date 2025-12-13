import { encryptPrivateKey, decryptPrivateKey, generateConfirmCode } from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt private key', () => {
      const privateKey = 'test_private_key_12345678901234567890';
      const password = 'secure_password_123';

      const encrypted = encryptPrivateKey(privateKey, password);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');

      const decrypted = decryptPrivateKey(encrypted, password);
      expect(decrypted).toBe(privateKey);
    });

    it('should fail with wrong password', () => {
      const privateKey = 'test_private_key_12345678901234567890';
      const password = 'secure_password_123';
      const wrongPassword = 'wrong_password_123';

      const encrypted = encryptPrivateKey(privateKey, password);

      expect(() => {
        decryptPrivateKey(encrypted, wrongPassword);
      }).toThrow();
    });
  });

  describe('generateConfirmCode', () => {
    it('should generate code of specified length', () => {
      const code = generateConfirmCode(6);
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it('should generate unique codes', () => {
      const code1 = generateConfirmCode(8);
      const code2 = generateConfirmCode(8);
      expect(code1).not.toBe(code2);
    });
  });
});
