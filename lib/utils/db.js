/**
 * @returns {Promise<[any, boolean]>}
 */
export async function findOrCreate(Model, where, defaults = {}) {
  const existing = await Model.findOne(where);
  if (existing) return /** @type {[any, boolean]} */ ([existing, false]);
  const created = await Model.create({ ...where, ...defaults });
  return /** @type {[any, boolean]} */ ([created, true]);
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
