import { describe, expect, test } from 'vitest'
import { hours, initials, money, percent, timeAgo } from './format'

describe('format helpers', () => {
  const now = new Date('2026-10-20T12:00:00Z').getTime()

  test('timeAgo', () => {
    expect(timeAgo('2026-10-20T11:59:50Z', now)).toBe('just now')
    expect(timeAgo('2026-10-20T11:55:00Z', now)).toBe('5m ago')
    expect(timeAgo('2026-10-20T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-10-17T12:00:00Z', now)).toBe('3d ago')
  })

  test('money, percent and hours', () => {
    expect(money(0)).toBe('-')
    expect(money(12500)).toBe('₪12,500')
    expect(percent(0.456)).toBe('46%')
    expect(percent(null)).toBe('-')
    expect(hours(0.5)).toBe('30 min')
    expect(hours(5.25)).toBe('5.3 h')
    expect(hours(72)).toBe('3.0 days')
  })

  test('initials', () => {
    expect(initials('Noa Levi')).toBe('NL')
    expect(initials('maya')).toBe('M')
    expect(initials('')).toBe('?')
  })
})
