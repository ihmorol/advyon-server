jest.mock('./contact.model', () => ({
  ContactTicket: {
    create: jest.fn(),
  },
}));

jest.mock('../metadata/metadata.service', () => ({
  MetadataServices: {
    getMetadataByType: jest.fn((type: string) => {
      if (type === 'legalSpecializations') {
        return Promise.resolve([
          { key: 'ai-compliance', label: 'AI Compliance' },
        ]);
      }
      return Promise.resolve([
        { key: 'critical-24h', label: 'Critical · 24h', description: 'Need response within 24 hours', color: '#ff6b6b' },
      ]);
    }),
  },
}));

jest.mock('../analytics/support-kpi.service', () => ({
  SupportKpiService: {
    recordTicket: jest.fn(),
  },
}));

import { ContactService } from './contact.service';
import { ContactTicket } from './contact.model';
import { SupportKpiService } from '../analytics/support-kpi.service';

describe('ContactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ContactTicket.create as jest.Mock).mockResolvedValue({
      referenceId: 'CNT-FAKE',
      urgencyKey: 'critical-24h',
      status: 'new',
      toObject: () => ({
        referenceId: 'CNT-FAKE',
        topicLabel: 'AI Compliance',
        topicKey: 'ai-compliance',
        fullName: 'Test User',
        email: 'test@example.com',
        urgencyKey: 'critical-24h',
        message: 'Help us with AI governance.',
      }),
    });
  });

  it('creates ticket and records KPI event', async () => {
    const payload = {
      fullName: 'Test User',
      email: 'test@example.com',
      topicKey: 'ai-compliance',
      urgencyKey: 'critical-24h',
      message: 'Need assistance with compliance.',
    };
    const result = await ContactService.createContactTicket(payload, {
      ip: '1.1.1.1',
      userAgent: 'jest',
    });

    expect(ContactTicket.create).toHaveBeenCalled();
    expect(result.referenceId).toBeDefined();
    expect(SupportKpiService.recordTicket).toHaveBeenCalledWith({
      topicKey: 'ai-compliance',
      urgencyKey: 'critical-24h',
      source: 'public-site',
    });
  });

  it('returns metadata bundle', async () => {
    const meta = await ContactService.getContactMetadata();
    expect(meta.topics[0]).toEqual(
      expect.objectContaining({ key: 'ai-compliance', label: 'AI Compliance' }),
    );
    expect(meta.offices.length).toBeGreaterThan(0);
    expect(meta.socials.length).toBeGreaterThan(0);
  });
});
