import { describe, it, expect } from 'vitest';
import en from '../../i18n/en.json';
import de from '../../i18n/de.json';

/**
 * Recursively collect all keys from a nested object, returning dot-separated paths.
 */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Recursively collect all string values from a nested object.
 */
function collectValues(obj: Record<string, unknown>, prefix = ''): { key: string; value: unknown }[] {
  const entries: { key: string; value: unknown }[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      entries.push(...collectValues(value as Record<string, unknown>, fullKey));
    } else {
      entries.push({ key: fullKey, value });
    }
  }
  return entries;
}

describe('i18n translation files', () => {
  it('en.json should parse correctly (is a non-empty object)', () => {
    expect(typeof en).toBe('object');
    expect(en).not.toBeNull();
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  it('de.json should parse correctly (is a non-empty object)', () => {
    expect(typeof de).toBe('object');
    expect(de).not.toBeNull();
    expect(Object.keys(de).length).toBeGreaterThan(0);
  });

  it('both files should have the same top-level keys', () => {
    const enKeys = Object.keys(en).sort();
    const deKeys = Object.keys(de).sort();
    expect(enKeys).toEqual(deKeys);
  });

  it('both files should have the same nested keys (deep structure match)', () => {
    const enKeys = collectKeys(en as Record<string, unknown>).sort();
    const deKeys = collectKeys(de as Record<string, unknown>).sort();
    expect(enKeys).toEqual(deKeys);
  });

  it('en.json should have no empty string values', () => {
    const values = collectValues(en as Record<string, unknown>);
    const emptyKeys = values.filter((e) => typeof e.value === 'string' && e.value.trim() === '');
    expect(emptyKeys).toEqual([]);
  });

  it('de.json should have no empty string values', () => {
    const values = collectValues(de as Record<string, unknown>);
    const emptyKeys = values.filter((e) => typeof e.value === 'string' && e.value.trim() === '');
    expect(emptyKeys).toEqual([]);
  });

  it('both files should have the same number of translation keys', () => {
    const enKeys = collectKeys(en as Record<string, unknown>);
    const deKeys = collectKeys(de as Record<string, unknown>);
    expect(enKeys.length).toBe(deKeys.length);
  });

  it('should identify any keys present in en but missing in de', () => {
    const enKeys = new Set(collectKeys(en as Record<string, unknown>));
    const deKeys = new Set(collectKeys(de as Record<string, unknown>));
    const missingInDe = [...enKeys].filter((k) => !deKeys.has(k));
    expect(missingInDe).toEqual([]);
  });

  it('should identify any keys present in de but missing in en', () => {
    const enKeys = new Set(collectKeys(en as Record<string, unknown>));
    const deKeys = new Set(collectKeys(de as Record<string, unknown>));
    const missingInEn = [...deKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });
});
