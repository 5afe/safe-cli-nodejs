/**
 * Convert a Safe Transaction Service URL to staging mode if needed
 * @param url - The original transaction service URL (e.g., https://safe-transaction-mainnet.safe.global)
 * @param useStaging - Whether to use staging environment
 * @returns The URL, potentially modified to use staging.5afe.dev domain
 */
export function convertToStagingUrl(url: string, useStaging: boolean): string {
  if (!useStaging) {
    return url
  }

  // Replace safe.global with staging.5afe.dev
  return url.replace(/\.safe\.global/g, '.staging.5afe.dev')
}
