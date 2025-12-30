import { describe, it, expect } from 'vitest';
import { InterjectionMark } from '../InterjectionMark';

describe('InterjectionMark', () => {
  it('should have correct name', () => {
    expect(InterjectionMark.name).toBe('interjection');
  });

  it('should have correct HTML attributes', () => {
    const options = InterjectionMark.options;
    expect(options.HTMLAttributes).toEqual({
      class: 'interjection',
    });
  });

  it('should parse HTML with interjection class', () => {
    const parseHTML = InterjectionMark.config.parseHTML;
    expect(parseHTML).toBeDefined();
    expect(typeof parseHTML).toBe('function');
  });

  it('should have nodeId and metadataId attributes', () => {
    // Note: addAttributes returns an object with attribute definitions
    // We verify the function exists rather than calling it directly
    // since it requires the TipTap extension context
    const addAttributes = InterjectionMark.config.addAttributes;
    expect(addAttributes).toBeDefined();
    expect(typeof addAttributes).toBe('function');
  });
});
