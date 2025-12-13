import { formatSuiAmount, parseSuiAmount, calculatePriceImpact, shortenAddress } from '../src/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatSuiAmount', () => {
    it('should format SUI amount correctly', () => {
      expect(formatSuiAmount('1000000000')).toBe('1');
      expect(formatSuiAmount('1500000000')).toBe('1.5');
      expect(formatSuiAmount('123456789')).toBe('0.123456789');
    });

    it('should handle zero', () => {
      expect(formatSuiAmount('0')).toBe('0');
    });
  });

  describe('parseSuiAmount', () => {
    it('should parse SUI amount correctly', () => {
      expect(parseSuiAmount('1')).toBe('1000000000');
      expect(parseSuiAmount('1.5')).toBe('1500000000');
      expect(parseSuiAmount('0.123456789')).toBe('123456789');
    });

    it('should handle whole numbers', () => {
      expect(parseSuiAmount('100')).toBe('100000000000');
    });
  });

  describe('shortenAddress', () => {
    it('should shorten address correctly', () => {
      const address = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(shortenAddress(address, 6)).toBe('0x1234...abcdef');
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const impact = calculatePriceImpact(
        BigInt('100000000000'),
        BigInt('1000000000000'),
        BigInt('2000000000000')
      );
      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThan(100);
    });
  });
});
