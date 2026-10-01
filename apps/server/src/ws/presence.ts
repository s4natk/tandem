import type { PresenceUser } from "@collab/shared";
import type Redis from "ioredis";
import { redisApp } from "../redis/client.js";

/**
 * Presence store backed by Redis.
 *
 * Two structures per room:
 *   - presence:room:{roomId} : hash of socketId -> JSON(PresenceUser)
 *   - presence:user:{userId} : set of socketIds (so we know when the last
 *                              tab for a user disconnects)
 *
 * Entries are also given a soft TTL so abandoned sockets eventually get
 * cleaned up if the server crashes before emitting a clean disconnect.
 */

const ROOM_TTL_SECONDS = 60 * 60 * 6; // 6h

const roomKey = (roomId: string) => `presence:room:${roomId}`;
const userKey = (userId: string) => `presence:user:${userId}`;

export interface PresenceStore {
  add(roomId: string, user: PresenceUser): Promise<PresenceUser[]>;
  remove(roomId: string, socketId: string): Promise<PresenceUser | null>;
  removeBySocket(socketId: string): Promise<{ roomId: string; user: PresenceUser } | null>;
  list(roomId: string): Promise<PresenceUser[]>;
  updateActiveCard(
    roomId: string,
    socketId: string,
    cardId: string | null,
  ): Promise<PresenceUser | null>;
}

class RedisPresenceStore implements PresenceStore {
  constructor(private readonly redis: Redis) {}

  async add(roomId: string, user: PresenceUser): Promise<PresenceUser[]> {
    const pipeline = this.redis.multi();
    pipeline.hset(roomKey(roomId), user.socketId, JSON.stringify(user));
    pipeline.expire(roomKey(roomId), ROOM_TTL_SECONDS);
    pipeline.sadd(userKey(user.userId), `${roomId}::${user.socketId}`);
    pipeline.expire(userKey(user.userId), ROOM_TTL_SECONDS);
    await pipeline.exec();
    return this.list(roomId);
  }

  async remove(roomId: string, socketId: string): Promise<PresenceUser | null> {
    const raw = await this.redis.hget(roomKey(roomId), socketId);
    if (!raw) return null;
    const user = JSON.parse(raw) as PresenceUser;
    const pipeline = this.redis.multi();
    pipeline.hdel(roomKey(roomId), socketId);
    pipeline.srem(userKey(user.userId), `${roomId}::${socketId}`);
    await pipeline.exec();
    return user;
  }

  async removeBySocket(
    socketId: string,
  ): Promise<{ roomId: string; user: PresenceUser } | null> {
    // We don't track a global socket->room mapping; the gateway calls
    // remove() with the room id it knows. This method exists for tests.
    void socketId;
    return null;
  }

  async list(roomId: string): Promise<PresenceUser[]> {
    const map = await this.redis.hgetall(roomKey(roomId));
    return Object.values(map).map((v) => JSON.parse(v) as PresenceUser);
  }

  async updateActiveCard(
    roomId: string,
    socketId: string,
    cardId: string | null,
  ): Promise<PresenceUser | null> {
    const raw = await this.redis.hget(roomKey(roomId), socketId);
    if (!raw) return null;
    const user = JSON.parse(raw) as PresenceUser;
    user.activeCardId = cardId;
    await this.redis.hset(roomKey(roomId), socketId, JSON.stringify(user));
    return user;
  }
}

export const presenceStore: PresenceStore = new RedisPresenceStore(redisApp);
