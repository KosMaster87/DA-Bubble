/**
 * @fileoverview Channel Conversation Component
 * @description Chat interface for specific channels
 * @module features/dashboard/components/channel-conversation
 */

import {
  Component,
  signal,
  input,
  inject,
  computed,
  output,
  effect,
  untracked,
} from '@angular/core';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MembersMiniatureComponent } from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { AddMemberButtonComponent } from '@shared/dashboard-components/add-member-button/add-member-button.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { AddMembersComponent } from '@shared/dashboard-components/add-members/add-members.component';
import { ChannelInfoComponent } from '@shared/dashboard-components/channel-info/channel-info.component';
import { ChannelAccessComponent } from '../channel-access/channel-access.component';
import { UserStore, ChannelStore, ChannelMessageStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ProfileManagementService } from '@core/services/profile-management/profile-management.service';
import { ChannelMessageInteractionService } from '@core/services/channel-message-interaction/channel-message-interaction.service';
import { ChannelStateService } from '@core/services/channel-state/channel-state.service';
import { ChannelMembershipService } from '@core/services/channel-membership/channel-membership.service';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import {
  ChannelDataService,
  type ChannelInfo,
} from '@core/services/channel-data/channel-data.service';
import { MessageReaction } from '@core/models/message.model';
import { ChannelConversationHandlersService } from '@core/services/channel-conversation-handlers/channel-conversation-handlers.service';
import { ChannelConversationStateService } from '@core/services/channel-conversation-state/channel-conversation-state.service';

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: MessageReaction[];
  threadCount?: number;
  lastThreadTimestamp?: Date;
}

@Component({
  selector: 'app-channel-conversation',
  imports: [
    MessageBoxComponent,
    ConversationMessagesComponent,
    MembersMiniatureComponent,
    AddMemberButtonComponent,
    MembersOptionsMenuComponent,
    ProfileViewComponent,
    ProfileEditComponent,
    AddMembersComponent,
    ChannelInfoComponent,
    ChannelAccessComponent,
  ],
  templateUrl: './channel-conversation.component.html',
  styleUrl: './channel-conversation.component.scss',
})
export class ChannelConversationComponent {
  protected userStore = inject(UserStore);
  protected channelStore = inject(ChannelStore);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected authStore = inject(AuthStore);
  protected unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private profileManagement = inject(ProfileManagementService);
  private channelMessageInteraction = inject(ChannelMessageInteractionService);
  private channelState = inject(ChannelStateService);
  private channelMembership = inject(ChannelMembershipService);
  protected channelConversationUI = inject(ChannelConversationUIService);
  private channelData = inject(ChannelDataService);
  private handlers = inject(ChannelConversationHandlersService);
  private conversationState = inject(ChannelConversationStateService);
  threadRequested = output<{ messageId: string; parentMessage: Message }>();
  channelLeft = output<void>();
  directMessageRequested = output<string>(); // Emits userId to start DM with
  backRequested = output<void>(); // For mobile back navigation

  channel = input.required<ChannelInfo>();
  private channelId = computed(() => this.channel().id);
  private isJoiningChannel = signal<boolean>(false);
  protected isMember = this.channelData.isUserMember(this.channelId);
  protected isChannelOwner = this.conversationState.getIsChannelOwner(this.channel);

  /**
   * Check if user should see access screen
   * Show if: Not a member AND not the channel owner AND not currently joining
   */
  protected showAccessScreen = computed(() => {
    // Channel owner never needs to see access screen
    if (this.isChannelOwner()) {
      return false;
    }

    // Show access screen if not a member and not currently joining
    return !this.isMember() && !this.isJoiningChannel();
  });

  /**
   * Get channel access info for access screen
   */
  protected channelAccessInfo = this.channelData.getChannelAccessInfo(this.channel);

  /**
   * Effect: Setup channel state management
   */
  constructor() {
    this.setupJoiningStateReset();
    this.channelState.setupLoadMessagesEffect(this.channelId);
    this.channelState.setupAutoMarkAsReadEffect(this.channelId);
  }

  /**
   * Reset joining state when channel changes
   */
  private setupJoiningStateReset = (): void => {
    effect(() => {
      this.channelId();
      untracked(() => {
        this.isJoiningChannel.set(false);
        this.channelConversationUI.resetAll();
      });
    });
  };

  protected currentChannelData = this.conversationState.getCurrentChannelData(this.channel);

  /**
   * Check if current user is admin
   * TODO: Implement admin role in User model
   */
  protected isCurrentUserAdmin = computed(() => {
    // User model doesn't have isAdmin field yet
    return false;
  });

  protected isCurrentUserChannelOwner = this.channelData.isCurrentUserOwner(this.channelId);
  protected isSelectedUserChannelOwner = this.conversationState.getIsSelectedUserChannelOwner(
    this.channel
  );
  protected isOwnProfile = this.conversationState.getIsOwnProfile();
  protected editProfileUser = this.conversationState.getEditProfileUser();
  protected channelInfo = this.channelData.getChannelInfoData(this.channel);

