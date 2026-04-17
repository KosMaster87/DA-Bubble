import { describe, expect, it } from 'vitest';
import { ThreadMessage } from '../threads/thread.store';
import { ThreadStateHelper } from './thread-state.helper';

const makeThread = (id: string, content = 'hello'): ThreadMessage =>
  ({ id, content, updatedAt: new Date(0), isEdited: false }) as unknown as ThreadMessage;

describe('ThreadStateHelper.updateThreadsFromSnapshot', () => {
  it('adds threads for a new messageId', () => {
    const current = {};
    const threads = [makeThread('t1')];
    const result = ThreadStateHelper.updateThreadsFromSnapshot(current, 'msg1', threads);
    expect(result['msg1']).toEqual(threads);
  });

  it('replaces threads for an existing messageId', () => {
    const current = { msg1: [makeThread('old')] };
    const threads = [makeThread('new')];
    const result = ThreadStateHelper.updateThreadsFromSnapshot(current, 'msg1', threads);
    expect(result['msg1'][0].id).toBe('new');
  });

  it('does not mutate the original state', () => {
    const current = {};
    ThreadStateHelper.updateThreadsFromSnapshot(current, 'msg1', []);
    expect(Object.keys(current).length).toBe(0);
  });
});

describe('ThreadStateHelper.updateThreadInState', () => {
  it('applies updates and sets isEdited: true', () => {
    const threads = [makeThread('t1'), makeThread('t2')];
    const result = ThreadStateHelper.updateThreadInState(threads, 't1', { content: 'edited' });
    const updated = result.find((t) => t.id === 't1');
    expect(updated?.content).toBe('edited');
    expect(updated?.isEdited).toBe(true);
  });

  it('leaves non-matching threads unchanged', () => {
    const threads = [makeThread('t1'), makeThread('t2')];
    const result = ThreadStateHelper.updateThreadInState(threads, 't1', { content: 'x' });
    expect(result.find((t) => t.id === 't2')?.content).toBe('hello');
  });
});

describe('ThreadStateHelper.removeThreadFromState', () => {
  it('removes the matching thread', () => {
    const threads = [makeThread('t1'), makeThread('t2')];
    const result = ThreadStateHelper.removeThreadFromState(threads, 't1');
    expect(result.map((t) => t.id)).toEqual(['t2']);
  });

  it('returns unchanged array when id not found', () => {
    const threads = [makeThread('t1')];
    expect(ThreadStateHelper.removeThreadFromState(threads, 'z').length).toBe(1);
  });
});
