import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { get } from 'http';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redisClient.get(key);
      return value;
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.redisClient.setEx(key, ttl, value);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.del(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async setJson(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setEx(key, ttl, stringValue);
      } else {
        await this.redisClient.set(key, stringValue);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SETJSON error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async getJson(key: string): Promise<any | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      this.logger.error(`Redis GETJSON error for key ${key}: ${error.message}`);
      return null;
    }
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }
}