  /**
   * Channel members from channel's memberIds
   */
  protected members = this.channelData.getChannelMembers(this.channelId);

  /**
   * Available users that are NOT yet members of this channel
   */
  protected availableUsers = this.channelData.getAvailableUsers(this.channelId);

  protected totalMemberCount = computed(() => this.members().length);
  protected selectedMember = this.conversationState.getSelectedMember();
  protected messages = this.conversationState.getMessages(this.channel);
  protected hasMoreMessages = this.conversationState.getHasMoreMessages(this.channel);
  protected loadingOlderMessages = this.conversationState.getLoadingOlderMessages(this.channel);

  /**
   * Load older messages for pagination
   */
  protected loadOlderMessages = async (): Promise<void> => {
    const channelId = this.channel().id;
    await this.channelMessageStore.loadOlderMessages(channelId);
  };

  /** Send message to channel */
  sendMessage = async (content: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    await this.sendChannelMessage(this.channel().id, content, currentUserId);
  };

  /** Send message and mark as read */
  private sendChannelMessage = async (
    channelId: string,
    content: string,
    userId: string
  ): Promise<void> => {
    await this.channelMessageInteraction.sendMessage(channelId, content, userId);
    this.unreadService.markAsRead(channelId);
  };

  protected messagesGroupedByDate = this.conversationState.getMessagesGroupedByDate(this.channel);

  /** Add reaction to message */
  addReaction = async (messageId: string, emojiId: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelId = this.channel().id;
    if (!currentUserId || !channelId) return;

    await this.channelMessageInteraction.toggleReaction(
      channelId,
      messageId,
      emojiId,
      currentUserId
    );
  };

  /** Handle members added - send invitations */
  onMembersAdded = async (userIds: string[]): Promise<void> => {
    await this.handlers.handleMembersAdded(this.channel().id, userIds);
  };

  /** Handle channel accepted (user joined from access screen) */
  protected onChannelAccepted = async (channelId: string): Promise<void> => {
    await this.handlers.handleChannelAccepted(
      channelId,
      () => this.isJoiningChannel.set(true),
      () => this.isJoiningChannel.set(false)
    );
  };

  /** Handle remove member from channel */
  protected onRemoveMember = async (): Promise<void> => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (!memberId) return;
    await this.handlers.handleRemoveMember(this.channel().id, memberId);
  };

  /** Handle edit profile save */
  protected onEditProfileSave = async (data: {
    displayName: string;
    isAdmin: boolean;
  }): Promise<void> => {
    const userId = this.channelConversationUI.getSelectedMemberId()();
    if (!userId) return;
    await this.handlers.handleEditProfileSave(userId, data);
  };

  /** Handle message click from profile */
  protected onProfileMessage = (): void => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (!memberId) return;

    this.channelConversationUI.closeProfileView();
    this.directMessageRequested.emit(memberId);
  };

  /** Handle channel info updated */
  protected onChannelUpdated = async (data: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
  }): Promise<void> => {
    await this.handlers.handleChannelUpdated(this.channel().id, data);
  };

  /** Handle leave channel clicked */
  onLeaveChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    const success = await this.handlers.handleLeaveChannel(this.channel().id, currentUserId);
    if (success) this.channelLeft.emit();
  };

  /** Handle delete channel clicked */
  onDeleteChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();
    if (!currentUserId || !channelData) return;
    const deleted = await this.handlers.handleDeleteChannel(
      channelData.id,
      currentUserId,
      channelData.name
    );
    if (deleted) this.channelLeft.emit();
  };

  /** Handle reaction added */
  protected onReactionAdded = (data: { messageId: string; emoji: string }): void => {
    this.addReaction(data.messageId, data.emoji);
  };

  /** Handle message edited */
  protected onMessageEdited = async (data: {
    messageId: string;
    newContent: string;
  }): Promise<void> => {
    const channelId = this.channel().id;
    await this.channelMessageInteraction.editMessage(channelId, data.messageId, data.newContent);
  };

  /** Handle message deleted */
  protected onMessageDeleted = async (messageId: string): Promise<void> => {
    const channelId = this.channel().id;
    await this.channelMessageInteraction.deleteMessage(channelId, messageId);
  };

  /** Handle thread click */
  protected onThreadClick = (messageId: string): void => {
    const parentMessage = this.findParentMessage(messageId);
    if (!parentMessage) return;
    this.emitThreadRequest(messageId, parentMessage);
  };

  /** Find parent message by ID */
  private findParentMessage = (messageId: string): ChannelMessage | undefined => {
    return this.messages().find((m) => m.id === messageId);
  };

  /** Emit thread request with message */
  private emitThreadRequest = (messageId: string, parentMessage: ChannelMessage): void => {
    const message = this.userTransformation.channelMessageToThreadMessage(parentMessage);
    this.threadRequested.emit({ messageId, parentMessage: message });
  };
}
