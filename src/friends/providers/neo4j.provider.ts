import * as neo4j from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const Neo4jProvider = {
  provide: 'NEO4J_DRIVER',
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('Neo4jProvider');
    
    const neo4jUri = configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
    const neo4jUser = configService.get<string>('NEO4J_USER') || 'neo4j';
    const neo4jPassword = configService.get<string>('NEO4J_PASSWORD') || 'password';

    const driver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword),
      {
        // Connection pool configuration
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
        maxTransactionRetryTime: 30 * 1000, // 30 seconds
      }
    );

    // Test connection
    driver.verifyConnectivity().then(() => {
      logger.log('Connected to Neo4j database');
    }).catch(error => {
      logger.error('Failed to connect to Neo4j database', error);
    });

    return driver;
  },
  inject: [ConfigService],
};