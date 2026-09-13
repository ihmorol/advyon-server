import { DocumentServices } from './document.service';
import { DocumentModel } from './document.model';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';
import { CaseAccessModel } from '../caseAccess/caseAccess.model';
import { cloudinaryUpload } from '../../config/cloudinary.config';
import { ActivityService } from '../activity/activity.service';
import AppError from '../../errors/appError';

// Mock dependencies
jest.mock('./document.model');
jest.mock('../user/user.model');
jest.mock('../case/case.model');
jest.mock('../caseAccess/caseAccess.model');
jest.mock('../../config/cloudinary.config');
jest.mock('../activity/activity.service', () => ({
  ActivityService: {
    logActivity: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('./document.utils', () => ({
  generateDocumentId: jest.fn().mockResolvedValue('DOC-0001'),
}));

describe('Document Service', () => {
  const mockUserId = 'CL-2024-0001';
  const mockCaseId = 'CS-2024-0001';
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    id: mockUserId,
    email: 'test@example.com',
    fullName: 'Test User',
  };

  const mockCase = {
    _id: '507f1f77bcf86cd799439012',
    id: mockCaseId,
    title: 'Test Case',
    createdBy: mockUser._id,
  };

  const mockFile = {
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024000,
    path: 'https://cloudinary.com/test.pdf',
    filename: 'advyon/cases/CS-2024-0001/Evidence/test-document',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (ActivityService.logActivity as jest.Mock).mockResolvedValue(undefined);
    (CaseAccessModel.exists as jest.Mock).mockResolvedValue(false);
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(mockCase);
      (DocumentModel.create as jest.Mock).mockResolvedValue({
        _id: '507f1f77bcf86cd799439013',
        id: 'DOC-0001',
      });
      (DocumentModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            id: 'DOC-0001',
            fileName: 'test-document.pdf',
            cloudinaryUrl: mockFile.path,
          }),
        }),
      });

      const result = await DocumentServices.uploadDocument(
        mockCaseId,
        mockUserId,
        mockFile,
        'Evidence',
      );

      expect(User.findOne).toHaveBeenCalledWith({ id: mockUserId });
      expect(Case.findOne).toHaveBeenCalledWith({ id: mockCaseId });
      expect(DocumentModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'DOC-0001');
    });

    it('should throw error if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DocumentServices.uploadDocument(mockCaseId, mockUserId, mockFile, 'Evidence'),
      ).rejects.toThrow(AppError);
    });

    it('should throw error if case not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DocumentServices.uploadDocument(mockCaseId, mockUserId, mockFile, 'Evidence'),
      ).rejects.toThrow(AppError);
    });

    it('should throw error if user does not own case', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue({
        ...mockCase,
        createdBy: 'different-user-id',
      });

      await expect(
        DocumentServices.uploadDocument(mockCaseId, mockUserId, mockFile, 'Evidence'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('getDocumentsByCase', () => {
    it('should return documents grouped by folder', async () => {
      const mockDocuments = [
        {
          id: 'DOC-0001',
          folderName: 'Evidence',
          fileName: 'doc1.pdf',
          cloudinaryPublicId: 'public-doc-1',
          toObject: jest.fn().mockReturnValue({
            id: 'DOC-0001',
            folderName: 'Evidence',
            fileName: 'doc1.pdf',
            cloudinaryPublicId: 'public-doc-1',
          }),
        },
        {
          id: 'DOC-0002',
          folderName: 'Evidence',
          fileName: 'doc2.pdf',
          cloudinaryPublicId: 'public-doc-2',
          toObject: jest.fn().mockReturnValue({
            id: 'DOC-0002',
            folderName: 'Evidence',
            fileName: 'doc2.pdf',
            cloudinaryPublicId: 'public-doc-2',
          }),
        },
        {
          id: 'DOC-0003',
          folderName: 'Legal Documents',
          fileName: 'doc3.pdf',
          cloudinaryPublicId: 'public-doc-3',
          toObject: jest.fn().mockReturnValue({
            id: 'DOC-0003',
            folderName: 'Legal Documents',
            fileName: 'doc3.pdf',
            cloudinaryPublicId: 'public-doc-3',
          }),
        },
      ];

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(mockCase);
      (DocumentModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockDocuments),
      });

      const result = await DocumentServices.getDocumentsByCase(
        mockCaseId,
        mockUserId,
        {},
      );

      expect(result.documents).toHaveLength(3);
      expect(result.groupedByFolder).toHaveProperty('Evidence');
      expect(result.groupedByFolder['Evidence']).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from Cloudinary and database', async () => {
      const mockDocument = {
        _id: '507f1f77bcf86cd799439013',
        id: 'DOC-0001',
        caseId: mockCase._id,
        cloudinaryPublicId: 'test-public-id',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (Case.findOne as jest.Mock).mockResolvedValue(mockCase);
      (DocumentModel.findOne as jest.Mock).mockResolvedValue(mockDocument);
      (cloudinaryUpload.uploader.destroy as jest.Mock).mockResolvedValue({});
      (DocumentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockDocument);

      const result = await DocumentServices.deleteDocument(
        'DOC-0001',
        mockCaseId,
        mockUserId,
      );

      expect(DocumentModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Document deleted successfully');
    });
  });
});
