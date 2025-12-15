declare module 'express' {
  export interface Request {
    // Minimal shape; extend as needed
    [key: string]: any;
  }
}


