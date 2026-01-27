import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
    return;
  }
  
  next();
};

export const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('start_date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('end_date must be a valid ISO 8601 date'),
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('page_size')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('page_size must be between 1 and 1000'),
];

export const validateReportRequest = [
  body('report_type')
    .isIn(['executive', 'trading', 'user', 'financial', 'risk', 'marketing'])
    .withMessage('Invalid report type'),
  body('format')
    .isIn(['pdf', 'excel', 'csv', 'json'])
    .withMessage('Invalid format'),
  body('period.start')
    .isISO8601()
    .withMessage('period.start must be a valid date'),
  body('period.end')
    .isISO8601()
    .withMessage('period.end must be a valid date'),
  body('email_recipients')
    .optional()
    .isArray()
    .withMessage('email_recipients must be an array'),
];
