import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@angular/fire/firestore', () => {
  return {
    doc: vi.fn((_: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _mockTimestamp: true })),
    arrayUnion: vi.fn((value: string) => ({ _mockArrayUnion: value })),
  };
});

import { getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import {
  createNewConversation,
  startOrResumeConversation,
} from './direct-message-conversation.helpers';

const getDocMock = vi.mocked(getDoc);
const setDocMock = vi.mocked(setDoc);
const updateDocMock = vi.mocked(updateDoc);

describe('direct-message-conversation.helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createNewConversation writes conversation and updates both users', async () => {
    const firestore = {} as never;
    const existing = [{ id: 'old-1' }] as never[];

    const result = await createNewConversation(firestore, 'dm_1_2', 'u1', 'u2', existing);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'dm_1_2', participants: ['u1', 'u2'] });
  });

  it('startOrResumeConversation creates when conversation does not exist', async () => {
    const firestore = {} as never;
    const existing = [] as never[];

    getDocMock.mockResolvedValueOnce({ exists: () => false } as never);

    const result = await startOrResumeConversation(firestore, 'dm_u1_u2', 'u2', 'u1', existing);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalledTimes(2);
    expect(result.conversations).toHaveLength(1);
    expect(result.result.participants).toEqual(['u1', 'u2']);
  });

  it('startOrResumeConversation returns existing list when conversation exists and no re-add', async () => {
    const firestore = {} as never;
    const existing = [{ id: 'dm_u1_u2' }] as never[];

    getDocMock
      .mockResolvedValueOnce({ exists: () => true, id: 'dm_u1_u2', data: () => ({}) } as never)
      .mockResolvedValueOnce({ exists: () => false } as never);

    const result = await startOrResumeConversation(firestore, 'dm_u1_u2', 'u1', 'u2', existing);

    expect(result.conversations).toBe(existing);
    expect(result.result).toEqual({ id: 'dm_u1_u2', participants: ['u1', 'u2'] });
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
