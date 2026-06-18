import { invoke } from '@tauri-apps/api/core';

/**
 * Tauri command 호출 얇은 래퍼. 향후 에러 매핑/로깅 추가.
 */
export async function call<TArgs extends Record<string, unknown>, TResult>(
  command: string,
  args?: TArgs,
): Promise<TResult> {
  return invoke<TResult>(command, args);
}
