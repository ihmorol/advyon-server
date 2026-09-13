/**
 * @fileoverview Payment controller.
 */
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

const getUserPayments = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await PaymentService.getUserPayments(req.user.userId, page, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment history retrieved',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await PaymentService.getAllPayments(page, limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All payments retrieved',
    data: result,
  });
});

export const PaymentController = {
  getUserPayments,
  getAllPayments,
};
