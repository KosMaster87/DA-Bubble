import { Message } from '@core/models/message.model';
import { describe, expect, it } from 'vitest';
import { ChannelMessageStateHelper } from './channel-message-state.helper';

const makeMsg = (id: string): Message => ({ id, content: `msg-${id}` }) as unknown as Message;

describe('ChannelMessageStateHelper.updateChannelMessages', () => {
  it('sets messages for a channel', () => {
    const result = ChannelMessageStateHelper.updateChannelMessages({}, 'ch1', [makeMsg('m1')]);
    expect(result['ch1'].length).toBe(1);
  });

  it('replaces existing messages for a channel', () => {
    const current = { ch1: [makeMsg('old')] };
    const result = ChannelMessageStateHelper.updateChannelMessages(current, 'ch1', [
      makeMsg('new'),
    ]);
    expect(result['ch1'][0].id).toBe('new');
  });
});

describe('ChannelMessageStateHelper.addMessageToChannel', () => {
  it('prepends the new message', () => {
    const current = { ch1: [makeMsg('m2')] };
    const result = ChannelMessageStateHelper.addMessageToChannel(current, 'ch1', makeMsg('m1'));
    expect(result['ch1'][0].id).toBe('m1');
  });

  it('creates the channel array if missing', () => {
    const result = ChannelMessageStateHelper.addMessageToChannel({}, 'ch1', makeMsg('m1'));
    expect(result['ch1'].length).toBe(1);
  });
});

describe('ChannelMessageStateHelper.updateMessageInAllChannels', () => {
  it('updates the matching message across all channels', () => {
    const current = { ch1: [makeMsg('m1')], ch2: [makeMsg('m1')] };
    const result = ChannelMessageStateHelper.updateMessageInAllChannels(current, 'm1', {
      content: 'updated',
    });
    expect(result['ch1'][0].content).toBe('updated');
    expect(result['ch2'][0].content).toBe('updated');
  });

  it('leaves non-matching messages unchanged', () => {
    const current = { ch1: [makeMsg('m1'), makeMsg('m2')] };
    const result = ChannelMessageStateHelper.updateMessageInAllChannels(current, 'm1', {
      content: 'x',
    });
    expect(result['ch1'].find((m) => m.id === 'm2')?.content).toBe('msg-m2');
  });
});

describe('ChannelMessageStateHelper.buildNoMoreMessagesState', () => {
  it('sets hasMoreMessages to false for the channel', () => {
    const result = ChannelMessageStateHelper.buildNoMoreMessagesState({ ch1: true }, 'ch1');
    expect(result.hasMoreMessages?.['ch1']).toBe(false);
  });
});

describe('ChannelMessageStateHelper.buildOlderMessagesSuccessState', () => {
  it('prepends older messages to existing ones', () => {
    const current = { ch1: [makeMsg('new')] };
    const result = ChannelMessageStateHelper.buildOlderMessagesSuccessState(
      current,
      {},
      {},
      'ch1',
      [makeMsg('old')],
    );
    expect(result.channelMessages?.['ch1'][0].id).toBe('old');
    expect(result.channelMessages?.['ch1'][1].id).toBe('new');
  });

  it('sets loadingOlderMessages to false', () => {
    const result = ChannelMessageStateHelper.buildOlderMessagesSuccessState(
      {},
      {},
      { ch1: true },
      'ch1',
      [],
    );
    expect(result.loadingOlderMessages?.['ch1']).toBe(false);
  });

  it('sets hasMoreMessages true when exactly 100 messages returned', () => {
    const messages = Array.from({ length: 100 }, (_, i) => makeMsg(`m${i}`));
    const result = ChannelMessageStateHelper.buildOlderMessagesSuccessState(
      {},
      {},
      {},
      'ch1',
      messages,
    );
    expect(result.hasMoreMessages?.['ch1']).toBe(true);
  });
});

describe('ChannelMessageStateHelper.buildMessagesLoadedState', () => {
  it('returns updated channelMessages, isLoading: false, and incremented counter', () => {
    const messages = [makeMsg('m1')];
    const result = ChannelMessageStateHelper.buildMessagesLoadedState({}, {}, 3, 'ch1', messages);
    expect(result.channelMessages['ch1'].length).toBe(1);
    expect(result.isLoading).toBe(false);
    expect(result.updateCounter).toBe(4);
  });
});
