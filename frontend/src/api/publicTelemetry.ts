import { apiClient } from './client'

export interface PublicTelemetry {
  total_tokens: number
  success_rate: number | null
  average_output_tps: number | null
  updated_at: string
}

export async function getPublicTelemetry(signal?: AbortSignal): Promise<PublicTelemetry> {
  const { data } = await apiClient.get<PublicTelemetry>('/public/telemetry', { signal })
  return data
}
