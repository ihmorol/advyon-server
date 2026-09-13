import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AIController } from './ai.controller';
import { DocumentControllers } from '../document/document.controller'; // Re-using for document analysis endpoint if needed
import { AIValidation } from './ai.validation';

const router = express.Router();

router.post('/chat', auth(), validateRequest(AIValidation.chatValidation), AIController.chatWithAI);
router.post(
  '/tools/:toolKey/run',
  auth(),
  validateRequest(AIValidation.runToolValidation),
  AIController.runTool,
);
router.get(
  '/tools/history',
  auth(),
  validateRequest(AIValidation.toolHistoryValidation),
  AIController.getToolHistory,
);
router.get(
  '/tools/history/export',
  auth(),
  validateRequest(AIValidation.exportToolHistoryValidation),
  AIController.exportToolHistory,
);
router.get(
  '/tools/metrics',
  auth('lawyer', 'admin', 'superAdmin'),
  validateRequest(AIValidation.toolMetricsValidation),
  AIController.getToolMetrics,
);
router.get(
  '/context/profile',
  auth(),
  validateRequest(AIValidation.contextProfileValidation),
  AIController.getContextProfile,
);

// Chat Persistence Routes
router.post('/chats', auth(), validateRequest(AIValidation.createChatValidation), AIController.createOrUpdateChat);
router.get('/chats', auth(), AIController.getUserChats);
router.get('/chats/:id', auth(), AIController.getChat);
router.delete('/chats/:id', auth(), AIController.deleteChat);

// Route for manual AI analysis trigger (matching client useAIStore logic)
// POST /ai/documents/analyze { documentId: "..." }
// We can reuse the reanalyzeDocument controller from Document module or create a wrapper
router.post('/documents/analyze', auth(), validateRequest(AIValidation.analyzeDocumentValidation), async (req, res, next) => {
    // Adapter to match DocumentController signature which expects :documentId in params
    req.params.documentId = req.body.documentId;
    // We reuse reanalyzeDocument which triggers the process
    return DocumentControllers.reanalyzeDocument(req, res, next);
});

export const AIRoutes = router;
