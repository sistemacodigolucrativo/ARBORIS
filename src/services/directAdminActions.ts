import { apiMutation } from './api';
type ActorParams = { actorUserId?: number; actorUsername?: string };
export function createTreeDirect({ categoryId, troncoUserId }: { categoryId: number; troncoUserId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'create_tree', params: { categoryId, troncoUserId } });
}
export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername?: string; firstName: string; lastName: string; password: string } & ActorParams) {
  return apiMutation('/admin/users', {
    firstName,
    lastName,
    password,
    ...(indicadorUsername?.trim() ? { indicadorUsername: indicadorUsername.trim() } : {})
  });
}
export function archiveTreeDirect({ treeId, reason }: { treeId: number; reason?: string } & ActorParams) {
  return apiMutation('/actions', { action: 'archive_tree', params: { treeId, reason } });
}
export function deleteTreeDirect({ treeId }: { treeId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'delete_tree', params: { treeId } });
}
export function deleteUserDirect({ userId }: { userId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'delete_user', params: { userId } });
}
export function updateTreeNicknameDirect({ treeId, nickname }: { treeId: number; nickname?: string } & ActorParams) {
  return apiMutation('/actions', { action: 'update_tree_nickname', params: { treeId, nickname } });
}
export function assignPositionDirect({ treeId, positionIndex, userId }: { treeId: number; positionIndex: number; userId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'assign_tree_position', params: { treeId, positionIndex, userId } });
}
export function clearPositionDirect({ treeId, positionIndex }: { treeId: number; positionIndex: number } & ActorParams) {
  return apiMutation('/actions', { action: 'clear_tree_position', params: { treeId, positionIndex } });
}
