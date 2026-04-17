import { Channel } from '@core/models/channel.model';
import { describe, expect, it } from 'vitest';
import { ChannelStateHelper } from './channel-state.helper';

const makeChannel = (id: string, members: string[] = [], createdBy = 'owner'): Channel =>
  ({ id, members, admins: [], createdBy, name: `ch-${id}` }) as unknown as Channel;

describe('ChannelStateHelper.filterUserChannels', () => {
  it('returns channels where user is a member', () => {
    const channels = [makeChannel('a', ['u1']), makeChannel('b', ['u2'])];
    expect(ChannelStateHelper.filterUserChannels(channels, 'u1').map((c) => c.id)).toEqual(['a']);
  });

  it('returns empty array when userId is undefined', () => {
    const channels = [makeChannel('a', ['u1'])];
    expect(ChannelStateHelper.filterUserChannels(channels, undefined)).toEqual([]);
  });
});

describe('ChannelStateHelper.updateChannelInArray', () => {
  it('applies updates to the matching channel', () => {
    const channels = [makeChannel('a'), makeChannel('b')];
    const result = ChannelStateHelper.updateChannelInArray(channels, 'a', { name: 'new-name' });
    expect(result.find((c) => c.id === 'a')?.name).toBe('new-name');
  });

  it('leaves other channels unchanged', () => {
    const channels = [makeChannel('a'), makeChannel('b')];
    const result = ChannelStateHelper.updateChannelInArray(channels, 'a', { name: 'x' });
    expect(result.find((c) => c.id === 'b')?.name).toBe('ch-b');
  });
});

describe('ChannelStateHelper.findChannelById', () => {
  it('returns matching channel', () => {
    const channels = [makeChannel('a'), makeChannel('b')];
    expect(ChannelStateHelper.findChannelById(channels, 'b')?.id).toBe('b');
  });

  it('returns undefined when not found', () => {
    expect(ChannelStateHelper.findChannelById([], 'z')).toBeUndefined();
  });
});

describe('ChannelStateHelper.isChannelOwner', () => {
  it('returns true when user is the creator', () => {
    expect(ChannelStateHelper.isChannelOwner(makeChannel('a', [], 'u1'), 'u1')).toBe(true);
  });

  it('returns false when user is not the creator', () => {
    expect(ChannelStateHelper.isChannelOwner(makeChannel('a', [], 'u1'), 'u2')).toBe(false);
  });
});
