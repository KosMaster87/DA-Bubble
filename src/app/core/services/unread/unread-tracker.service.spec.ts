import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnreadListenerService } from './unread-listener.service';
import { UnreadTrackerService } from './unread-tracker.service';

describe('UnreadTrackerService', () => {
  const lastReadCacheSignal = signal<Record<string, Date>>({});

  beforeEach(() => {
    lastReadCacheSignal.set({});

    TestBed.configureTestingModule({
      providers: [
        UnreadTrackerService,
        {
          provide: UnreadListenerService,
          useValue: {
            getLastReadCache: () => lastReadCacheSignal.asReadonly(),
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('flags potential unread thread activity when newer conversation activity exists for a tracked thread', () => {
    lastReadCacheSignal.set({
      'user-1_user-2': new Date('2026-04-18T09:00:00Z'),
      'user-1_user-2_thread_parent-1': new Date('2026-04-18T08:00:00Z'),
    });

    const service = TestBed.inject(UnreadTrackerService);

    expect(
      service.hasPotentialThreadUnreadActivity('user-1_user-2', new Date('2026-04-18T08:30:00Z')),
    ).toBe(true);
  });

  it('ignores conversations without tracked thread reads', () => {
    lastReadCacheSignal.set({
      'user-1_user-2': new Date('2026-04-18T09:00:00Z'),
    });

    const service = TestBed.inject(UnreadTrackerService);

    expect(
      service.hasPotentialThreadUnreadActivity('user-1_user-2', new Date('2026-04-18T08:30:00Z')),
    ).toBe(false);
  });
});
