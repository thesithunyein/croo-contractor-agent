import * as dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export interface CrooEnv {
  apiURL: string;
  wsURL: string;
  sdkKey: string;
  baseRpcURL: string;
  targetServiceId: string;
  registryServiceIds: string[];
  maxUsdcPerOrder: number;
  maxUsdcPerJob: number;
}

/**
 * Loads CROO/CAP configuration from the environment.
 * Each running process (Contractor provider, a specialist, the requester) supplies
 * its own CROO_SDK_KEY for the agent it represents.
 */
export function loadEnv(): CrooEnv {
  return {
    apiURL: optional('CROO_API_URL', 'https://api.croo.network'),
    wsURL: optional('CROO_WS_URL', 'wss://api.croo.network/ws'),
    sdkKey: required('CROO_SDK_KEY'),
    baseRpcURL: optional('BASE_RPC_URL', 'https://mainnet.base.org'),
    targetServiceId: optional('CROO_TARGET_SERVICE_ID', ''),
    registryServiceIds: optional('CONTRACTOR_REGISTRY_SERVICE_IDS', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    maxUsdcPerOrder: Number(optional('MAX_USDC_PER_ORDER', '2.00')),
    maxUsdcPerJob: Number(optional('MAX_USDC_PER_JOB', '10.00')),
  };
}
