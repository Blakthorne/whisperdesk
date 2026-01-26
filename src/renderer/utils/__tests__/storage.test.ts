import { describe, it, expect, vi } from 'vitest';
import { logger } from '../../services/logger';
import {
  getStorageItem,
  setStorageItem,
  getStorageString,
  setStorageString,
  removeStorageItem,
} from '../storage';
import type { StorageKey } from '../storage';
import { useLocalStorageCleanup } from '@/test/testHelpers';

describe('storage', () => {
  useLocalStorageCleanup();

  describe('getStorageItem', () => {
    it('should return default value when item not in storage', () => {
      const defaultValue = { theme: 'light' };
      const result = getStorageItem('whispersermons_theme' as StorageKey, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should retrieve and parse stored JSON item', () => {
      const value = { theme: 'dark', fontSize: 14 };
      localStorage.setItem('whispersermons_theme', JSON.stringify(value));

      const result = getStorageItem('whispersermons_theme' as StorageKey, {});

      expect(result).toEqual(value);
    });

    it('should return default value if JSON is invalid', () => {
      const defaultValue = { theme: 'light' };
      localStorage.setItem('whispersermons_theme', 'invalid json');

      const result = getStorageItem('whispersermons_theme' as StorageKey, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should handle different data types', () => {
      const stringValue = 'test string';
      localStorage.setItem('whispersermons_theme', JSON.stringify(stringValue));

      const result = getStorageItem('whispersermons_theme' as StorageKey, 'default');

      expect(result).toBe(stringValue);
    });
  });

  describe('setStorageItem', () => {
    it('should store JSON serializable values', () => {
      const value = { model: 'base', language: 'en' };
      const success = setStorageItem('whispersermons_lastModel' as StorageKey, value);

      expect(success).toBe(true);
      expect(localStorage.getItem('whispersermons_lastModel')).toBe(JSON.stringify(value));
    });

    it('should return true on successful storage', () => {
      const result = setStorageItem('whispersermons_history' as StorageKey, []);

      expect(result).toBe(true);
    });

    it('should handle arrays', () => {
      const items = [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
      ];
      const success = setStorageItem('whispersermons_history' as StorageKey, items);

      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('whispersermons_history') || '')).toEqual(items);
    });

    it('should overwrite existing items', () => {
      const value1 = { data: 'first' };
      const value2 = { data: 'second' };

      setStorageItem('whispersermons_theme' as StorageKey, value1);
      setStorageItem('whispersermons_theme' as StorageKey, value2);

      const result = getStorageItem('whispersermons_theme' as StorageKey, {});

      expect(result).toEqual(value2);
    });
  });

  describe('getStorageString', () => {
    it('should return default value when item not in storage', () => {
      const result = getStorageString('whispersermons_theme' as StorageKey, 'light');

      expect(result).toBe('light');
    });

    it('should retrieve stored string value', () => {
      localStorage.setItem('whispersermons_theme', 'dark');

      const result = getStorageString('whispersermons_theme' as StorageKey, 'light');

      expect(result).toBe('dark');
    });

    it('should return default value if localStorage fails', () => {
      const defaultValue = 'light';
      const result = getStorageString('whispersermons_theme' as StorageKey, defaultValue);

      expect(result).toBe(defaultValue);
    });
  });

  describe('setStorageString', () => {
    it('should store string values', () => {
      const value = 'dark';
      const success = setStorageString('whispersermons_theme' as StorageKey, value);

      expect(success).toBe(true);
      expect(localStorage.getItem('whispersermons_theme')).toBe(value);
    });

    it('should return true on successful storage', () => {
      const result = setStorageString('whispersermons_theme' as StorageKey, 'light');

      expect(result).toBe(true);
    });

    it('should overwrite existing strings', () => {
      setStorageString('whispersermons_theme' as StorageKey, 'light');
      setStorageString('whispersermons_theme' as StorageKey, 'dark');

      expect(localStorage.getItem('whispersermons_theme')).toBe('dark');
    });
  });

  describe('removeStorageItem', () => {
    it('should remove stored item', () => {
      localStorage.setItem('whispersermons_theme', 'dark');

      removeStorageItem('whispersermons_theme' as StorageKey);

      expect(localStorage.getItem('whispersermons_theme')).toBeNull();
    });

    it('should handle removing non-existent items', () => {
      expect(() => {
        removeStorageItem('whispersermons_theme' as StorageKey);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle localStorage.setItem failure for setStorageItem', () => {
      const originalSetItem = localStorage.setItem.bind(localStorage);

      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = setStorageItem('whispersermons_theme' as StorageKey, { data: 'test' });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();

      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage.setItem failure for setStorageString', () => {
      const originalSetItem = localStorage.setItem.bind(localStorage);

      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = setStorageString('whispersermons_theme' as StorageKey, 'test');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();

      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage.getItem failure for getStorageItem', () => {
      const originalGetItem = localStorage.getItem.bind(localStorage);

      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = getStorageItem('whispersermons_theme' as StorageKey, 'default');

      expect(result).toBe('default');

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.getItem failure for getStorageString', () => {
      const originalGetItem = localStorage.getItem.bind(localStorage);

      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = getStorageString('whispersermons_theme' as StorageKey, 'light');

      expect(result).toBe('light');

      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage.removeItem failure silently', () => {
      const originalRemoveItem = localStorage.removeItem.bind(localStorage);

      localStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(() => {
        removeStorageItem('whispersermons_theme' as StorageKey);
      }).not.toThrow();

      localStorage.removeItem = originalRemoveItem;
    });
  });
});
