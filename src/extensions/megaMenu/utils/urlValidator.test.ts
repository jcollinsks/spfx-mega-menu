import { isValidNavigationUrl, sanitizeNavigationUrl } from './urlValidator';

describe('isValidNavigationUrl', () => {
  describe('should accept valid URLs', () => {
    it('should accept https URLs', () => {
      expect(isValidNavigationUrl('https://contoso.sharepoint.com')).toBe(true);
      expect(isValidNavigationUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('should accept http URLs', () => {
      expect(isValidNavigationUrl('http://intranet.contoso.com')).toBe(true);
    });

    it('should accept relative paths starting with /', () => {
      expect(isValidNavigationUrl('/sites/hr')).toBe(true);
      expect(isValidNavigationUrl('/pages/home.aspx')).toBe(true);
      expect(isValidNavigationUrl('/')).toBe(true);
    });

    it('should accept fragment-only links', () => {
      expect(isValidNavigationUrl('#')).toBe(true);
      expect(isValidNavigationUrl('#section')).toBe(true);
    });
  });

  describe('should reject dangerous URLs', () => {
    it('should reject javascript: protocol', () => {
      expect(isValidNavigationUrl('javascript:alert(1)')).toBe(false);
      expect(isValidNavigationUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isValidNavigationUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });

    it('should reject data: protocol', () => {
      expect(isValidNavigationUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidNavigationUrl('DATA:text/html,test')).toBe(false);
    });

    it('should reject vbscript: protocol', () => {
      expect(isValidNavigationUrl('vbscript:msgbox("xss")')).toBe(false);
    });

    it('should reject protocol-relative URLs (//)', () => {
      expect(isValidNavigationUrl('//evil.com/path')).toBe(false);
    });

    it('should reject empty and whitespace-only strings', () => {
      expect(isValidNavigationUrl('')).toBe(false);
      expect(isValidNavigationUrl('   ')).toBe(false);
    });

    it('should reject non-string values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidNavigationUrl(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidNavigationUrl(undefined as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidNavigationUrl(123 as any)).toBe(false);
    });

    it('should reject file: protocol', () => {
      expect(isValidNavigationUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject ftp: protocol', () => {
      expect(isValidNavigationUrl('ftp://files.example.com')).toBe(false);
    });
  });
});

describe('sanitizeNavigationUrl', () => {
  it('should return valid URLs unchanged', () => {
    expect(sanitizeNavigationUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeNavigationUrl('/sites/hr')).toBe('/sites/hr');
  });

  it('should return # for invalid URLs by default', () => {
    expect(sanitizeNavigationUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeNavigationUrl('')).toBe('#');
  });

  it('should return custom fallback for invalid URLs', () => {
    expect(sanitizeNavigationUrl('javascript:alert(1)', '/')).toBe('/');
  });
});
