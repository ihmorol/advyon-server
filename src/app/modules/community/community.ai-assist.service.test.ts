import { CommunityAIAssistService } from './community.ai-assist.service';

describe('CommunityAIAssistService.suggestSmartTags', () => {
  it('extracts meaningful smart tags from legal text', () => {
    const tags = CommunityAIAssistService.suggestSmartTags(
      'Contract breach and payment dispute',
      'Need help with contract breach, damages, and payment timeline enforcement in court.',
    );

    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContain('contract');
  });
});

