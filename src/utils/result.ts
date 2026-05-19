export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const success = <T>(data: T): Result<T> => ({ success: true, data });
export const failure = (error: string): Result<never> => ({ success: false, error });
