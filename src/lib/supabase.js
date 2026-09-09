import { createClient } from '@supabase/supabase-js';
import { readConfig } from './config';
const config = readConfig(import.meta.env, window.location.origin);
const { url, key } = config;
export const configured = config.configured;
export const configErrors = config.errors;
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;
export const appUrl = config.appUrl;
