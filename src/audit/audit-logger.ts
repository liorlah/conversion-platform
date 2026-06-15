import { v4 as uuid } from 'uuid';

/**
 * Audit Logger
 * Logs conversion events for compliance and tracking
 */
export class AuditLogger {
  private logs: Map<string, any> = new Map();

  /**
   * Log conversion event
   */
  async logConversion(jobId: string, details: any): Promise<void> {
    const auditEntry = {
      auditId: uuid(),
      jobId,
      timestamp: new Date(),
      ...details,
    };
    this.logs.set(auditEntry.auditId, auditEntry);
  }

  /**
   * Get audit log for job
   */
  async getJobAuditLog(jobId: string): Promise<any[]> {
    return Array.from(this.logs.values()).filter((log) => log.jobId === jobId);
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(): Promise<any[]> {
    return Array.from(this.logs.values());
  }
}
