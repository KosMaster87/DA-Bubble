import { describe, expect, it } from 'vitest';
import { MailboxMessage } from '../mailbox/mailbox.store';
import {
  countUnreadMessages,
  filterByReadStatus,
  filterByType,
  findMessageById,
  getUnreadMessages,
} from './mailbox-state.helpers';

const makeMsg = (
  id: string,
  isRead: boolean,
  type: MailboxMessage['type'] = 'user',
): MailboxMessage => ({
  id,
  isRead,
  type,
  recipientId: 'r',
  authorId: 'a',
  subject: '',
  content: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  reactions: [],
  attachments: [],
});

describe('filterByReadStatus', () => {
  it('returns only read messages when isRead is true', () => {
    const msgs = [makeMsg('1', true), makeMsg('2', false)];
    expect(filterByReadStatus(msgs, true).map((m) => m.id)).toEqual(['1']);
  });

  it('returns only unread messages when isRead is false', () => {
    const msgs = [makeMsg('1', true), makeMsg('2', false)];
    expect(filterByReadStatus(msgs, false).map((m) => m.id)).toEqual(['2']);
  });
});

describe('filterByType', () => {
  it('returns only messages of the given type', () => {
    const msgs = [makeMsg('1', false, 'user'), makeMsg('2', false, 'admin')];
    expect(filterByType(msgs, 'admin').map((m) => m.id)).toEqual(['2']);
  });
});

describe('countUnreadMessages', () => {
  it('counts only unread messages', () => {
    const msgs = [makeMsg('1', true), makeMsg('2', false), makeMsg('3', false)];
    expect(countUnreadMessages(msgs)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countUnreadMessages([])).toBe(0);
  });
});

describe('findMessageById', () => {
  it('returns the matching message', () => {
    const msgs = [makeMsg('1', false), makeMsg('2', false)];
    expect(findMessageById(msgs, '2')?.id).toBe('2');
  });

  it('returns undefined when not found', () => {
    expect(findMessageById([], 'z')).toBeUndefined();
  });
});

describe('getUnreadMessages', () => {
  it('returns all unread messages', () => {
    const msgs = [makeMsg('1', true), makeMsg('2', false)];
    expect(getUnreadMessages(msgs).length).toBe(1);
    expect(getUnreadMessages(msgs)[0].id).toBe('2');
  });
});
