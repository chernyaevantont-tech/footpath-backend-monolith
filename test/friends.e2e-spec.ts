import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';

describe('FriendsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get the DataSource instance
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    if (dataSource) {
      await dataSource.dropDatabase();
      await dataSource.synchronize(true);
    }

    // Register first user
    const registerResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'friends1@example.com',
        password: 'password123',
      });

    user1Token = registerResponse1.body.token;
    user1Id = registerResponse1.body.user.id;

    // Register second user
    const registerResponse2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'friends2@example.com',
        password: 'password123',
      });

    user2Token = registerResponse2.body.token;
    user2Id = registerResponse2.body.user.id;
  });

  it('/friends/requests (POST) - should send a friend request', () => {
    return request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        receiverId: user2Id,
      })
      .expect(201)
      .then(response => {
        expect(response.body.id).toBeDefined();
        expect(response.body.senderId).toBe(user1Id);
        expect(response.body.receiverId).toBe(user2Id);
        expect(response.body.status).toBe('pending');
      });
  });

  it('/friends/requests/:requestId/accept (POST) - should accept a friend request', async () => {
    // First, user1 sends a friend request to user2
    const sendRequest = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        receiverId: user2Id,
      });

    const requestId = sendRequest.body.id;

    // Then user2 accepts the friend request
    return request(app.getHttpServer())
      .post(`/friends/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        status: 'accepted',
      })
      .expect(200)
      .then(response => {
        expect(response.body.id).toBe(requestId);
        expect(response.body.status).toBe('accepted');
      });
  });

  it('/friends (GET) - should get list of friends', async () => {
    // First, create a friendship
    const sendRequest = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        receiverId: user2Id,
      });

    const requestId = sendRequest.body.id;

    await request(app.getHttpServer())
      .post(`/friends/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        status: 'accepted',
      });

    // Then get user1's friends
    return request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200)
      .then(response => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(user2Id);
      });
  });

  it('/friends/:userId (DELETE) - should remove a friend', async () => {
    // First, create a friendship
    const sendRequest = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        receiverId: user2Id,
      });

    const requestId = sendRequest.body.id;

    await request(app.getHttpServer())
      .post(`/friends/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        status: 'accepted',
      });

    // Then get user1's friends to confirm they exist
    await request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // Finally, remove the friend
    return request(app.getHttpServer())
      .delete(`/friends/${user2Id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
  });
});