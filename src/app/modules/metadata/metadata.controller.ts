import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import {
  IMetadataResponse,
  TMetadataType,
} from './metadata.interface';
import { MetadataServices } from './metadata.service';
import { Request } from 'express';

const parseBool = (value?: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.some(item => parseBool(item));
  }
  if (!value) return false;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const shouldSkipCache = (req: Request) => {
  const token = (req.query.cache as string) ?? '';
  return token.toLowerCase() === 'refresh';
};

const buildGetter = (type: TMetadataType, message: string) =>
  catchAsync(async (req, res) => {
    const includeInactive = parseBool(req.query.includeInactive as string);
    const skipCache = shouldSkipCache(req);
    const data = await MetadataServices.getMetadataByType(type, {
      includeInactive,
      skipCache,
    });

    sendResponse<IMetadataResponse[]>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message,
      data,
    });
  });

const getAllMetadata = catchAsync(async (req, res) => {
  const includeInactive = parseBool(req.query.includeInactive as string);
  const skipCache = shouldSkipCache(req);
  const data = await MetadataServices.getAllMetadata({
    includeInactive,
    skipCache,
  });

  sendResponse<Record<TMetadataType, IMetadataResponse[]>>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Metadata retrieved successfully',
    data,
  });
});

const createMetadataEntry = catchAsync(async (req, res) => {
  const type = req.params.type as TMetadataType;
  const data = await MetadataServices.createMetadataEntry(type, req.body);
  sendResponse<IMetadataResponse>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Metadata entry created',
    data,
  });
});

const updateMetadataEntry = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = await MetadataServices.updateMetadataEntry(id, req.body);
  sendResponse<IMetadataResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Metadata entry updated',
    data,
  });
});

const updateMetadataStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const data = await MetadataServices.updateMetadataStatus(id, isActive);
  sendResponse<IMetadataResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Metadata entry ${isActive ? 'activated' : 'deactivated'}`,
    data,
  });
});

export const MetadataControllers = {
  getPracticeAreas: buildGetter(
    'practiceAreas',
    'Practice areas retrieved successfully',
  ),
  getLanguages: buildGetter(
    'languages',
    'Languages retrieved successfully',
  ),
  getCourtLocations: buildGetter(
    'courtLocations',
    'Court locations retrieved successfully',
  ),
  getCaseTypes: buildGetter(
    'caseTypes',
    'Case types retrieved successfully',
  ),
  getDocumentTemplates: buildGetter(
    'documentTemplates',
    'Document templates retrieved successfully',
  ),
  getUrgencyLevels: buildGetter(
    'urgencyLevels',
    'Urgency levels retrieved successfully',
  ),
  getHearingTypes: buildGetter(
    'hearingTypes',
    'Hearing types retrieved successfully',
  ),
  getLegalSpecializations: buildGetter(
    'legalSpecializations',
    'Legal specializations retrieved successfully',
  ),
  getAllMetadata,
  createMetadataEntry,
  updateMetadataEntry,
  updateMetadataStatus,
};
