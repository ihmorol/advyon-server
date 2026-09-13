import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ContactService } from './contact.service';

const submitContactRequest = catchAsync(async (req, res) => {
  const ticket = await ContactService.createContactTicket(req.body, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Contact request submitted successfully',
    data: {
      referenceId: ticket.referenceId,
      slaEstimateHours: ticket.urgencyKey?.includes('critical') ? 4 : 24,
      status: ticket.status,
    },
  });
});

const getContactMetadata = catchAsync(async (_req, res) => {
  const data = await ContactService.getContactMetadata();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact metadata retrieved successfully',
    data,
  });
});

export const ContactController = {
  submitContactRequest,
  getContactMetadata,
};
