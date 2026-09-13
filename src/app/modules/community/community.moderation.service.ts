import { Types } from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { sanitizeUserGeneratedText } from '../ai/input-sanitizer';
import { Reply, Thread } from './community.model';
import {
  TModerationAssessment,
  TModerationDecision,
  TModerationQueueStatus,
  TModerationSnapshot,
  TModerationTargetType,
} from './community.moderation.interface';
import { ModerationAppeal, ModerationReview } from './community.moderation.model';
import { openrouterClient, OPENROUTER_MODEL } from '../../config/openrouter.config';

const DEFAULT_MODERATION_THRESHOLD = Number(
  process.env.COMMUNITY_MODERATION_THRESHOLD || 0.72,
);

const LEGAL_DOMAIN_HINTS = [
  'case',
  'court',
  'hearing',
  'petition',
  'plaintiff',
  'defendant',
  'contract',
  'law',
  'legal',
  'statute',
  'judge',
  'evidence',
];

const TOXICITY_HINTS = [
  'idiot',
  'stupid',
  'fuck',
  'fucking',
  'bitch',
  'asshole',
  'bastard',
  'motherfucker',
  'retard',
  'dickhead',
  'bullshit',
  'go to hell',
  'hate',
  'kill',
  'trash',
  'shut up',
  'moron',
  'dumb',
  'worthless',
];

const COLLAPSED_TOXICITY_HINTS = [
  'fuckyou',
  'motherfucker',
  'pieceofshit',
  'killyourself',
  'godie',
  'asshole',
  'bitch',
  'moron',
  'idiot',
  'shutup',
];

const TOXICITY_REGEX_HINTS: RegExp[] = [
  /\bf[\W_]*(?:u|\*)[\W_]*c[\W_]*k(?:[\W_]*i[\W_]*n[\W_]*g)?\b/i,
  /\ba[\W_]*s[\W_]*s[\W_]*h[\W_]*o[\W_]*l[\W_]*e\b/i,
  /\bb[\W_]*i[\W_]*t[\W_]*c[\W_]*h\b/i,
  /\bm[\W_]*o[\W_]*r[\W_]*o[\W_]*n\b/i,
  /\bi[\W_]*d[\W_]*i[\W_]*o[\W_]*t\b/i,
];

const SEVERE_TOXICITY_PATTERNS: RegExp[] = [
  /\bfuck\s+you\b/i,
  /\bf[\W_]*(?:u|\*)[\W_]*c[\W_]*k[\W_]*y[\W_]*o[\W_]*u\b/i,
  /\bgo\s+die\b/i,
  /\bkill\s+yourself\b/i,
  /\bk[\W_]*i[\W_]*l[\W_]*l[\W_]*y[\W_]*o[\W_]*u[\W_]*r[\W_]*s[\W_]*e[\W_]*l[\W_]*f\b/i,
  /\bpiece\s+of\s+shit\b/i,
  /\bshut\s+the\s+fuck\s+up\b/i,
];

const PERSONAL_ATTACK_PATTERNS: RegExp[] = [
  /\byou\s+are\s+(an?\s+)?(idiot|moron|stupid|dumb|worthless|trash|loser)\b/i,
  /\byour\s+(argument|case|post)\s+is\s+(trash|stupid|garbage|worthless)\b/i,
];

let queueWorkerRunning = false;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const sanitizeThreshold = (threshold?: number): number => {
  const candidate = Number.isFinite(threshold) ? Number(threshold) : DEFAULT_MODERATION_THRESHOLD;
  if (!Number.isFinite(candidate)) return DEFAULT_MODERATION_THRESHOLD;
  return Math.max(0.4, Math.min(0.95, candidate));
};

