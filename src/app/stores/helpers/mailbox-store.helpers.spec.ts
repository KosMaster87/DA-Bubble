import { describe, expect, it, vi } from 'vitest';
import {
  isMissingIndexError,
  isPermissionDeniedError,
  logMissingIndexError,
  mapMailboxMessage,
  toDate,
} from './mailbox-store.helpers';

describe('mailbox-store.helpers', () => {
  it('toDate returns current date fallback for null and undefined', () => {
    const fromNull = toDate(null);
    const fromUndefined = toDate(undefined);

    expect(fromNull).toBeInstanceOf(Date);
    expect(fromUndefined).toBeInstanceOf(Date);
  });

  it('toDate returns current date for Date input (normalized behavior)', () => {
    const input = new Date('2026-01-01T00:00:00.000Z');
    const result = toDate(input);

    expect(result).toBeInstanceOf(Date);
  });

  it('mapMailboxMessage maps all required fields and keeps defaults', () => {
    const fakeDoc = {
      id: 'msg-1',
      data: () => ({
        recipientId: 'u1',
        authorId: 'u2',
        subject: 'Hello',
        content: 'World',
        isRead: true,
        type: 'admin',
        createdAt: null,
        updatedAt: null,
        reactions: [{ emoji: ':+1:', count: 1, users: ['u1'] }],
        attachments: [{ type: 'file', url: 'https://x.test/a.txt' }],
      }),
    } as never;

    const result = mapMailboxMessage(fakeDoc);

    expect(result).toMatchObject({
      id: 'msg-1',
      recipientId: 'u1',
      authorId: 'u2',
      subject: 'Hello',
      content: 'World',
      isRead: true,
      type: 'admin',
    });
    expect(result.reactions).toHaveLength(1);
    expect(result.attachments).toHaveLength(1);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('mapMailboxMessage applies safe defaults for optional fields', () => {
    const fakeDoc = {
      id: 'msg-2',
      data: () => ({
        recipientId: 'u1',
        authorId: 'u2',
        subject: 'S',
        content: 'C',
      }),
    } as never;

    const result = mapMailboxMessage(fakeDoc);

    expect(result.isRead).toBe(false);
    expect(result.type).toBe('user');
    expect(result.reactions).toEqual([]);
    expect(result.attachments).toEqual([]);
  });

  it('isPermissionDeniedError detects permission-denied errors via shared helper alias', () => {
    expect(isPermissionDeniedError({ code: 'permission-denied' })).toBe(true);
    expect(isPermissionDeniedError({ code: 'other' })).toBe(false);
  });

  it('isMissingIndexError detects Firebase missing index links', () => {
    expect(
      isMissingIndexError({ code: 'failed-precondition', message: 'The query requires an index.' }),
    ).toBe(true);
    expect(isMissingIndexError({ message: 'Random error' })).toBe(false);
  });

  it('logMissingIndexError prints index guidance messages', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logMissingIndexError({ message: 'https://console.firebase.google.com/project/indexes' });

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('❌ FIREBASE INDEX FEHLT!');
    expect(errorSpy).toHaveBeenCalledWith('https://console.firebase.google.com/project/indexes');

    errorSpy.mockRestore();
  });
});
