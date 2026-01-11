/**
 * @fileoverview Channel Conversation State Service
 * @description Manages computed state for channel conversation component
 * @module core/services/channel-conversation-state
 */

import { Injectable, inject, computed, Signal } from '@angular/core';
import { AuthStore } from '@stores/auth';
import { ChannelStore, ChannelMessageStore } from '@stores/index';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { MessageGroupingService } from '@core/services/message-grouping/message-grouping.service';
import { ChannelConversationUIService } from '@core/services/channel-conversation-ui/channel-conversation-ui.service';
import { ChannelDataService, type ChannelInfo } from '@core/services/channel-data/channel-data.service';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { MessageGroup } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Injectable({ providedIn: 'root' })
export class ChannelConversationStateService {
  private authStore = inject(AuthStore);
  private channelStore = inject(ChannelStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private userTransformation = inject(UserTransformationService);
  private messageGrouping = inject(MessageGroupingService);
  private channelConversationUI = inject(ChannelConversationUIService);
  private channelData = inject(ChannelDataService);

  /**
   * Get current channel data from store
   */
  getCurrentChannelData = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const ch = channel();
      return this.channelStore.getChannelById()(ch.id);
    });
  };

  /**
   * Check if current user is channel owner
   */
  getIsChannelOwner = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const currentUserId = this.authStore.user()?.uid;
      const channelData = this.channelStore.getChannelById()(channel().id);
      return currentUserId && channelData ? currentUserId === channelData.createdBy : false;
    });
  };

  /**
   * Get selected user channel owner status
   */
  getIsSelectedUserChannelOwner = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelData = this.channelStore.getChannelById()(channel().id);
      const selectedUserId = this.channelConversationUI.getSelectedMemberId()();
      return channelData?.createdBy === selectedUserId;
    });
  };

  /**
   * Check if viewing own profile
   */
  getIsOwnProfile = () => {
    return computed(() => {
      return this.channelConversationUI.getSelectedMemberId()() === this.authStore.user()?.uid;
    });
  };

  /**
   * Get edit profile user
   */
  getEditProfileUser = (): Signal<EditProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toEditProfileUser(
        this.channelConversationUI.getSelectedMemberId()()
      );
    });
  };

  /**
   * Get selected member as ProfileUser
   */
  getSelectedMember = (): Signal<ProfileUser | null> => {
    return computed(() => {
      return this.userTransformation.toProfileUser(
        this.channelConversationUI.getSelectedMemberId()()
      );
    });
  };

  /**
   * Get channel messages transformed for view
   */
  getMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
      return this.userTransformation.channelMessagesToViewMessages(rawMessages);
    });
  };

  /**
   * Get messages grouped by date
   */
  getMessagesGroupedByDate = (channel: Signal<ChannelInfo>) => {
    return computed<MessageGroup[]>(() => {
      const channelId = channel().id;
      const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
      const messages = this.userTransformation.channelMessagesToViewMessages(rawMessages);
      return this.messageGrouping.groupMessagesByDate(messages);
    });
  };

  /**
   * Check if has more messages
   */
  getHasMoreMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      return this.channelMessageStore.hasMoreMessages()[channelId] ?? false;
    });
  };

  /**
   * Check if loading older messages
   */
  getLoadingOlderMessages = (channel: Signal<ChannelInfo>) => {
    return computed(() => {
      const channelId = channel().id;
      return this.channelMessageStore.loadingOlderMessages()[channelId] ?? false;
    });
  };
}
