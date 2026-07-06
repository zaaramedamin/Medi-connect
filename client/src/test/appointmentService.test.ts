import { describe, it, expect } from 'vitest';

// Pure utility — import directly from server service for reference validation
// These are duplicated here to test client-facing expectations
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

describe('formatTime', () => {
  it('formats ISO time to human-readable time', () => {
    const result = formatTime('2025-12-01T09:30:00');
    expect(result).toMatch(/9:30\s*AM/i);
  });
});

describe('formatDate', () => {
  it('formats ISO date to human-readable date', () => {
    const result = formatDate('2025-12-01T09:00:00');
    expect(result).toContain('Dec');
    expect(result).toContain('2025');
  });
});
