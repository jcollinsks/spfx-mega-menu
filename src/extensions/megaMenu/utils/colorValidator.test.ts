import { isValidColor, sanitizeColor } from './colorValidator';

describe('isValidColor', () => {
  describe('should accept valid hex colors', () => {
    it('should accept 3-digit hex', () => {
      expect(isValidColor('#FFF')).toBe(true);
      expect(isValidColor('#abc')).toBe(true);
      expect(isValidColor('#000')).toBe(true);
    });

    it('should accept 6-digit hex', () => {
      expect(isValidColor('#FFF3CD')).toBe(true);
      expect(isValidColor('#856404')).toBe(true);
      expect(isValidColor('#0078d4')).toBe(true);
      expect(isValidColor('#000000')).toBe(true);
      expect(isValidColor('#ffffff')).toBe(true);
    });

    it('should accept 8-digit hex (with alpha)', () => {
      expect(isValidColor('#FFF3CD80')).toBe(true);
      expect(isValidColor('#00000000')).toBe(true);
    });
  });

  describe('should accept named colors', () => {
    it('should accept common named colors', () => {
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('blue')).toBe(true);
      expect(isValidColor('transparent')).toBe(true);
      expect(isValidColor('white')).toBe(true);
      expect(isValidColor('black')).toBe(true);
    });

    it('should be case-insensitive for named colors', () => {
      expect(isValidColor('RED')).toBe(true);
      expect(isValidColor('Blue')).toBe(true);
      expect(isValidColor('TRANSPARENT')).toBe(true);
    });
  });

  describe('should reject invalid values', () => {
    it('should reject CSS injection attempts', () => {
      expect(isValidColor('red; background-image: url(evil.com)')).toBe(false);
      expect(isValidColor('#FFF; position: absolute')).toBe(false);
      expect(isValidColor('expression(alert(1))')).toBe(false);
    });

    it('should reject url() values', () => {
      expect(isValidColor("url('https://evil.com/exfil')")).toBe(false);
    });

    it('should reject rgb/rgba/hsl functional notation', () => {
      // These could potentially be abused; only allow hex and named
      expect(isValidColor('rgb(255, 0, 0)')).toBe(false);
      expect(isValidColor('rgba(0,0,0,0.5)')).toBe(false);
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(false);
    });

    it('should reject malformed hex values', () => {
      expect(isValidColor('#GGG')).toBe(false);
      expect(isValidColor('#12345')).toBe(false);
      expect(isValidColor('#1')).toBe(false);
      expect(isValidColor('FFF')).toBe(false);
      expect(isValidColor('##FFF')).toBe(false);
    });

    it('should reject empty and whitespace-only strings', () => {
      expect(isValidColor('')).toBe(false);
      expect(isValidColor('   ')).toBe(false);
    });

    it('should reject non-string values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidColor(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidColor(undefined as any)).toBe(false);
    });

    it('should reject unknown named colors that are not in the allowlist', () => {
      expect(isValidColor('rebeccapurple')).toBe(false);
      expect(isValidColor('aliceblue')).toBe(false);
    });
  });
});

describe('sanitizeColor', () => {
  it('should return valid colors unchanged', () => {
    expect(sanitizeColor('#FFF3CD', '#000')).toBe('#FFF3CD');
    expect(sanitizeColor('red', '#000')).toBe('red');
  });

  it('should return fallback for invalid colors', () => {
    expect(sanitizeColor('not-a-color', '#FFF3CD')).toBe('#FFF3CD');
    expect(sanitizeColor('', '#856404')).toBe('#856404');
  });

  it('should trim whitespace from valid colors', () => {
    expect(sanitizeColor('  #FFF  ', '#000')).toBe('#FFF');
  });
});
