import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { RecommendationsController } from '../../src/recommendations/recommendations.controller';
import { RecommendationsService } from '../../src/recommendations/recommendations.service';
import { Place, PlaceStatus } from '../../src/places/entities/place.entity';
import { GetPlaceRecommendationsDto, GetPathRecommendationsDto } from '../../src/recommendations/dto/recommendation.dto';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  const mockRecommendationsService = {
    getRecommendedPlaces: jest.fn(),
    getRecommendedPaths: jest.fn(),
    generateEmbeddingsForAllPlaces: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPlaceRecommendations', () => {
    it('should return place recommendations for the authenticated user', async () => {
      const userId = 'user-1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const query: GetPlaceRecommendationsDto = { limit: 10 };
      const mockPlaces: Place[] = [
        {
          id: 'place-1',
          name: 'Test Place',
          description: 'Test',
          coordinates: '',
          tagIds: [],
          status: PlaceStatus.APPROVED,
          createdAt: new Date(),
          updatedAt: new Date(),
          moderatorId: null,
          moderator: undefined,
          moderationLogs: [],
        },
      ];

      (service.getRecommendedPlaces as jest.Mock).mockResolvedValue(mockPlaces);

      const result = await controller.getPlaceRecommendations(mockRequest, query);

      expect(service.getRecommendedPlaces).toHaveBeenCalledWith(userId, query);
      expect(result).toEqual(mockPlaces);
    });

    it('should handle case when query userId differs from authenticated user', async () => {
      const authenticatedUserId = 'user-1';
      const queryUserId = 'user-2';
      const mockRequest = {
        user: { userId: authenticatedUserId },
      } as Request & { user: { userId: string } };

      const query: GetPlaceRecommendationsDto = { userId: queryUserId, limit: 10 };
      const mockPlaces: Place[] = [
        {
          id: 'place-1',
          name: 'Test Place',
          description: 'Test',
          coordinates: '',
          tagIds: [],
          status: PlaceStatus.APPROVED,
          createdAt: new Date(),
          updatedAt: new Date(),
          moderatorId: null,
          moderator: undefined,
          moderationLogs: [],
        },
      ];

      (service.getRecommendedPlaces as jest.Mock).mockResolvedValue(mockPlaces);

      const result = await controller.getPlaceRecommendations(mockRequest, query);

      expect(service.getRecommendedPlaces).toHaveBeenCalledWith(queryUserId, query);
      expect(result).toEqual(mockPlaces);
    });
  });

  describe('getPathRecommendations', () => {
    it('should return path recommendations for the authenticated user', async () => {
      const userId = 'user-1';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const query: GetPathRecommendationsDto = { limit: 5 };
      const mockPaths = [{ id: 'path-1', name: 'Test Path' }];

      (service.getRecommendedPaths as jest.Mock).mockResolvedValue(mockPaths);

      const result = await controller.getPathRecommendations(mockRequest, query);

      expect(service.getRecommendedPaths).toHaveBeenCalledWith(userId, query);
      expect(result).toEqual(mockPaths);
    });
  });

  describe('generateAllEmbeddings', () => {
    it('should trigger generation of embeddings for all places', async () => {
      const userId = 'user-1';
      const mockRequest = {
        user: { userId, role: 'admin' },
      } as Request & { user: { userId: string, role: string } };

      const processedCount = 25;
      (service.generateEmbeddingsForAllPlaces as jest.Mock).mockResolvedValue(processedCount);

      const result = await controller.generateAllEmbeddings(mockRequest);

      expect(service.generateEmbeddingsForAllPlaces).toHaveBeenCalled();
      expect(result).toEqual({ processed: processedCount });
    });

    it('should work even if user is not admin', async () => {
      const userId = 'user-1';
      const mockRequest = {
        user: { userId, role: 'user' },
      } as Request & { user: { userId: string, role: string } };

      const processedCount = 15;
      (service.generateEmbeddingsForAllPlaces as jest.Mock).mockResolvedValue(processedCount);

      const result = await controller.generateAllEmbeddings(mockRequest);

      // The service should still be called regardless of user role
      expect(service.generateEmbeddingsForAllPlaces).toHaveBeenCalled();
      expect(result).toEqual({ processed: processedCount });
    });
  });
});