const OperationLog = require('../models/OperationLog');

/**
 * Utility to log user operations in the system
 * 
 * @param {Object} params
 * @param {string} params.user_id - ID of the user performing the action
 * @param {string} params.workspace_id - ID of the workspace where the action occurred
 * @param {string} params.action - The action performed (e.g., 'CREATE', 'DELETE', 'LOGIN')
 * @param {string} [params.entity] - The entity affected (e.g., 'Invoice', 'User')
 * @param {string} [params.entity_id] - ID of the affected entity
 * @param {string} [params.ip_address] - IP address of the user
 * @param {Object} [params.payload] - Additional details in JSON format
 */
const logOperation = async ({
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
      entity_id,
      ip_address,
      payload
    });
  } catch (error) {
    console.error('Failed to create operation log:', error);
  }
};

module.exports = {
  logOperation
};
