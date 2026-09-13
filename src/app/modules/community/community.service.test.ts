import { Thread } from './community.model';
import { CommunityService } from './community.service';

const getRepliesLookupStage = (pipeline: any[]) =>
  pipeline.find(stage => stage?.$lookup?.as === 'repliesArray');

describe('CommunityService.getAllThreads', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not expose hidden threads for public includeHidden queries', async () => {
    const aggregateSpy = jest.spyOn(Thread, 'aggregate');
    aggregateSpy.mockImplementationOnce((() => Promise.resolve([])) as any);
    aggregateSpy.mockImplementationOnce((() => Promise.resolve([{ total: 0 }])) as any);

    await CommunityService.getAllThreads(
      { includeHidden: 'true', repliesCount: '1' },
      { allowHidden: false },
    );

    const resultPipeline = aggregateSpy.mock.calls[0][0] as any[];
    const countPipeline = aggregateSpy.mock.calls[1][0] as any[];

    expect(resultPipeline[0]).toEqual({ $match: { isVisible: { $ne: false } } });
    expect(countPipeline[0]).toEqual({ $match: { isVisible: { $ne: false } } });

    expect(getRepliesLookupStage(resultPipeline)?.$lookup?.pipeline?.[0]?.$match?.$expr?.$and?.[1]?.$cond?.if).toBe(false);
    expect(getRepliesLookupStage(countPipeline)?.$lookup?.pipeline?.[0]?.$match?.$expr?.$and?.[1]?.$cond?.if).toBe(false);
  });

  it('allows hidden inclusion only in privileged mode and keeps count pipeline aligned', async () => {
    const aggregateSpy = jest.spyOn(Thread, 'aggregate');
    aggregateSpy.mockImplementationOnce((() => Promise.resolve([])) as any);
    aggregateSpy.mockImplementationOnce((() => Promise.resolve([{ total: 0 }])) as any);

    await CommunityService.getAllThreads(
      { includeHidden: 'true', repliesCount: '2' },
      { allowHidden: true },
    );

    const resultPipeline = aggregateSpy.mock.calls[0][0] as any[];
    const countPipeline = aggregateSpy.mock.calls[1][0] as any[];

    const hasResultVisibilityMatch = resultPipeline.some(
      stage => stage?.$match?.isVisible?.$ne === false,
    );
    const hasCountVisibilityMatch = countPipeline.some(
      stage => stage?.$match?.isVisible?.$ne === false,
    );

    expect(hasResultVisibilityMatch).toBe(false);
    expect(hasCountVisibilityMatch).toBe(false);
    expect(getRepliesLookupStage(resultPipeline)?.$lookup?.pipeline?.[0]?.$match?.$expr?.$and?.[1]?.$cond?.if).toBe(true);
    expect(getRepliesLookupStage(countPipeline)?.$lookup?.pipeline?.[0]?.$match?.$expr?.$and?.[1]?.$cond?.if).toBe(true);
  });
});
