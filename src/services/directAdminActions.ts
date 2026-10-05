import { apiMutation } from './api';
type ActorParams = { actorUserId?: number; actorUsername?: string };
export function createTreeDirect({ categoryId, troncoUserId }: { categoryId: number; troncoUserId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'create_tree', params: { categoryId, troncoUserId } });
}
export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername: string; firstName: string; lastName: string; password: string } & ActorParams) {
  return apiMutation('/admin/users', { indicadorUsername, firstName, lastName, password });
}
export function archiveTreeDirect({ treeId, reason }: { treeId: number; reason?: string } & ActorParams) {
  return apiMutation('/actions', { action: 'archive_tree', params: { treeId, reason } });
}
export function assignPositionDirect({ treeId, positionIndex, userId }: { treeId: number; positionIndex: number; userId: number } & ActorParams) {
  return apiMutation('/actions', { action: 'assign_tree_position', params: { treeId, positionIndex, userId } });
}
export function clearPositionDirect({ treeId, positionIndex }: { treeId: number; positionIndex: number } & ActorParams) {
  return apiMutation('/actions', { action: 'clear_tree_position', params: { treeId, positionIndex } });
}
