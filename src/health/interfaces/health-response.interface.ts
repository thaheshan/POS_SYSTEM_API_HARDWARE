export interface SystemHealthResponse {
  database: string;
  redis: string;
  storage: string;
  sms_balance: number;
  app_version: string;
  uptime: string;
}
