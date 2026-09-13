import { CaseServices } from './case.service';
import { Case } from './case.model';
import { User } from '../user/user.model';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import { DocumentModel } from '../document/document.model';
import { ActivityService } from '../activity/activity.service';
import AppError from '../../errors/appError';

// Mock dependencies
jest.mock('./case.model');
jest.mock('../user/user.model');
jest.mock('../caseAccess/caseAccess.model');
jest.mock('../document/document.model');
jest.mock('../activity/activity.service', () => ({
  ActivityService: {
    logActivity: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('./case.utils', () => ({
  generateCaseId: jest.fn().mockResolvedValue('CS-2024-0001'),
}));

describe('Case Service', () => {
  const mockUserId = 'CL-2024-0001';
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    id: mockUserId,
    email: 'test@example.com',
    fullName: 'Test User',
  };

  const mockCasePayload = {
    title: 'State v. Smith',
    caseNumber: 'CR-2024-892',
    caseType: 'Criminal Defense',
    urgency: 'high' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (CaseAccessModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    (ActivityService.logActivity as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createCase', () => {
    it('should create a new case successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.create as jest.Mock).mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        id: 'CS-2024-0001',
        ...mockCasePayload,
      });
      (Case.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          id: 'CS-2024-0001',
          ...mockCasePayload,
          createdBy: mockUser,
        }),
      });

      const result = await CaseServices.createCase(mockUserId, mockCasePayload);

      expect(User.findOne).toHaveBeenCalledWith({ id: mockUserId });
      expect(Case.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'CS-2024-0001');
    });

    it('should throw error if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CaseServices.createCase(mockUserId, mockCasePayload),
      ).rejects.toThrow(AppError);
    });
  });

  describe('getAllCases', () => {
    it('should return paginated cases', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          { id: 'CS-2024-0001', title: 'Case 1' },
        ]),
      });
      (Case.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await CaseServices.getAllCases(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.total).toBe(1);
    });

    it('should preserve access scope when search is provided', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });
      (Case.countDocuments as jest.Mock).mockResolvedValue(0);

      await CaseServices.getAllCases(mockUserId, {
        search: 'State',
        page: 1,
        limit: 10,
      });

      const calledFilter = (Case.find as jest.Mock).mock.calls[0][0];
      expect(calledFilter.$and).toBeDefined();
      expect(calledFilter.$and[0].$or).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ createdBy: mockUser._id }),
        ]),
      );
    });
  });

  describe('getCaseById', () => {
    it('should return case if user owns it', async () => {
      const mockCase = {
        id: 'CS-2024-0001',
        title: 'Test Case',
        createdBy: mockUser,
        toObject: jest.fn().mockReturnValue({
          id: 'CS-2024-0001',
          title: 'Test Case',
          createdBy: mockUser,
        }),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCase),
      });
      (DocumentModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CaseServices.getCaseById('CS-2024-0001', mockUserId);

      expect(result).toHaveProperty('id', 'CS-2024-0001');
    });

    it('should throw error if case not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      (DocumentModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      await expect(
        CaseServices.getCaseById('CS-2024-0001', mockUserId),
      ).rejects.toThrow(AppError);
    });

    it('should allow access for users with shared case access', async () => {
      const owner = { _id: '507f1f77bcf86cd799439099' };
      const mockCase = {
        _id: '507f1f77bcf86cd799439012',
        id: 'CS-2024-0001',
        title: 'Shared Case',
        createdBy: owner,
        clientId: null,
        toObject: jest.fn().mockReturnValue({
          id: 'CS-2024-0001',
          title: 'Shared Case',
          createdBy: owner,
        }),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCase),
      });
      (CaseAccessModel.exists as jest.Mock).mockResolvedValue(true);
      (DocumentModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await CaseServices.getCaseById('CS-2024-0001', mockUserId);
      expect(result).toHaveProperty('id', 'CS-2024-0001');
    });
  });

  describe('updateCase', () => {
    it('should update case if user owns it', async () => {
      const mockCase = {
        id: 'CS-2024-0001',
        createdBy: mockUser._id,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(mockCase);
      (Case.findOneAndUpdate as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockCase,
          status: 'review',
        }),
      });

      const result = await CaseServices.updateCase('CS-2024-0001', mockUserId, {
        status: 'review',
      });

      expect(result).toHaveProperty('status', 'review');
    });
  });

  describe('deleteCase', () => {
    it('should soft delete case if user owns it', async () => {
      const mockCase = {
        id: 'CS-2024-0001',
        createdBy: mockUser._id,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(mockCase);
      (Case.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockCase,
        isDeleted: true,
      });

      const result = await CaseServices.deleteCase('CS-2024-0001', mockUserId);

      expect(result).toHaveProperty('message', 'Case deleted successfully');
    });
  });
});