const calculateSpamScore = (content: string): number => {
  const text = content.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const uniqueWordCount = new Set(words).size;
  const repeatedWordRatio = words.length > 0 ? 1 - uniqueWordCount / words.length : 0;
  const urlMatches = text.match(/https?:\/\//g)?.length || 0;
  const promoMatches = text.match(/\b(free|click here|buy now|limited offer|guaranteed)\b/g)?.length || 0;
  const repeatedCharMatches = text.match(/(.)\1{5,}/g)?.length || 0;

  const score = repeatedWordRatio * 0.5 + Math.min(urlMatches, 4) * 0.12 + promoMatches * 0.08 + repeatedCharMatches * 0.1;
  return clamp01(score);
};

const calculateOffTopicScore = (content: string): number => {
  const text = content.toLowerCase();
  const legalHits = LEGAL_DOMAIN_HINTS.filter(keyword => text.includes(keyword)).length;
  const tokenCount = text.split(/\s+/).filter(Boolean).length;

  if (tokenCount < 6) return 0.55;
  if (legalHits >= 2) return 0.05;
  if (legalHits === 1) return 0.25;

  const nonLegalHints = text.match(/\b(game|movie|sports|crypto|recipe|vacation|dating)\b/g)?.length || 0;
  return clamp01(0.55 + nonLegalHints * 0.1);
};

const calculateKeywordToxicityScore = (content: string): number => {
  const text = content.toLowerCase();
  const collapsedText = text.replace(/[^a-z0-9]+/g, '');
  const hitCount = TOXICITY_HINTS.filter(keyword => text.includes(keyword)).length;
  const collapsedHitCount = COLLAPSED_TOXICITY_HINTS.filter(keyword =>
    collapsedText.includes(keyword),
  ).length;
  const regexHitCount = TOXICITY_REGEX_HINTS.filter(pattern => pattern.test(text)).length;
  const severeHits = SEVERE_TOXICITY_PATTERNS.filter(pattern =>
    pattern.test(text),
  ).length;
  const personalAttackHits = PERSONAL_ATTACK_PATTERNS.filter(pattern =>
    pattern.test(text),
  ).length;
  const aggressivePatternHits = text.match(/(!{3,}|[A-Z]{5,})/g)?.length || 0;

  const severeWeight = severeHits > 0 ? 0.95 : 0;
  const keywordWeight = hitCount * 0.22 + collapsedHitCount * 0.22 + regexHitCount * 0.24;
  const personalAttackWeight = personalAttackHits * 0.3;
  const aggressionWeight = aggressivePatternHits * 0.08;

  return clamp01(Math.max(severeWeight, keywordWeight + personalAttackWeight + aggressionWeight));
};

const classifyWithLLM = async (content: string): Promise<{
    decision: 'approved' | 'flagged' | 'rejected';
    reason: string;
    toxicityScore: number;
}> => {
    if (!openrouterClient) return { decision: 'approved', reason: '', toxicityScore: 0 };

    const prompt = `
    Role: Community Moderator for a Professional Legal Operations Platform (Advyon).
    Task: Evaluate if the following post violates community standards.
    
    Standards:
    - No hate speech, harassment, threats, or severe toxicity.
    - No spam or blatant self-promotion.
    - Content must be reasonably relevant to legal professionals, law students, or clients seeking legal help.
    - Professional disagreement is allowed; personal attacks are not.

    Content to Review:
    "${content}"

    Output JSON only:
    {
        "verdict": "approved" | "flagged" | "rejected",
        "message": "Short reason for decision (max 1 sentence)",
        "toxicityScore": 0.0 to 1.0 (0 = safe, 1 = dangerous)
    }
    `;

    try {
        const completion = await openrouterClient.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

        return {
            decision: (['approved', 'flagged', 'rejected'].includes(result.verdict) ? result.verdict : 'approved') as any,
            reason: result.message || '',
            toxicityScore: typeof result.toxicityScore === 'number' ? result.toxicityScore : 0
        };
    } catch (error) {
        console.warn('[Moderation] LLM check failed, defaulting to approved:', error);
        return { decision: 'approved', reason: '', toxicityScore: 0 };
    }
};

const decisionToSnapshotStatus = (
  decision: TModerationDecision,
): TModerationSnapshot['status'] => {
  if (decision === 'approved') return 'approved';
  if (decision === 'flagged') return 'review';
  return 'rejected';
};

const assessContent = async (
  content: string,
  threshold?: number,
  useModel = false,
): Promise<TModerationAssessment> => {
  const safeThreshold = sanitizeThreshold(threshold);
  const sanitizedContent = sanitizeUserGeneratedText(content);
  const spamScore = calculateSpamScore(sanitizedContent);
  const offTopicScore = calculateOffTopicScore(sanitizedContent);
  const keywordToxicity = calculateKeywordToxicityScore(sanitizedContent);
  
  // Use LLM for deeper analysis if requested
  const llmResult = useModel ? await classifyWithLLM(sanitizedContent) : { toxicityScore: 0, decision: 'approved' as TModerationDecision, reason: '' };
  
  const modelToxicity = llmResult.toxicityScore;
  const toxicityScore = clamp01(Math.max(keywordToxicity, modelToxicity));

  const confidence = Math.max(toxicityScore, spamScore, offTopicScore);
  let decision: TModerationDecision = 'approved';

  // Decision logic:
  // 1. LLM rejection overrides everything
  if (llmResult.decision === 'rejected') {
      decision = 'rejected';
  } else if (toxicityScore >= 0.9) {
    decision = 'rejected';
  } else if (toxicityScore >= safeThreshold) {
    decision = 'flagged';
  } else if (confidence >= safeThreshold + 0.12) {
    decision = 'rejected';
  } else if (confidence >= safeThreshold) {
    decision = 'flagged';
  } else if (llmResult.decision === 'flagged') {
      decision = 'flagged';
  }

  const reasons: string[] = [];
  if (llmResult.reason) reasons.push(llmResult.reason);
  if (toxicityScore >= safeThreshold * 0.7) reasons.push('toxicity');
  if (spamScore >= safeThreshold * 0.7) reasons.push('spam');
  if (offTopicScore >= safeThreshold * 0.7) reasons.push('off-topic');

  if (!reasons.length && decision !== 'approved') {
    reasons.push('policy-threshold');
  }

  return {
    decision,
    confidence,
    toxicityScore,
    spamScore,
    offTopicScore,
    reasons,
    threshold: safeThreshold,
  };
};

const applyModerationToTarget = async (
  targetType: TModerationTargetType,
  targetId: Types.ObjectId,
  assessment: TModerationAssessment,
  reviewId: Types.ObjectId,
): Promise<void> => {
  const nextVisibility = assessment.decision === 'approved';
  const nextStatus = decisionToSnapshotStatus(assessment.decision);

  if (targetType === 'thread') {
    await Thread.findByIdAndUpdate(targetId, {
      isVisible: nextVisibility,
      moderation: {
        status: nextStatus,
        confidence: assessment.confidence,
        threshold: assessment.threshold,
        toxicityScore: assessment.toxicityScore,
        spamScore: assessment.spamScore,
        offTopicScore: assessment.offTopicScore,
        reasons: assessment.reasons,
        reviewId,
        lastCheckedAt: new Date(),
      },
    });
    return;
  }

  const reply = await Reply.findById(targetId).select('threadId isVisible');
  if (!reply) return;

  const wasVisible = reply.isVisible !== false;

  await Reply.findByIdAndUpdate(targetId, {
    isVisible: nextVisibility,
    moderation: {
      status: nextStatus,
      confidence: assessment.confidence,
      threshold: assessment.threshold,
      toxicityScore: assessment.toxicityScore,
      spamScore: assessment.spamScore,
      offTopicScore: assessment.offTopicScore,
      reasons: assessment.reasons,
      reviewId,
      lastCheckedAt: new Date(),
    },
  });

  if (!wasVisible && nextVisibility) {
    await Thread.findByIdAndUpdate(reply.threadId, { $inc: { repliesCount: 1 } });
  }

  if (wasVisible && !nextVisibility) {
    await Thread.findByIdAndUpdate(reply.threadId, { $inc: { repliesCount: -1 } });
  }
};

const processModerationQueue = async (): Promise<void> => {
  if (queueWorkerRunning) return;
  queueWorkerRunning = true;

  try {
    while (true) {
      const queueItem = await ModerationReview.findOneAndUpdate(
        { status: 'queued' },
        { status: 'processing' },
        { sort: { createdAt: 1 }, new: true },
      );

      if (!queueItem) break;

      try {
        const assessment = await assessContent(
          queueItem.contentPreview,
          queueItem.threshold,
          true,
        );

        const status: TModerationQueueStatus =
          assessment.decision === 'approved'
            ? 'approved'
            : assessment.decision === 'flagged'
              ? 'review'
              : 'rejected';

        await ModerationReview.findByIdAndUpdate(queueItem._id, {
          status,
          decision: assessment.decision,
          confidence: assessment.confidence,
          toxicityScore: assessment.toxicityScore,
          spamScore: assessment.spamScore,
          offTopicScore: assessment.offTopicScore,
          reasons: assessment.reasons,
          processedAt: new Date(),
        });

        await applyModerationToTarget(
          queueItem.targetType,
          queueItem.targetId,
          assessment,
          queueItem._id,
        );
      } catch (error) {
        await ModerationReview.findByIdAndUpdate(queueItem._id, {
          status: 'error',
          notes: `Queue processing failed: ${(error as Error).message}`,
          processedAt: new Date(),
        });
      }
    }
  } finally {
    queueWorkerRunning = false;
  }
};

const triggerQueueWorker = (): void => {
  if (queueWorkerRunning) return;
  setImmediate(() => {
    void processModerationQueue();
  });
};

const buildInitialSnapshot = (
  assessment: TModerationAssessment,
): TModerationSnapshot => ({
  status: decisionToSnapshotStatus(assessment.decision),
  confidence: assessment.confidence,
  threshold: assessment.threshold,
  toxicityScore: assessment.toxicityScore,
  spamScore: assessment.spamScore,
  offTopicScore: assessment.offTopicScore,
  reasons: assessment.reasons,
  lastCheckedAt: new Date(),
});

const runFastGate = async (
  content: string,
  threshold?: number,
): Promise<TModerationAssessment> => assessContent(content, threshold, false);

const registerCreatedContent = async (params: {
  targetType: TModerationTargetType;
  targetId: Types.ObjectId;
  authorId: string;
  content: string;
  assessment: TModerationAssessment;
}) => {
  const targetModel = params.targetType === 'thread' ? 'Thread' : 'Reply';
  const initialStatus: TModerationQueueStatus =
    params.assessment.decision === 'approved'
      ? 'queued'
      : params.assessment.decision === 'flagged'
        ? 'review'
        : 'rejected';

  const review = await ModerationReview.create({
    targetType: params.targetType,
    targetId: params.targetId,
    targetModel,
    authorId: params.authorId,
    status: initialStatus,
    decision: params.assessment.decision,
    threshold: params.assessment.threshold,
    confidence: params.assessment.confidence,
    toxicityScore: params.assessment.toxicityScore,
    spamScore: params.assessment.spamScore,
    offTopicScore: params.assessment.offTopicScore,
    reasons: params.assessment.reasons,
    contentPreview: sanitizeUserGeneratedText(params.content).slice(0, 500),
    processedAt: initialStatus === 'queued' ? undefined : new Date(),
  });

  await applyModerationToTarget(
    params.targetType,
    params.targetId,
    params.assessment,
    review._id,
  );

  if (initialStatus === 'queued') {
    triggerQueueWorker();
  }

  return review;
};

const getReviewQueue = async (query: {
  status?: string;
  page?: string;
  limit?: string;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  }

  const [result, total] = await Promise.all([
    ModerationReview.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ModerationReview.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    result,
  };
};

const reviewModerationItem = async (
  reviewId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
) => {
  const review = await ModerationReview.findById(reviewId);
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Moderation review item not found.');
  }

  const mappedDecision: TModerationDecision =
    decision === 'approved' ? 'approved' : 'rejected';

  const assessment: TModerationAssessment = {
    decision: mappedDecision,
    confidence: review.confidence,
    threshold: review.threshold,
    toxicityScore: review.toxicityScore,
    spamScore: review.spamScore,
    offTopicScore: review.offTopicScore,
    reasons: review.reasons,
  };

  await applyModerationToTarget(review.targetType, review.targetId, assessment, review._id);

  review.status = decision === 'approved' ? 'approved' : 'rejected';
  review.decision = mappedDecision;
  review.reviewedBy = reviewerId;
  review.reviewedAt = new Date();
  review.notes = notes || review.notes;
  review.processedAt = new Date();
  await review.save();

  return review;
};

const createAppeal = async (params: {
  targetType: TModerationTargetType;
  targetId: string;
  authorId: string;
  reason: string;
}) => {
  const objectId = new Types.ObjectId(params.targetId);
  const review = await ModerationReview.findOne({
    targetType: params.targetType,
    targetId: objectId,
  }).sort({ createdAt: -1 });

  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'No moderation record found for this content.');
  }

  if (review.authorId !== params.authorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only appeal moderation decisions for your own content.',
    );
  }

  if (!['review', 'rejected'].includes(review.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Appeals are allowed only for reviewed or rejected content.',
    );
  }

  const existingAppeal = await ModerationAppeal.findOne({
    targetType: params.targetType,
    targetId: objectId,
    status: 'pending',
  });

  if (existingAppeal) {
    throw new AppError(httpStatus.CONFLICT, 'An active appeal already exists for this content.');
  }

  const appeal = await ModerationAppeal.create({
    targetType: params.targetType,
    targetId: objectId,
    reviewId: review._id,
    authorId: params.authorId,
    reason: sanitizeUserGeneratedText(params.reason),
  });

  const targetUpdate = {
    'moderation.status': 'appealed',
    'moderation.lastCheckedAt': new Date(),
  };

  if (params.targetType === 'thread') {
    await Thread.findByIdAndUpdate(objectId, targetUpdate);
  } else {
    await Reply.findByIdAndUpdate(objectId, targetUpdate);
  }

  return appeal;
};

const getAppeals = async (query: {
  status?: string;
  page?: string;
  limit?: string;
}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = query.status;
  }

  const [result, total] = await Promise.all([
    ModerationAppeal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ModerationAppeal.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    result,
  };
};

const resolveAppeal = async (
  appealId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  notes?: string,
) => {
  const appeal = await ModerationAppeal.findById(appealId);
  if (!appeal) {
    throw new AppError(httpStatus.NOT_FOUND, 'Appeal not found.');
  }

  if (appeal.status !== 'pending') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Appeal has already been resolved.');
  }

  await reviewModerationItem(
    appeal.reviewId.toString(),
    reviewerId,
    decision,
    notes || `Appeal resolution: ${decision}`,
  );

  appeal.status = decision;
  appeal.resolvedBy = reviewerId;
  appeal.resolvedAt = new Date();
  appeal.resolutionNotes = notes;
  await appeal.save();

  return appeal;
};

export const CommunityModerationService = {
  runFastGate,
  buildInitialSnapshot,
  registerCreatedContent,
  getReviewQueue,
  reviewModerationItem,
  createAppeal,
  getAppeals,
  resolveAppeal,
};
