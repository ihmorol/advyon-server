import { MetadataServices } from './metadata.service';
import { MetadataModel } from './metadata.model';
import AppError from '../../errors/appError';

jest.mock('./metadata.model', () => ({
  MetadataModel: {
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const mockedModel = MetadataModel as jest.Mocked<typeof MetadataModel>;

describe('MetadataServices', () => {
  const originalEnv = process.env.METADATA_DB_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.METADATA_DB_ENABLED = 'false';
  });

  afterAll(() => {
    process.env.METADATA_DB_ENABLED = originalEnv;
  });

  it('returns seeded metadata when DB is disabled', async () => {
    const result = await MetadataServices.getMetadataByType('courtLocations');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('label');
  });

  it('caches DB response when enabled', async () => {
    process.env.METADATA_DB_ENABLED = 'true';
    mockedModel.countDocuments.mockResolvedValue(1);
    const lean = jest.fn().mockResolvedValue([
      {
        _id: 'mock-id',
        type: 'practiceAreas',
        key: 'custom',
        label: 'Custom Area',
        sortOrder: 1,
        isActive: true,
      },
    ]);
    const sort = jest.fn().mockReturnValue({ lean });
    mockedModel.find.mockReturnValue({ sort } as any);

    const first = await MetadataServices.getMetadataByType('practiceAreas', {
      skipCache: true,
    });
    expect(first[0].label).toBe('Custom Area');
    expect(mockedModel.find).toHaveBeenCalledTimes(1);

    // Cached call should not hit DB
    mockedModel.find.mockClear();
    await MetadataServices.getMetadataByType('practiceAreas');
    expect(mockedModel.find).not.toHaveBeenCalled();
  });

  it('throws when admin mutations attempted without DB access', async () => {
    await expect(
      MetadataServices.createMetadataEntry('caseTypes', {
        label: 'Test Case',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('updates entry when DB is enabled', async () => {
    process.env.METADATA_DB_ENABLED = 'true';
    const lean = jest.fn().mockResolvedValue({
      _id: '123',
      type: 'caseTypes',
      key: 'case',
      label: 'Updated',
      isActive: false,
    });
    mockedModel.findByIdAndUpdate.mockReturnValue({ lean } as any);

    const result = await MetadataServices.updateMetadataStatus('123', false);
    expect(result.isActive).toBe(false);
    expect(mockedModel.findByIdAndUpdate).toHaveBeenCalledWith('123', { $set: { isActive: false } }, { new: true });
  });
});
