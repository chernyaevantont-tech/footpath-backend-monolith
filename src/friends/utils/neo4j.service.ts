import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as neo4j from 'neo4j-driver';

@Injectable()
export class Neo4jService {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: neo4j.Driver;

  constructor(private configService: ConfigService) {
    const neo4jUri = this.configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
    const neo4jUsername = this.configService.get<string>('NEO4J_USERNAME') || 'neo4j';
    const neo4jPassword = this.configService.get<string>('NEO4J_PASSWORD') || 'password';

    this.driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUsername, neo4jPassword), {
      // Disable encryption for local development
      encrypted: 'ENCRYPTION_OFF',
    });
  }

  getClient(): neo4j.Driver {
    return this.driver;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.driver.verifyAuthentication();
      return true;
    } catch (error) {
      this.logger.error(`Neo4j connection test failed: ${error.message}`);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}