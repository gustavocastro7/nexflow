import dns from 'node:dns';
import mongoose from 'mongoose';

// Windows reports stale IPv6 DNS servers (fec0:0:0:ffff::1/2/3) on some network
// adapters (Bluetooth, WSL, vEthernet). Node's resolver picks them up and fails
// the mongodb+srv:// SRV/TXT lookup with ECONNREFUSED, even though the OS resolver
// works fine. Pin known-good DNS servers so the SRV lookup doesn't hit those.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const globalForMongoose = globalThis;

if (!globalForMongoose._mongooseCache) {
  globalForMongoose._mongooseCache = { conn: null, promise: null };
}
const cache = globalForMongoose._mongooseCache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    mongoose.set('strictQuery', true);
    cache.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined,
      maxPoolSize: 10,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
