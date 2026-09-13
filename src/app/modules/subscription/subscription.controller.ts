/**
 * @fileoverview Subscription controller.
 */
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SubscriptionService } from './subscription.service';

const getPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = SubscriptionService.getPlans();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription plans retrieved',
    data: result,
  });
});

const getUserSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.getUserSubscription(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User subscription retrieved',
    data: result,
  });
});

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.createCheckoutSession(
    req.user.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created',
    data: result,
  });
});

const createPortalSession = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.createPortalSession(
    req.user.userId,
    req.body.returnUrl,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Portal session created',
    data: result,
  });
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.cancelSubscription(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription will be canceled at period end',
    data: result,
  });
});

const verifyCheckout = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.verifyCheckoutSession(
    req.user.userId,
    req.body.sessionId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription verified and synced',
    data: result,
  });
});

export const SubscriptionController = {
  getPlans,
  getUserSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  verifyCheckout,
};
