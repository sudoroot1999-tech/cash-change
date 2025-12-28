import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  }));
});
