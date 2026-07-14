import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';

let sequelize = null;

export function getSequelize() {
  if (!sequelize) {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'nexflow_db',
      process.env.DB_USER || 'nexflow_user',
      process.env.DB_PASS || 'nexflow_password',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        dialect: process.env.DB_DIALECT || 'mysql',
        dialectModule: mysql2,
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      }
    );
  }
  return sequelize;
}

export function lazyModel(initFn) {
  let model = null;
  const handler = {
    apply(_, thisArg, args) {
      if (!model) model = initFn();
      return Reflect.apply(model, thisArg, args);
    },
    construct(_, args) {
      if (!model) model = initFn();
      return Reflect.construct(model, args);
    },
    get(_, prop) {
      if (!model) model = initFn();
      return model[prop];
    },
    set(_, prop, value) {
      if (!model) model = initFn();
      model[prop] = value;
      return true;
    },
    has(_, prop) {
      if (!model) model = initFn();
      return prop in model;
    },
  };
  return new Proxy(function () {}, handler);
}

export default sequelize;
