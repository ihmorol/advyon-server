import express from 'express';
import httpStatus from 'http-status';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import sendResponse from '../../utils/sendResponse';
import { MetadataControllers } from './metadata.controller';
import { MetadataServices } from './metadata.service';
import { MetadataValidation } from './metadata.validation';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Metadata
 *   description: Static system metadata for public pages and workflows
 */

router.get(
  '/',
  MetadataControllers.getAllMetadata,
);

router.get(
  '/practice-areas',
  MetadataControllers.getPracticeAreas,
);

router.get(
  '/languages',
  MetadataControllers.getLanguages,
);

router.get(
  '/court-locations',
  MetadataControllers.getCourtLocations,
);

router.get(
  '/case-types',
  MetadataControllers.getCaseTypes,
);

router.get(
  '/document-templates',
  MetadataControllers.getDocumentTemplates,
);

router.get(
  '/urgency-levels',
  MetadataControllers.getUrgencyLevels,
);

router.get(
  '/hearing-types',
  MetadataControllers.getHearingTypes,
);

router.get(
  '/legal-specializations',
  MetadataControllers.getLegalSpecializations,
);

/**
 * Admin routes
 */
router.post(
  '/:type',
  auth('admin', 'superAdmin'),
  validateRequest(MetadataValidation.createMetadata),
  MetadataControllers.createMetadataEntry,
);

router.patch(
  '/:id',
  auth('admin', 'superAdmin'),
  validateRequest(MetadataValidation.updateMetadata),
  MetadataControllers.updateMetadataEntry,
);

router.patch(
  '/:id/status',
  auth('admin', 'superAdmin'),
  validateRequest(MetadataValidation.updateStatus),
  MetadataControllers.updateMetadataStatus,
);

/**
 * @swagger
 * /metadata/cache:
 *   delete:
 *     summary: Clear metadata cache
 *     tags: [Metadata]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.delete(
  '/cache',
  auth('admin', 'superAdmin'),
  (req, res) => {
    MetadataServices.invalidateCache();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Metadata cache cleared',
      data: null,
    });
  },
);

export const MetadataRoutes = router;
