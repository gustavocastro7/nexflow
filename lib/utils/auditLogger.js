import OperationLog from '../models/OperationLog.js';

/** @param {{ user_id: any; workspace_id: any; action: any; entity: any; entity_id?: any; ip_address: any; payload: any }} params */
export const logOperation = async ({
  user_id,
  workspace_id,
  action,
  entity,
  entity_id,
  ip_address,
  payload
}) => {
  try {
    await OperationLog.create({
      user_id,
      workspace_id,
      action,
      entity,
      entity_id: entity_id ?? null,
      ip_address,
      payload
    });
  } catch (error) {
    console.error('Failed to create operation log:', error);
  }
};
