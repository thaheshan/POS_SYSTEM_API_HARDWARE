export class SendEmailDto {
  to: string;
  subject: string;
  html: string;
  tenantId: string;
  event: string;
  referenceId?: string;
  attachment?: {
    filename: string;
    content: Buffer;
  };
}