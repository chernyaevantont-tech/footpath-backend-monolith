import * as neo4j from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const Neo4jProvider = {
  provide: 'NEO4J_DRIVER',
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('Neo4jProvider');

    const neo4jUri = configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
    const neo4jUsername = configService.get<string>('NEO4J_USERNAME') || 'neo4j';
    const neo4jPassword = configService.get<string>('NEO4J_PASSWORD') || 'password';

    const driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUsername, neo4jPassword),
      {
        // Disable encryption for local development
        encrypted: 'ENCRYPTION_OFF',
        // Connection pool configuration
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
        maxTransactionRetryTime: 30 * 1000, // 30 seconds
        // Retry on connection failure
        connectionTimeout: 30000, // 30 seconds
      }
    );

    // Test connection during initialization but don't throw on first failure
    // as Neo4j might take longer to start than PostgreSQL
    try {
      await driver.verifyConnectivity();
      logger.log('Connected to Neo4j database');
    } catch (error) {
      logger.warn('Could not connect to Neo4j database during initialization. Will retry on first use.', error);
      // Don't throw, let the app continue but log a warning
    }

    return driver;
  },
  inject: [ConfigService],
};