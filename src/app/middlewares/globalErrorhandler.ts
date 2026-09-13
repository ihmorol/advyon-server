/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import AppError from '../errors/appError';
import handleCastError from '../errors/handleCastError';
import handleDuplicateError from '../errors/handleDuplicateError';
import handleValidationError from '../errors/handleValidationError';
import handleZodError from '../errors/handleZodError';
import { TErrorSources } from '../interface/error';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(err.statusCode);
  //setting default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'ValidationError') {
    const simplifiedError = handleValidationError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'CastError') {
    const simplifiedError = handleCastError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof Error) {
    // Unknown errors may leak internal details (DB/Stripe/AI provider),
    // so never expose the raw message to the client. Log the full
    // error (message + stack) server-side for debugging instead.
    console.error('Unhandled error:', err);
    message = 'Something went wrong!';
    errorSources = [
      {
        path: '',
        message: 'Something went wrong',
      },
    ];
  }

  //ultimate return
  const response: {
    success: boolean;
    message: string;
    errorSources: TErrorSources;
    stack?: string;
    error?: any;
  } = {
    success: false,
    message: message || 'Internal Server Error',
    errorSources,
    stack: config.NODE_ENV === 'development' ? err?.stack : undefined,
  };

  // Only include full error object in development
  if (config.NODE_ENV === 'development') {
    response.error = {
      name: err.name,
      message: err.message,
    };
  }

  return res.status(statusCode).json(response);
};

export default globalErrorHandler;
