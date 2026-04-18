import { Timestamp } from '@angular/fire/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMessagesSnapshot } from './direct-message-snapshot.helpers';

describe('direct-message-snapshot.helpers', () => {
  const updateStore = vi.fn();
  const loadThreads = vi.fn();

  beforeEach(() => {
    updateStore.mockReset();
    loadThreads.mockReset();
  });

  it('normalizes newest-first DM snapshots back to chronological order', () => {
    const snapshot = {
      docs: [
        {
          id: 'm-3',
          data: () => ({
            authorId: 'user-2',
            content: 'Newest message',
            createdAt: Timestamp.fromDate(new Date('2026-04-18T08:30:00Z')),
            updatedAt: Timestamp.fromDate(new Date('2026-04-18T08:30:00Z')),
            isEdited: false,
            reactions: [],
            attachments: [],
            lastThreadTimestamp: Timestamp.fromDate(new Date('2026-04-18T08:30:00Z')),
            threadCount: 1,
          }),
        },
        {
          id: 'm-2',
          data: () => ({
            authorId: 'user-2',
            content: 'Middle message',
            createdAt: Timestamp.fromDate(new Date('2026-04-18T08:20:00Z')),
            updatedAt: Timestamp.fromDate(new Date('2026-04-18T08:20:00Z')),
            isEdited: false,
            reactions: [],
            attachments: [],
            threadCount: 0,
          }),
        },
        {
          id: 'm-1',
          data: () => ({
            authorId: 'user-1',
            content: 'Oldest message',
            createdAt: Timestamp.fromDate(new Date('2026-04-18T08:10:00Z')),
            updatedAt: Timestamp.fromDate(new Date('2026-04-18T08:10:00Z')),
            isEdited: false,
            reactions: [],
            attachments: [],
            threadCount: 0,
          }),
        },
      ],
    };

    handleMessagesSnapshot('user-1_user-2', snapshot, updateStore, { loadThreads });

    expect(updateStore).toHaveBeenCalledTimes(1);
    expect(updateStore.mock.calls[0][0]).toBe('user-1_user-2');
    expect(updateStore.mock.calls[0][1].map((message: { id: string }) => message.id)).toEqual([
      'm-1',
      'm-2',
      'm-3',
    ]);
    expect(loadThreads).toHaveBeenCalledWith('user-1_user-2', 'm-3', true, undefined);
  });
});
