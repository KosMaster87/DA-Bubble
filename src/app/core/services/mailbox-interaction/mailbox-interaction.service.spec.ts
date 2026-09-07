import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MailboxStore } from '@stores/mailbox/mailbox.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailboxInteractionService } from './mailbox-interaction.service';

describe('MailboxInteractionService', () => {
  let service: MailboxInteractionService;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let mailboxStoreSpy: {
    markAsRead: ReturnType<typeof vi.fn>;
    getMessageById: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
    deleteMessage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    routerSpy = {
      navigate: vi.fn().mockResolvedValue(undefined),
    };

    mailboxStoreSpy = {
      markAsRead: vi.fn().mockResolvedValue(undefined),
      getMessageById: vi.fn(),
      markAllAsRead: vi.fn().mockResolvedValue(undefined),
      deleteMessage: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        MailboxInteractionService,
        { provide: Router, useValue: routerSpy },
        { provide: MailboxStore, useValue: mailboxStoreSpy },
      ],
    });

    service = TestBed.inject(MailboxInteractionService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('handleMessageClick', () => {
    it('calls markAsRead but does not navigate when the message has no link', async () => {
      const messageId = 'msg-no-link';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: undefined,
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('navigates to /dashboard/channel/:id when the message has a channel link', async () => {
      const messageId = 'msg-channel';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: { type: 'channel', targetId: 'channel-42' },
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard', 'channel', 'channel-42']);
    });

    it('navigates to /dashboard/channel/:id/thread/:threadId when the message has a channel link with threadId', async () => {
      const messageId = 'msg-channel-thread';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: { type: 'channel', targetId: 'channel-99', threadId: 'thread-7' },
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/dashboard',
        'channel',
        'channel-99',
        'thread',
        'thread-7',
      ]);
    });

    it('navigates to /dashboard/dm/:id when the message has a dm link', async () => {
      const messageId = 'msg-dm';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: { type: 'dm', targetId: 'user-123' },
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard', 'dm', 'user-123']);
    });

    it('navigates to /dashboard/dm/:id/thread/:threadId when the message has a dm link with threadId', async () => {
      const messageId = 'msg-dm-thread';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: { type: 'dm', targetId: 'user-456', threadId: 'thread-3' },
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/dashboard',
        'dm',
        'user-456',
        'thread',
        'thread-3',
      ]);
    });

    it('navigates to /dashboard/channel/:id/thread/:threadId when the message has a thread link', async () => {
      const messageId = 'msg-thread';
      mailboxStoreSpy.getMessageById.mockReturnValue({
        id: messageId,
        link: { type: 'thread', targetId: 'channel-1', threadId: 'thread-5' },
      });

      await service.handleMessageClick(messageId);

      expect(mailboxStoreSpy.markAsRead).toHaveBeenCalledWith(messageId);
      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/dashboard',
        'channel',
        'channel-1',
        'thread',
        'thread-5',
      ]);
    });
  });

  describe('markAllAsRead', () => {
    it('delegates to MailboxStore.markAllAsRead', async () => {
      await service.markAllAsRead();

      expect(mailboxStoreSpy.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteMessage', () => {
    it('delegates to MailboxStore.deleteMessage with the given id', async () => {
      const messageId = 'msg-to-delete';

      await service.deleteMessage(messageId);

      expect(mailboxStoreSpy.deleteMessage).toHaveBeenCalledTimes(1);
      expect(mailboxStoreSpy.deleteMessage).toHaveBeenCalledWith(messageId);
    });
  });
});
