import { CommunityValidation } from './community.validation';

describe('CommunityValidation assist payloads', () => {
  it('accepts similar-thread payloads with 5-char content', () => {
    const parsed = CommunityValidation.similarThreadsValidation.safeParse({
      body: {
        title: 'Need help',
        content: 'short',
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts smart-tag payloads with 5-char content', () => {
    const parsed = CommunityValidation.smartTagValidation.safeParse({
      body: {
        title: 'Need help',
        content: 'short',
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty assist payloads', () => {
    const parsed = CommunityValidation.similarThreadsValidation.safeParse({
      body: {
        title: 'Need help',
        content: '',
      },
    });

    expect(parsed.success).toBe(false);
  });
});
