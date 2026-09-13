import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { ModerationReview } from './community.moderation.model';
import { CommunityModerationService } from './community.moderation.service';

describe('CommunityModerationService.runFastGate', () => {
  it('flags direct profanity attacks for review', async () => {
    const result = await CommunityModerationService.runFastGate(
      'fuck you and your case',
      0.72,
    );

    expect(['flagged', 'rejected']).toContain(result.decision);
    expect(result.reasons).toContain('toxicity');
  });

  it('flags obfuscated profanity patterns for review', async () => {
    const result = await CommunityModerationService.runFastGate(
      'f u c k you, this is garbage legal advice',
      0.72,
    );

    expect(['flagged', 'rejected']).toContain(result.decision);
    expect(result.reasons).toContain('toxicity');
  });

  it('rejects clearly abusive content', async () => {
    const result = await CommunityModerationService.runFastGate(
      'You are an idiot and your case is trash. Shut up.',
      0.6,
    );

    expect(['flagged', 'rejected']).toContain(result.decision);
    expect(result.reasons).toContain('toxicity');
  });

  it('flags likely spam content', async () => {
    const result = await CommunityModerationService.runFastGate(
      'Click here now https://spam.example buy now buy now buy now free free free',
      0.55,
    );

    expect(['flagged', 'rejected']).toContain(result.decision);
    expect(result.reasons).toContain('spam');
  });

  it('approves normal legal-domain discussion content', async () => {
    const result = await CommunityModerationService.runFastGate(
      'I need guidance about a contract dispute hearing and evidence filing deadlines.',
      0.72,
    );

    expect(result.decision).toBe('approved');
  });
});

describe('CommunityModerationService.createAppeal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks appeal creation for non-owner users', async () => {
    const targetId = new Types.ObjectId().toString();
    const review = {
      _id: new Types.ObjectId(),
      status: 'review',
      authorId: 'content-owner',
    };

    jest.spyOn(ModerationReview, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(review),
    } as any);

    await expect(
      CommunityModerationService.createAppeal({
        targetType: 'thread',
        targetId,
        authorId: 'another-user',
        reason: 'I believe this moderation result should be reconsidered.',
      }),
    ).rejects.toMatchObject({
      statusCode: httpStatus.FORBIDDEN,
    });
  });
});
