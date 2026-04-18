import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNewConversation,
  startOrResumeConversation,
} from './direct-message-conversation.helpers';
import type { DirectMessageFirestoreOps } from './direct-message-operations.helpers';

describe('direct-message-conversation.helpers', () => {
  let firestoreOps: DirectMessageFirestoreOps;

  beforeEach(() => {
    const docMock = vi.fn((...args: unknown[]) => {
      return { path: args.slice(1).join('/') } as never;
    }) as unknown as DirectMessageFirestoreOps['doc'];
    const collectionMock = vi.fn((...args: unknown[]) => {
      return { path: args.slice(1).join('/') } as never;
    }) as unknown as DirectMessageFirestoreOps['collection'];

    firestoreOps = {
      doc: docMock,
      getDoc: vi.fn().mockResolvedValue({ exists: () => false } as never),
      setDoc: vi.fn().mockResolvedValue(undefined),
      updateDoc: vi.fn().mockResolvedValue(undefined),
      deleteDoc: vi.fn().mockResolvedValue(undefined),
      addDoc: vi.fn().mockResolvedValue(undefined),
      collection: collectionMock,
      getDocs: vi.fn().mockResolvedValue({ docs: [] } as never),
      serverTimestamp: vi.fn(() => ({ _mockTimestamp: true }) as never),
      arrayUnion: vi.fn((value: unknown) => ({ _mockArrayUnion: value }) as never),
    };
  });

  it('createNewConversation writes conversation and updates both users', async () => {
    const firestore = {} as never;
    const existing = [{ id: 'old-1' }] as never[];

    const result = await createNewConversation(
      firestore,
      'dm_1_2',
      'u1',
      'u2',
      existing,
      firestoreOps,
    );

    expect(firestoreOps.setDoc).toHaveBeenCalledTimes(1);
    expect(firestoreOps.updateDoc).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'dm_1_2', participants: ['u1', 'u2'] });
  });

  it('startOrResumeConversation creates when conversation does not exist', async () => {
    const firestore = {} as never;
    const existing = [] as never[];

    vi.mocked(firestoreOps.getDoc).mockResolvedValueOnce({ exists: () => false } as never);

    const result = await startOrResumeConversation(
      firestore,
      'dm_u1_u2',
      'u2',
      'u1',
      existing,
      firestoreOps,
    );

    expect(firestoreOps.setDoc).toHaveBeenCalledTimes(1);
    expect(firestoreOps.updateDoc).toHaveBeenCalledTimes(2);
    expect(result.conversations).toHaveLength(1);
    expect(result.result.participants).toEqual(['u1', 'u2']);
  });

  it('startOrResumeConversation returns existing list when conversation exists and no re-add', async () => {
    const firestore = {} as never;
    const existing = [{ id: 'dm_u1_u2' }] as never[];

    vi.mocked(firestoreOps.getDoc)
      .mockResolvedValueOnce({ exists: () => true, id: 'dm_u1_u2', data: () => ({}) } as never)
      .mockResolvedValueOnce({ exists: () => false } as never);

    const result = await startOrResumeConversation(
      firestore,
      'dm_u1_u2',
      'u1',
      'u2',
      existing,
      firestoreOps,
    );

    expect(result.conversations).toBe(existing);
    expect(result.result).toEqual({ id: 'dm_u1_u2', participants: ['u1', 'u2'] });
    expect(firestoreOps.setDoc).not.toHaveBeenCalled();
  });
});
