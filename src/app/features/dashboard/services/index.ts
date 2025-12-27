/**
 * @fileoverview Dashboard Services Barrel Export
 * @description Central export point for all dashboard services
 * @module features/dashboard/services
 */

export { DummyUsersService, type DummyUser } from './dummy-users.service';
export { DummyChannelsService, type DummyChannel } from './dummy-channels.service';
export {
  DummyChatDmService,
  type DummyDirectMessage,
  type DummyDMMessage,
} from './dummy-chat-dm.service';
