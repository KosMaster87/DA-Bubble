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
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { MembersMiniatureComponent } from '@shared/dashboard-components/members-miniatures/members-miniatures.component';
import { AddMemberButtonComponent } from '@shared/dashboard-components/add-member-button/add-member-button.component';
import { MembersOptionsMenuComponent } from '@shared/dashboard-components/members-options-menu/members-options-menu.component';
import {
  ProfileViewComponent,
  ProfileUser,
} from '@shared/dashboard-components/profile-view/profile-view.component';
import {
  ProfileEditComponent,
  EditProfileUser,
} from '@shared/dashboard-components/profile-edit/profile-edit.component';
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
  threadRequested = output<{ messageId: string; parentMessage: Message }>();
  channelLeft = output<void>();
  directMessageRequested = output<string>(); // Emits userId to start DM with
  channel = input.required<ChannelInfo>();
  private channelId = computed(() => this.channel().id);
  private isJoiningChannel = signal<boolean>(false);

  /**
   * Check if current user is member of this channel
   */
  protected isMember = this.channelData.isUserMember(this.channelId);

  /**
   * Check if current user is channel owner
   */
  protected isChannelOwner = computed(() => {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.currentChannelData();
    return currentUserId && channelData ? currentUserId === channelData.createdBy : false;
  });

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
      });
    });
  };

  /**
   * Current channel data from store (reactive to Firestore changes)
   */
  protected currentChannelData = computed(() => {
    const ch = this.channel();
    return this.channelStore.getChannelById()(ch.id);
  });

  /**
   * Check if current user is admin
   * TODO: Implement admin role in User model
   */
  protected isCurrentUserAdmin = computed(() => {
    // User model doesn't have isAdmin field yet
    return false;
  });

  /**
   * Check if current user is the channel owner
   */
  protected isCurrentUserChannelOwner = this.channelData.isCurrentUserOwner(this.channelId);

  /**
   * Check if selected user is the channel owner
   */
  protected isSelectedUserChannelOwner = computed(() => {
    const channelData = this.currentChannelData();
    const selectedUserId = this.channelConversationUI.getSelectedMemberId()();
    return channelData?.createdBy === selectedUserId;
  });

  /**
   * Check if viewing own profile
   */
  protected isOwnProfile = computed(() => {
    return this.channelConversationUI.getSelectedMemberId()() === this.authStore.user()?.uid;
  });

  /**
   * Selected member for edit profile
   */
  protected editProfileUser = computed<EditProfileUser | null>(() => {
    return this.userTransformation.toEditProfileUser(
      this.channelConversationUI.getSelectedMemberId()()
    );
  });

  /**
   * Channel info data for channel-info component
   */
  protected channelInfo = this.channelData.getChannelInfoData(this.channel);

  /**
   * Channel members from channel's memberIds
   */
  protected members = this.channelData.getChannelMembers(this.channelId);

  /**
   * Available users that are NOT yet members of this channel
   */
  protected availableUsers = this.channelData.getAvailableUsers(this.channelId);

  /**
   * Total member count
   */
  protected totalMemberCount = computed(() => this.members().length);

  /**
   * Get selected member as ProfileUser
   */
  protected selectedMember = computed<ProfileUser | null>(() => {
    return this.userTransformation.toProfileUser(
      this.channelConversationUI.getSelectedMemberId()()
    );
  });

  /**
   * Real channel messages from ChannelMessageStore
   */
  protected messages = computed<ChannelMessage[]>(() => {
    const channelId = this.channel().id;
    const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
    return this.userTransformation.channelMessagesToViewMessages(rawMessages);
  });

  /** Send message to channel */
  sendMessage = async (content: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    const channelId = this.channel().id;
    await this.channelMessageInteraction.sendMessage(channelId, content, currentUserId);
    this.unreadService.markAsRead(channelId);
  };

  /** Group messages by date */
  protected messagesGroupedByDate = computed<MessageGroup[]>(() => {
    return this.messageGrouping.groupMessagesByDate(this.messages());
  });

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
    const channel = this.channelStore.getChannelById()(this.channel().id);
    const currentUser = this.authStore.user();

    if (!channel || !currentUser) {
      console.error('❌ Channel or current user not found');
      return;
    }

    await this.channelMembership.sendInvitations(
      channel.id,
      userIds,
      currentUser.uid,
      currentUser.displayName,
      channel.name
    );
    console.log('✉️ Sent invitations to:', userIds.length, 'users');
    this.channelConversationUI.closeAddMembers();
  };

  /** Handle channel accepted (user joined from access screen) */
  protected onChannelAccepted = async (channelId: string): Promise<void> => {
    console.log('✅ User accepted channel rules:', channelId);
    console.log('✅ User accepted channel rules and joining:', channelId);
    this.isJoiningChannel.set(true);

    try {
      await this.channelMembership.joinChannelAndWaitForSync(channelId);
      this.isJoiningChannel.set(false);
      console.log('✅ Join complete - access screen hidden');
    } catch (error) {
      console.error('❌ Error joining channel:', error);
      this.isJoiningChannel.set(false);
    }
  };

  /** Handle remove member from channel */
  protected onRemoveMember = async (): Promise<void> => {
    const memberId = this.channelConversationUI.getSelectedMemberId()();
    if (!memberId) return;

    await this.channelMembership.removeMember(this.channel().id, memberId);
    this.channelConversationUI.closeProfileView();
  };

  /** Handle edit profile save */
  protected onEditProfileSave = async (data: {
    displayName: string;
    isAdmin: boolean;
  }): Promise<void> => {
    const userId = this.channelConversationUI.getSelectedMemberId()();
    if (!userId) return;

    try {
      await this.profileManagement.updateUserProfile(userId, data);
      console.log('✅ User profile updated:', data);
      this.channelConversationUI.closeEditProfile();
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
    }
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
    await this.channelMembership.updateChannelInfo(this.channel().id, data);
  };

  /** Handle leave channel clicked */
  onLeaveChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    try {
      await this.channelMembership.leaveChannel(this.channel().id, currentUserId);
      this.channelLeft.emit();
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
    }
  };

  /** Handle delete channel clicked */
  onDeleteChannel = async (): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    const channelData = this.channel();
    if (!currentUserId || !channelData) return;

    const deleted = await this.channelMembership.deleteChannel(
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
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (!parentMessage) return;

    const message = this.userTransformation.channelMessageToThreadMessage(parentMessage);
    this.threadRequested.emit({ messageId, parentMessage: message });
  };
}
