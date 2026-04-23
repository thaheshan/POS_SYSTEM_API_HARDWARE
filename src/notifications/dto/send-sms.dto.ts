export class SendSmsDto {
  to: string;
  message: string;
  tenantId: string;
  event: string;
  referenceId?: string;
}