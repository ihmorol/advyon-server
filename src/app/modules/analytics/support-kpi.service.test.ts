import { SupportKpiService } from './support-kpi.service';
import { SupportTicketMetric } from './support-ticket-metric.model';
import config from '../../config';

jest.mock('./support-ticket-metric.model', () => ({
  SupportTicketMetric: {
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));

describe('SupportKpiService', () => {
  const envBackup = { ...config };
  const mockedModel = SupportTicketMetric as unknown as jest.Mocked<typeof SupportTicketMetric>;

  beforeEach(() => {
    jest.clearAllMocks();
    (config as any).support_kpi_enabled = 'true';
  });

  afterAll(() => {
    Object.assign(config, envBackup);
  });

  it('records ticket when enabled', async () => {
    await SupportKpiService.recordTicket({
      topicKey: 'AI Compliance',
      urgencyKey: 'Critical 24h',
      source: 'Landing',
    });
    expect(mockedModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const update = mockedModel.findOneAndUpdate.mock.calls[0][1] as any;
    expect(update.$inc['countsByTopic.ai-compliance']).toBe(1);
    expect(update.$inc['countsByUrgency.critical-24h']).toBe(1);
    expect(update.$inc['countsBySource.landing']).toBe(1);
  });

  it('skips recording when disabled', async () => {
    (config as any).support_kpi_enabled = 'false';
    await SupportKpiService.recordTicket({ topicKey: 'test' });
    expect(mockedModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('summarises metrics within range', async () => {
    mockedModel.find.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              date: '2026-02-17',
              totalTickets: 2,
              countsByTopic: { general: 2 },
              countsByUrgency: { standard: 2 },
              countsBySource: { 'public-site': 2 },
            },
          ]),
      }),
    } as any);

    const result = await SupportKpiService.getSupportTicketKpis(7);
    expect(result.period).toBe('7d');
    expect(result.totalTickets).toBe(2);
    expect(result.byTopic[0]).toEqual({ key: 'general', count: 2 });
    expect(result.dailyTrend[0]).toEqual({ date: '2026-02-17', count: 2 });
  });
});
