import { ConversionJobState } from '@models/types';

/**
 * State Manager
 * Manages conversion job state and checkpoints
 */
export class StateManager {
  private states: Map<string, ConversionJobState> = new Map();

  /**
   * Save job state
   */
  async saveState(jobId: string, state: ConversionJobState): Promise<void> {
    this.states.set(jobId, { ...state });
  }

  /**
   * Get job state
   */
  async getState(jobId: string): Promise<ConversionJobState | null> {
    return this.states.get(jobId) || null;
  }

  /**
   * Delete job state
   */
  async deleteState(jobId: string): Promise<void> {
    this.states.delete(jobId);
  }

  /**
   * List all job states
   */
  async listStates(): Promise<ConversionJobState[]> {
    return Array.from(this.states.values());
  }
}
