import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsService } from './analytics.service';
import { SupportKpiService } from './support-kpi.service';

/**
 * WBS-8.1: Analytics Controller
 * Exposes dashboard metrics endpoints.
 */

const getCaseMetrics = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { startDate, endDate } = req.query; // Typed as string | undefined

  const result = await AnalyticsService.getCaseMetrics(
    userId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Case metrics retrieved successfully',
    data: result,
  });
});

const getClientMetrics = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { startDate, endDate } = req.query;

  const result = await AnalyticsService.getClientMetrics(
    userId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Client metrics retrieved successfully',
    data: result,
  });
});

const getUpcomingDeadlines = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const limit = req.query.limit ? Number(req.query.limit) : 10;

  const result = await AnalyticsService.getUpcomingDeadlines(userId, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Upcoming deadlines retrieved successfully',
    data: result,
  });
});

const getRevenueMetrics = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { startDate, endDate } = req.query;

  const result = await AnalyticsService.getRevenueMetrics(
    userId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Revenue metrics retrieved (stub)',
    data: result,
  });
});

const getSupportTicketKpis = catchAsync(async (req, res) => {
  const rangeDays = req.query.rangeDays
    ? Number(req.query.rangeDays)
    : 30;
  const data = await SupportKpiService.getSupportTicketKpis(rangeDays);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Support ticket KPIs retrieved successfully',
    data,
  });
});

export const AnalyticsControllers = {
  getCaseMetrics,
  getClientMetrics,
  getUpcomingDeadlines,
  getRevenueMetrics,
  getSupportTicketKpis,
};
