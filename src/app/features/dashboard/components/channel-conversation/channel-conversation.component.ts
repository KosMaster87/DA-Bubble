/**
 * @fileoverview Channel Conversation Component
 * @description Main component for channel conversations
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
import { ChannelViewComponent } from '@shared/dashboard-components/channel-view/channel-view.component';
import { ChannelAccessComponent } from '../channel-access/channel-access.component';
import { ChannelStore, ChannelMessageStore } from '@stores/index';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { ChannelMessageInteractionService } from '@core/services/channel-message-interaction/channel-message-interaction.service';
import { ChannelStateService } from '@core/services/channel-state/channel-state.service';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import {
  ChannelDataService,
  type ChannelInfo,
} from '@core/services/channel-data/channel-data.service';
import { MessageReaction } from '@core/models/message.model';
import { ChannelConversationHandlersService } from '@core/services/channel-conversation-handlers/channel-conversation-handlers.service';
import { ChannelConversationStateService } from '@core/services/channel-conversation-state/channel-conversation-state.service';
import { ChannelViewService } from '@core/services/channel-view/channel-view.service';
import { MessageScrollService } from '@core/services/message-scroll/message-scroll.service';

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
    ChannelViewComponent,
    ChannelAccessComponent,
  ],
  templateUrl: './channel-conversation.component.html',
  styleUrl: './channel-conversation.component.scss',
})
export class ChannelConversationComponent {
  protected channelStore = inject(ChannelStore);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected authStore = inject(AuthStore);
  protected unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private channelMessageInteraction = inject(ChannelMessageInteractionService);
  private channelState = inject(ChannelStateService);
  protected channelConversationUI = inject(ChannelConversationUIService);
  private channelData = inject(ChannelDataService);
  private handlers = inject(ChannelConversationHandlersService);
  private conversationState = inject(ChannelConversationStateService);
  protected channelViewService = inject(ChannelViewService);
  protected messageScrollService = inject(MessageScrollService);
  threadRequested = output<{ messageId: string; parentMessage: Message }>();
  channelLeft = output<void>();
  directMessageRequested = output<string>();
  backRequested = output<void>();
  channelMentionRequested = output<string>();

  channel = input.required<ChannelInfo>();
  private channelId = computed(() => this.channel().id);
  private isJoiningChannel = signal<boolean>(false);
  protected isMember = this.channelData.isUserMember(this.channelId);
  protected isChannelOwner = this.conversationState.getIsChannelOwner(this.channel);
  protected showAccessScreen = this.conversationState.getShowAccessScreen(
    this.isChannelOwner,
    this.isMember,
    this.isJoiningChannel.asReadonly(),
  );

  /**
   * Get channel access info for access screen
   * @returns {Signal} Channel access information
   */
  protected channelAccessInfo = this.channelData.getChannelAccessInfo(this.channel);

  /**
   * Setup channel state management effects
   */
  constructor() {
    this.setupJoiningStateReset();
    this.channelState.setupLoadMessagesEffect(this.channelId);
    this.channelState.setupAutoMarkAsReadEffect(this.channelId);
  }

  /**
   * Reset joining state when channel changes
   * @private
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
  protected isCurrentUserChannelOwner = this.channelData.isCurrentUserOwner(this.channelId);
  protected isSelectedUserChannelOwner = this.conversationState.getIsSelectedUserChannelOwner(
    this.channel,
  );

  protected shouldShowAddMemberButton = this.conversationState.getShouldShowAddMemberButton(
    this.channel,
    this.currentChannelData,
  );

  protected isOwnProfile = this.conversationState.getIsOwnProfile();
  protected editProfileUser = this.conversationState.getEditProfileUser();
  protected channelInfo = this.channelData.getChannelInfoData(this.channel);
  protected isChannelViewOpen = this.channelViewService.isChannelViewOpen;
  protected selectedChannelId = this.channelViewService.channelId;
  protected members = this.channelData.getChannelMembers(this.channelId);
  protected memberListItems = this.conversationState.getMemberListItems(this.members);
  protected channelListItems = this.conversationState.getChannelListItems(this.channel);

  /**
   * Available users that are NOT yet members of this channel
   * @returns {Signal} Non-member users list
   */
  protected availableUsers = this.channelData.getAvailableUsers(this.channelId);
  protected totalMemberCount = computed(() => this.members().length);
  protected selectedMember = this.conversationState.getSelectedMember();
  protected messages = this.conversationState.getMessages(this.channel);
  protected hasMoreMessages = this.conversationState.getHasMoreMessages(this.channel);
  protected loadingOlderMessages = this.conversationState.getLoadingOlderMessages(this.channel);
  protected searchableMessages = this.conversationState.getSearchableMessages(this.channel);

  /**
   * Load older messages for pagination
   * @protected
   */
  protected loadOlderMessages = async (): Promise<void> => {
    const channelId = this.channel().id;
    await this.channelMessageStore.loadOlderMessages(channelId);
  };

  /**
   * Send message to channel
   * @param {string} content - Message content
   */
  sendMessage = async (content: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    await this.sendChannelMessage(this.channel().id, content, currentUserId);
  };

  /**
   * Send message and mark as read
   * @private
   */
  private sendChannelMessage = async (
    channelId: string,
    content: string,
    userId: string,
  ): Promise<void> => {
    await this.channelMessageInteraction.sendMessage(channelId, content, userId);
    this.unreadService.markAsRead(channelId);
  };

  protected messagesGroupedByDate = this.conversationState.getMessagesGroupedByDate(this.channel);

  /**
   * Add reaction to message
   */
  addReaction = async (messageId: string, emojiId: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelId = this.channel().id;
    if (!currentUserId || !channelId) return;

    await this.channelMessageInteraction.toggleReaction(
      channelId,
      messageId,
      emojiId,
      currentUserId,
    );
  };

  /**
   * Handle members added
   */
  onMembersAdded = async (userIds: string[]): Promise<void> => {
    await this.handlers.handleMembersAdded(this.channel().id, userIds);
  };

  /**
   * Handle channel accepted
   * @protected
   */
  protected onChannelAccepted = async (channelId: string): Promise<void> => {
    await this.handlers.handleChannelAccepted(
      channelId,
      () => this.isJoiningChannel.set(true),
      () => this.isJoiningChannel.set(false),
    );
  };

  protected onRemoveMember = async (): Promise<void> => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (memberId) await this.handlers.handleRemoveMember(this.channel().id, memberId);
  };

  protected onEditProfileSave = async (data: { displayName: string }): Promise<void> => {
    const userId = this.channelConversationUI.getSelectedMemberId()();
    if (userId) await this.handlers.handleEditProfileSave(userId, { ...data, isAdmin: false });
  };

  protected onProfileMessage = (): void => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (memberId) {
      this.channelConversationUI.closeProfileView();
      this.directMessageRequested.emit(memberId);
    }
  };

  protected onChannelUpdated = async (data: { name?: string; description?: string; isPrivate?: boolean }): Promise<void> => {
    await this.handlers.handleChannelUpdated(this.channel().id, data);
  };

  onLeaveChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    const success = await this.handlers.handleLeaveChannel(this.channel().id, currentUserId);
    if (success) this.channelLeft.emit();
  };

  onDeleteChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();
    if (!currentUserId || !channelData) return;
    const deleted = await this.handlers.handleDeleteChannel(channelData.id, currentUserId, channelData.name);
    if (deleted) this.channelLeft.emit();
  };

  protected onMessageEdited = async (data: { messageId: string; newContent: string }): Promise<void> => {
    await this.channelMessageInteraction.editMessage(this.channel().id, data.messageId, data.newContent);
  };

  protected onMessageDeleted = async (messageId: string): Promise<void> => {
    await this.channelMessageInteraction.deleteMessage(this.channel().id, messageId);
  };

  protected onThreadClick = (messageId: string): void => {
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (parentMessage) {
      const message = this.userTransformation.channelMessageToThreadMessage(parentMessage);
      this.threadRequested.emit({ messageId, parentMessage: message });
    }
  };

  protected onChannelViewJoin = async (channelId: string): Promise<void> => {
    if (await this.channelViewService.joinChannel(channelId)) {
      this.channelMentionRequested.emit(channelId);
    }
  };
}
