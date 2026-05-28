// ============================================
// SmartTicketQR — Print Queue Manager
// Manages print jobs with retry logic and status tracking
// ============================================

import type {
  PrintJob,
  PrintJobType,
  PrintJobStatus,
  PrinterType,
  PrintQueueState,
  PrintOptions,
  PrintTicketData,
  PrintReceiptData,
  PrintReportData,
} from './types';

type JobData = PrintTicketData | PrintReceiptData | PrintReportData;

type Listener = () => void;

class PrintQueueManagerClass {
  private jobs: Map<string, PrintJob> = new Map();
  private listeners: Set<Listener> = new Set();
  private isProcessing = false;
  private maxConcurrent = 1;
  private defaultMaxRetries = 3;
  private retryDelay = 1500; // ms

  // ── Job Management ──────────────────────────────

  /**
   * Add a new print job to the queue.
   * Returns the job ID.
   */
  addJob(
    type: PrintJobType,
    printerType: PrinterType,
    data: JobData,
    options: PrintOptions = {},
  ): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const job: PrintJob = {
      id,
      type,
      printerType,
      status: 'pending',
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options.copies && options.copies > 1 ? 0 : this.defaultMaxRetries,
      printerName: options.printerId,
    };

    this.jobs.set(id, job);
    this.notifyListeners();

    return id;
  }

  /**
   * Update a job's status.
   */
  updateJobStatus(jobId: string, status: PrintJobStatus, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;

    if (status === 'success' || status === 'failed' || status === 'cancelled') {
      job.completedAt = new Date().toISOString();
    }

    if (error) {
      job.error = error;
    }

    this.notifyListeners();
  }

  /**
   * Retry a failed job.
   */
  async retryJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') return;

    if (job.retryCount >= job.maxRetries) {
      job.status = 'failed';
      job.error = 'Nombre maximum de tentatives atteint';
      this.notifyListeners();
      return;
    }

    job.status = 'retrying';
    job.retryCount++;
    job.error = undefined;
    this.notifyListeners();

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, this.retryDelay * job.retryCount));
  }

  /**
   * Cancel a pending or retrying job.
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.status === 'pending' || job.status === 'retrying') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      this.notifyListeners();
    }
  }

  /**
   * Remove completed/failed/cancelled jobs older than a threshold.
   */
  cleanup(olderThanMs: number = 3600000): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, job] of this.jobs) {
      if (job.completedAt) {
        const completedAt = new Date(job.completedAt).getTime();
        if (now - completedAt > olderThanMs) {
          this.jobs.delete(id);
          removed++;
        }
      }
    }

    if (removed > 0) this.notifyListeners();
    return removed;
  }

  /**
   * Clear all jobs.
   */
  clear(): void {
    this.jobs.clear();
    this.notifyListeners();
  }

  /**
   * Get a specific job.
   */
  getJob(jobId: string): PrintJob | undefined {
    return this.jobs.get(jobId);
  }

  // ── State ───────────────────────────────────────

  getState(): PrintQueueState {
    const jobs = Array.from(this.jobs.values());
    const totalJobs = jobs.length;
    const successCount = jobs.filter((j) => j.status === 'success').length;
    const failedCount = jobs.filter((j) => j.status === 'failed').length;
    const pendingCount = jobs.filter((j) => j.status === 'pending' || j.status === 'retrying').length;

    return {
      jobs,
      isProcessing: this.isProcessing,
      stats: { totalJobs, successCount, failedCount, pendingCount },
    };
  }

  // ── React Integration ───────────────────────────

  /**
   * Subscribe to queue state changes (for React useSyncExternalStore).
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get snapshot (for React useSyncExternalStore).
   */
  getSnapshot(): PrintQueueState {
    return this.getState();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Ignore listener errors
      }
    }
  }
}

// Export singleton
export const printQueue = new PrintQueueManagerClass();
export type { PrintQueueManager };
