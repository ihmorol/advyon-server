/**
 * @fileoverview Payment service layer.
 * Handles payment history retrieval for users and admin.
 */
import httpStatus from 'http-status';
import { User } from '../user/user.model';
import { Payment } from './payment.model';
import AppError from '../../errors/appError';

/**
 * Get paginated payment history for a user.
 */
const getUserPayments = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const user = await User.findOne({ id: userId });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments({ user: user._id }),
  ]);

  return {
    meta: { total, page, limit },
    data,
  };
};

/**
 * Get all payments (admin view).
 */
const getAllPayments = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(),
  ]);

  return {
    meta: { total, page, limit },
    data,
  };
};

export const PaymentService = {
  getUserPayments,
  getAllPayments,
};
