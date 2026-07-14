import { lazyModel } from '../config/database.js';
import { getModel } from './registry.js';
export default lazyModel(() => getModel('AssociationHistory'));
