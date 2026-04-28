/**
 * @fileoverview Channel Conversation Component
 * @description Main component for channel conversations
 * @module features/dashboard/components/channel-conversation
 */

import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MessageReaction } from '@core/models/message.model';
import { ChannelConversationHandlersService } from '@core/services/channel-conversation-handlers/channel-conversation-handlers.service';
import { ChannelConversationStateService } from '@core/services/channel-conversation-state/channel-conversation-state.service';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import {
  ChannelDataService,
  type ChannelInfo,
} from '@core/services/channel-data/channel-data.service';
import { ChannelMessageInteractionService } from '@core/services/channel-message-interaction/channel-message-interaction.service';
import { ChannelStateService } from '@core/services/channel-state/channel-state.service';
import { ChannelViewService } from '@core/services/channel-view/channel-view.service';
import { MessageScrollService } from '@core/services/message-scroll/message-scroll.service';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { AddMemberButtonComponent } from '@shared/dashboard-components/add-member-button/add-member-button.component';
import { AddMembersComponent } from '@shared/dashboard-components/add-members/add-members.component';
import { ChannelInfoComponent } from '@shared/dashboard-components/channel-info/channel-info.component';
import { ChannelViewComponent } from '@shared/dashboard-components/channel-view/channel-view.component';
import {
  ConversationMessagesComponent,
  type Message,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MembersMiniatureComponent } from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import { ProfileEditComponent } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import { ProfileViewComponent } from '@shared/dashboard-components/profile-view/profile-view.component';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore, ChannelStore } from '@stores/index';
