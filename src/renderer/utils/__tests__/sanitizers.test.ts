import { describe, it, expect } from 'vitest';
import { convertHtmlToText } from '../sanitizers';

describe('sanitizers', () => {
  describe('convertHtmlToText', () => {
    it('should convert basic HTML tags to text', () => {
      const html = '<p>Hello World</p>';
      const result = convertHtmlToText(html);
      expect(result).toBe('Hello World');
    });

    it('should convert headings with newlines', () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = convertHtmlToText(html);
      expect(result).toContain('Title');
      expect(result).toContain('Content');
    });

    it('should convert lists to bullet points', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = convertHtmlToText(html);
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });

    it('should convert strong tags to markdown bold', () => {
      const html = '<p>This is <strong>bold</strong> text</p>';
      const result = convertHtmlToText(html);
      expect(result).toContain('**bold**');
    });

    it('should convert em tags to markdown italic', () => {
      const html = '<p>This is <em>italic</em> text</p>';
      const result = convertHtmlToText(html);
      expect(result).toContain('_italic_');
    });

    it('should convert code tags to backticks', () => {
      const html = '<p>Use <code>console.log()</code> for debugging</p>';
      const result = convertHtmlToText(html);
      expect(result).toContain('`console.log()`');
    });

    it('should convert anchor tags with href', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = convertHtmlToText(html);
      expect(result).toBe('Link (https://example.com)');
    });

    it('should sanitize malicious script tags', () => {
      const html = '<p>Hello</p><script>alert("XSS")</script>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
      expect(result).toBe('Hello');
    });

    it('should sanitize javascript: URIs', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('javascript:');
    });

    it('should sanitize data: URIs', () => {
      const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('data:');
    });

    it('should allow safe http and https links', () => {
      const html = '<a href="https://github.com">GitHub</a>';
      const result = convertHtmlToText(html);
      expect(result).toContain('https://github.com');
    });

    it('should handle empty string', () => {
      const result = convertHtmlToText('');
      expect(result).toBe('');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
      const result = convertHtmlToText(html);
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result).toBe('string');
    });

    it('should remove excessive newlines', () => {
      const html = '<p>Line 1</p>\n\n\n<p>Line 2</p>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('\n\n\n');
    });

    it('should handle nested tags', () => {
      const html = '<p><strong><em>Bold and italic</em></strong></p>';
      const result = convertHtmlToText(html);
      expect(result).toContain('**');
      expect(result).toContain('_');
    });

    it('should strip disallowed tags', () => {
      const html = '<p>Text</p><iframe src="evil.com"></iframe>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('iframe');
      expect(result).toBe('Text');
    });

    it('should strip disallowed attributes', () => {
      const html = '<p onclick="alert(1)" style="color:red">Text</p>';
      const result = convertHtmlToText(html);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('style');
      expect(result).toContain('Text');
    });
  });
});
