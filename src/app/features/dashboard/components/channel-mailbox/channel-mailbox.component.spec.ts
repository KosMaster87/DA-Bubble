import { NO_ERRORS_SCHEMA, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InvitationManagementService } from '@core/services/invitation-management/invitation-management.service';
import { InvitationService } from '@core/services/invitation/invitation.service';
import { MailboxInteractionService } from '@core/services/mailbox-interaction/mailbox-interaction.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { AuthStore } from '@stores/auth';
import { ChannelStore, MailboxStore } from '@stores/index';
import type { MailboxMessage } from '@stores/mailbox.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChannelMailboxComponent } from './channel-mailbox.component';

function makeMessage(overrides: Partial<MailboxMessage> = {}): MailboxMessage {
  return {
    id: 'msg-1',
    recipientId: 'user-1',
    authorId: 'system',
    subject: 'Test Subject',
    content: 'Test content',
    isRead: false,
    type: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    reactions: [],
    attachments: [],
    ...overrides,
  };
}

describe('ChannelMailboxComponent', () => {
  let messagesSignal: WritableSignal<MailboxMessage[]>;
  let loadingSignal: WritableSignal<boolean>;
  let errorSignal: WritableSignal<string | null>;

  beforeEach(async () => {
    messagesSignal = signal([]);
    loadingSignal = signal(false);
    errorSignal = signal(null);

    await TestBed.configureTestingModule({
      imports: [ChannelMailboxComponent],
      providers: [
        {
          provide: MailboxStore,
          useValue: {
            messages: messagesSignal,
            loading: loadingSignal,
            error: errorSignal,
            unreadCount: signal(0),
            setCurrentUser: vi.fn(),
          },
        },
        {
          provide: ChannelStore,
          useValue: {
            getChannelById: () => (_id: string) => ({
              name: 'Mailbox',
              description: 'Test description',
            }),
          },
        },
        {
          provide: AuthStore,
          useValue: { user: signal(null) },
        },
        {
          provide: InvitationService,
          useValue: { subscribeToInvitations: vi.fn().mockReturnValue(() => {}) },
        },
        {
          provide: InvitationManagementService,
          useValue: { acceptInvitation: vi.fn(), declineInvitation: vi.fn() },
        },
        {
          provide: MailboxInteractionService,
          useValue: { handleMessageClick: vi.fn() },
        },
        {
          provide: UserTransformationService,
          useValue: {
            getUserDisplayName: vi.fn().mockReturnValue('Test User'),
            getUserAvatar: vi.fn().mockReturnValue('/img/profile/profile-1.png'),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders message subjects from store', () => {
    messagesSignal.set([
      makeMessage({ id: 'msg-1', subject: 'Welcome to DABubble' }),
      makeMessage({ id: 'msg-2', subject: 'New Feature Available' }),
    ]);

    const fixture = TestBed.createComponent(ChannelMailboxComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Welcome to DABubble');
    expect(text).toContain('New Feature Available');
  });

  it('shows empty state when no messages and no invitations', () => {
    messagesSignal.set([]);
    loadingSignal.set(false);

    const fixture = TestBed.createComponent(ChannelMailboxComponent);
    fixture.detectChanges();

    const emptyEl = fixture.debugElement.query(By.css('.channel-mailbox__empty'));
    expect(emptyEl).not.toBeNull();
  });

  it('shows error state when store error is set', () => {
    errorSignal.set('Connection failed');

    const fixture = TestBed.createComponent(ChannelMailboxComponent);
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.channel-mailbox__error'));
    expect(errorEl).not.toBeNull();
  });

  it('shows loading indicator while messages are loading', () => {
    loadingSignal.set(true);

    const fixture = TestBed.createComponent(ChannelMailboxComponent);
    fixture.detectChanges();

    const loadingEl = fixture.debugElement.query(By.css('.channel-mailbox__loading'));
    expect(loadingEl).not.toBeNull();
  });
});
