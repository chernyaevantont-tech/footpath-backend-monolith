import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PathsController } from '../../src/paths/paths.controller';
import { PathsService } from '../../src/paths/paths.service';
import { CreatePathDto } from '../../src/paths/dto/create-path.dto';
import { UpdatePathDto } from '../../src/paths/dto/update-path.dto';
import { GeneratePathDto } from '../../src/paths/dto/generate-path.dto';
import { PathFilterDto } from '../../src/paths/dto/path-filter.dto';
import { Path, PathStatus } from '../../src/paths/entities/path.entity';

describe('PathsController', () => {
  let controller: PathsController;
  let service: PathsService;

  const mockPathsService = {
    createPath: jest.fn(),
    findPaths: jest.fn(),
    getPathById: jest.fn(),
    updatePath: jest.fn(),
    deletePath: jest.fn(),
    generatePath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PathsController],
      providers: [
        {
          provide: PathsService,
          useValue: mockPathsService,
        },
      ],
    }).compile();

    controller = module.get<PathsController>(PathsController);
    service = module.get<PathsService>(PathsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPath', () => {
    it('should create a path', async () => {
      const createPathDto: CreatePathDto = {
        name: 'Test Path',
        description: 'A test path',
        places: [
          { placeId: 'place1', order: 0, timeAtPlace: 60 },
          { placeId: 'place2', order: 1, timeAtPlace: 90 },
        ],
      };

      const mockResult = { id: 'path1', name: 'Test Path' } as Path;

      jest.spyOn(service, 'createPath').mockResolvedValue(mockResult);

      const result = await controller.createPath(createPathDto);

      expect(service.createPath).toHaveBeenCalledWith(createPathDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('generatePath', () => {
    it('should generate a path', async () => {
      const generatePathDto: GeneratePathDto = {
        startPlaceId: 'place1',
        endPlaceId: 'place2',
        tags: ['nature'],
        maxDuration: 120,
      };

      const mockResult = { id: 'path1', name: 'Generated Path' } as Path;

      jest.spyOn(service, 'generatePath').mockResolvedValue(mockResult);

      const result = await controller.generatePath(generatePathDto);

      expect(service.generatePath).toHaveBeenCalledWith(generatePathDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findPaths', () => {
    it('should find paths with filters', async () => {
      const pathFilterDto: PathFilterDto = {
        name: 'Test',
        status: 'published' as PathStatus,
      };

      const mockResult = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, pages: 0 },
      };

      jest.spyOn(service, 'findPaths').mockResolvedValue(mockResult);

      const result = await controller.findPaths(pathFilterDto);

      expect(service.findPaths).toHaveBeenCalledWith(pathFilterDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPath', () => {
    it('should get a path by ID', async () => {
      const mockPath = { id: 'path1', name: 'Test Path' } as Path;

      jest.spyOn(service, 'getPathById').mockResolvedValue(mockPath);

      const result = await controller.getPath('path1');

      expect(service.getPathById).toHaveBeenCalledWith('path1');
      expect(result).toEqual(mockPath);
    });
  });

  describe('updatePath', () => {
    it('should update a path', async () => {
      const updatePathDto: UpdatePathDto = {
        name: 'Updated Name',
      };

      const mockResult = { id: 'path1', name: 'Updated Name' } as Path;

      jest.spyOn(service, 'updatePath').mockResolvedValue(mockResult);

      const result = await controller.updatePath('path1', updatePathDto);

      expect(service.updatePath).toHaveBeenCalledWith('path1', updatePathDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('deletePath', () => {
    it('should delete a path', async () => {
      const mockResult = { message: 'Path deleted successfully', id: 'path1' };

      jest.spyOn(service, 'deletePath').mockResolvedValue(mockResult);

      const result = await controller.deletePath('path1');

      expect(service.deletePath).toHaveBeenCalledWith('path1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('error handling', () => {
    it('should handle service errors in createPath', async () => {
      const createPathDto: CreatePathDto = { name: 'Test Path', places: [] };
      const error = new BadRequestException('Test error');

      jest.spyOn(service, 'createPath').mockRejectedValue(error);

      await expect(controller.createPath(createPathDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors in generatePath', async () => {
      const generatePathDto: GeneratePathDto = {};
      const error = new NotFoundException('Test error');

      jest.spyOn(service, 'generatePath').mockRejectedValue(error);

      await expect(controller.generatePath(generatePathDto)).rejects.toThrow(NotFoundException);
    });
  });
});