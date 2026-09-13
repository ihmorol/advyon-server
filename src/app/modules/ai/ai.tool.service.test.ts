import httpStatus from 'http-status';
import { AIContextManagerService } from './ai-context-manager.service';
import { AIService } from './ai.service';
import { AIToolHistoryModel } from './ai.tool.model';
import { AIToolService, buildToolPrompt, serializeHistoryToCsv } from './ai.tool.service';

describe('AIToolService helpers', () => {
  it('buildToolPrompt injects tool-specific instruction and input', () => {
    const prompt = buildToolPrompt(
      'contract-analyzer',
      'Review this contract for termination risks.',
    );

    expect(prompt).toContain('TOOL: Contract Analyzer');
    expect(prompt).toContain('termination risks');
  });

  it('serializeHistoryToCsv escapes values safely', () => {
    const csv = serializeHistoryToCsv([
      {
        createdAt: new Date('2026-02-16T00:00:00.000Z'),
        toolKey: 'brief-analyzer',
        status: 'success',
        latencyMs: 1234,
        input: 'line1\nline2',
        output: 'quoted "value"',
      },
    ]);

    expect(csv.split('\n').length).toBe(2);
    expect(csv).toContain('brief-analyzer');
    expect(csv).toContain('quoted ""value""');
  });
});

describe('AIToolService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores failed runs when provider execution fails', async () => {
    jest.spyOn(AIToolHistoryModel, 'countDocuments').mockResolvedValue(0 as any);
    jest.spyOn(AIContextManagerService, 'prepareContext').mockResolvedValue({
      allowed: true,
      contextPrompt: 'context',
      history: [],
      memoryKey: 'memory-key',
      policySignals: [],
    } as any);
    jest.spyOn(AIService, 'chatWithAI').mockRejectedValue(new Error('Provider unavailable'));
    const createSpy = jest.spyOn(AIToolHistoryModel, 'create').mockResolvedValue({
      _id: 'history-id',
    } as any);

    await expect(
      AIToolService.runTool({
        userId: 'user-1',
        toolKey: 'contract-analyzer',
        input: 'Review this contract.',
      }),
    ).rejects.toMatchObject({
      statusCode: httpStatus.BAD_GATEWAY,
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        output: 'Provider unavailable',
      }),
    );
  });

  it('computes avgLatencyMs as weighted average across statuses', async () => {
    jest.spyOn(AIToolHistoryModel, 'aggregate').mockResolvedValue([
      {
        _id: { toolKey: 'contract-analyzer', status: 'success' },
        count: 2,
        avgLatencyMs: 100,
      },
      {
        _id: { toolKey: 'contract-analyzer', status: 'failed' },
        count: 1,
        avgLatencyMs: 400,
      },
      {
        _id: { toolKey: 'contract-analyzer', status: 'blocked' },
        count: 1,
        avgLatencyMs: 40,
      },
    ] as any);

    const metrics = await AIToolService.getUsageMetrics({});

    expect(metrics['contract-analyzer']).toEqual(
      expect.objectContaining({
        total: 4,
        success: 2,
        blocked: 1,
        failed: 1,
        avgLatencyMs: 160,
        completionRate: 0.5,
      }),
    );
  });
});
