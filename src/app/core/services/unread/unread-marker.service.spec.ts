import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { AuthStore } from '@stores/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UNREAD_MARKER_FIRESTORE_OPS,
  type UnreadMarkerFirestoreOps,
  UnreadMarkerService,
} from './unread-marker.service';

describe('UnreadMarkerService', () => {
  let firestoreOps: UnreadMarkerFirestoreOps;

  beforeEach(() => {
    firestoreOps = {
      doc: vi.fn((_: unknown, ...segments: Array<string | undefined>) => {
        return {
          path: segments.filter((segment): segment is string => !!segment).join('/'),
        } as never;
      }) as unknown as UnreadMarkerFirestoreOps['doc'],
      serverTimestamp: vi.fn(() => ({ __timestamp: true }) as never),
      updateDoc: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        UnreadMarkerService,
        { provide: Firestore, useValue: {} },
        {
          provide: AuthStore,
          useValue: {
            user: vi.fn(() => ({ uid: 'user-1' })),
          },
        },
        {
          provide: UNREAD_MARKER_FIRESTORE_OPS,
          useValue: firestoreOps,
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('updates lastRead and clears DM unreadCount when marking a DM as read', async () => {
    const service = TestBed.inject(UnreadMarkerService);

    await service.markAsRead('user-1_user-2', true);

    expect(firestoreOps.updateDoc).toHaveBeenCalledTimes(2);
    expect(firestoreOps.updateDoc).toHaveBeenNthCalledWith(
      1,
      { path: 'users/user-1' },
      { 'lastRead.user-1_user-2': { __timestamp: true } },
    );
    expect(firestoreOps.updateDoc).toHaveBeenNthCalledWith(
      2,
      { path: 'direct-messages/user-1_user-2' },
      { 'unreadCount.user-1': 0 },
    );
  });

  it('only updates lastRead when marking a channel as read', async () => {
    const service = TestBed.inject(UnreadMarkerService);

    await service.markAsRead('channel-1');

    expect(firestoreOps.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestoreOps.updateDoc).toHaveBeenCalledWith(
      { path: 'users/user-1' },
      { 'lastRead.channel-1': { __timestamp: true } },
    );
  });
});