import { ChannelAccessComponent } from '../channel-access/channel-access.component';

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
   * @description Provides a precomputed access model so join-gate UI stays declarative and detached from membership rule internals.
   * @returns {Signal} Channel access information
   */
  protected channelAccessInfo = this.channelData.getChannelAccessInfo(this.channel);

  /**
   * Setup channel state management effects
   * @description Wires load and read-mark effects once at component initialization so channel state stays synchronized with active context.
   */
  constructor() {
    this.setupJoiningStateReset();
    this.channelState.setupLoadMessagesEffect(this.channelId);
    this.channelState.setupAutoMarkAsReadEffect(this.channelId);
  }

  /**
   * Reset joining state when channel changes
   * @description Resets transient join UI state on channel changes so stale access-screen states cannot leak across channels.
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
   * @description Supplies an invitation-ready candidate list so add-member dialogs avoid duplicate filtering logic.
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
   * @description Delegates pagination to the channel-message store so this component keeps rendering concerns separate from cursor mechanics.
   * @protected
   */
  protected loadOlderMessages = async (): Promise<void> => {
    const channelId = this.channel().id;
    await this.channelMessageStore.loadOlderMessages(channelId);
  };

  /**
   * Send message to channel
   * @description Validates sender context at the component boundary before delegating writes, preventing anonymous send attempts.
   * @param {string} content - Message content
   */
  sendMessage = async (content: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    await this.sendChannelMessage(this.channel().id, content, currentUserId);
  };

  /**
   * Send message and mark as read
   * @description Couples send and read-marking so own outgoing messages immediately clear unread indicators for the active channel.
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
   * @description Consolidates reaction entry from the conversation UI so reaction writes follow one permission and identity path.
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
   * @description Delegates member-add orchestration to a handler service so invitation side effects remain outside component code.
   */
  onMembersAdded = async (userIds: string[]): Promise<void> => {
    await this.handlers.handleMembersAdded(this.channel().id, userIds);
  };

  /**
   * Handle channel accepted
   * @description Wraps join flow with local joining flags so access-screen transitions remain responsive during async membership updates.
   * @protected
   */
  protected onChannelAccepted = async (channelId: string): Promise<void> => {
    await this.handlers.handleChannelAccepted(
      channelId,
      () => this.isJoiningChannel.set(true),
      () => this.isJoiningChannel.set(false),
    );
  };

  /**
   * Handle member removal from selected profile context.
   * @description Uses the UI-selected member source as single truth so removal actions stay aligned with the currently opened member context.
   * @protected
   * @returns {Promise<void>}
   */
  protected onRemoveMember = async (): Promise<void> => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (memberId) await this.handlers.handleRemoveMember(this.channel().id, memberId);
  };

  /**
   * Handle profile edit save from channel member profile.
   * @description Routes member profile edits through conversation handlers so permission checks and profile side effects remain centralized.
   * @protected
   * @param {Object} data - Profile payload from edit modal
   * @param {string} data.displayName - Updated display name
   * @returns {Promise<void>}
   */
  protected onEditProfileSave = async (data: { displayName: string }): Promise<void> => {
    const userId = this.channelConversationUI.getSelectedMemberId()();
    if (userId) await this.handlers.handleEditProfileSave(userId, { ...data, isAdmin: false });
  };

  /**
   * Start direct message from selected member profile.
   * @description Closes the profile overlay before emitting DM intent so conversation navigation cannot leave stale profile UI open.
   * @protected
   * @returns {void}
   */
  protected onProfileMessage = (): void => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (memberId) {
      this.channelConversationUI.closeProfileView();
      this.directMessageRequested.emit(memberId);
    }
  };

  /**
   * Handle channel metadata updates.
   * @description Delegates channel update orchestration to handlers so rename/description/privacy updates share one validation and write path.
   * @protected
   * @param {Object} data - Partial channel updates
   * @param {string} [data.name] - New channel name
   * @param {string} [data.description] - New channel description
   * @param {boolean} [data.isPrivate] - Updated privacy state
   * @returns {Promise<void>}
   */
  protected onChannelUpdated = async (data: { name?: string; description?: string; isPrivate?: boolean }): Promise<void> => {
    await this.handlers.handleChannelUpdated(this.channel().id, data);
  };

  /**
   * Leave the current channel for the authenticated user.
   * @description Emits channel-left only after handler-confirmed success so parent navigation reacts to committed membership changes.
   * @returns {Promise<void>}
   */
  onLeaveChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;
    const success = await this.handlers.handleLeaveChannel(this.channel().id, currentUserId);
    if (success) this.channelLeft.emit();
  };

  /**
   * Delete the current channel.
   * @description Requires both authenticated user and current channel snapshot so destructive actions run with explicit identity and naming context.
   * @returns {Promise<void>}
   */
  onDeleteChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();
    if (!currentUserId || !channelData) return;
    const deleted = await this.handlers.handleDeleteChannel(channelData.id, currentUserId, channelData.name);
    if (deleted) this.channelLeft.emit();
  };

  /**
   * Edit an existing channel message.
   * @description Uses channel-scoped message interaction service to keep edit permissions and persistence logic outside component UI code.
   * @protected
   * @param {Object} data - Edit payload
   * @param {string} data.messageId - Target message ID
   * @param {string} data.newContent - Updated message content
   * @returns {Promise<void>}
   */
  protected onMessageEdited = async (data: { messageId: string; newContent: string }): Promise<void> => {
    await this.channelMessageInteraction.editMessage(this.channel().id, data.messageId, data.newContent);
  };

  /**
   * Delete a channel message.
   * @description Funnels message deletion through one interaction boundary so delete side effects remain consistent with other message actions.
   * @protected
   * @param {string} messageId - Message ID to delete
   * @returns {Promise<void>}
   */
  protected onMessageDeleted = async (messageId: string): Promise<void> => {
    await this.channelMessageInteraction.deleteMessage(this.channel().id, messageId);
  };

  /**
   * Open thread view for a selected message.
   * @description Transforms channel message shape into thread-parent shape before emitting so thread consumers stay decoupled from channel-specific models.
   * @protected
   * @param {string} messageId - Parent message ID
   * @returns {void}
   */
  protected onThreadClick = (messageId: string): void => {
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (parentMessage) {
      const message = this.userTransformation.channelMessageToThreadMessage(parentMessage);
      this.threadRequested.emit({ messageId, parentMessage: message });
    }
  };

  /**
   * Join a mentioned channel from channel preview.
   * @description Emits mention navigation only after successful join to ensure downstream navigation always targets an accessible channel.
   * @protected
   * @param {string} channelId - Target channel ID
   * @returns {Promise<void>}
   */
  protected onChannelViewJoin = async (channelId: string): Promise<void> => {
    if (await this.channelViewService.joinChannel(channelId)) {
      this.channelMentionRequested.emit(channelId);
    }
  };
}
