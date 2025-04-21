import type { IFeedback, IFeedbackStatistics } from '../types';
import apiService from './api.service';

class FeedbackService {
  // Endpoint'i doğru değerle güncelliyoruz
  private endpoint = '/feedback';

  // Get all feedback
  public async getFeedbacks(params?: {
    table_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<IFeedback[]> {
    try {
      const response = await apiService.get<IFeedback[]>(this.endpoint, params);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to get feedbacks from API');
      return [];
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      return [];
    }
  }

  // Get feedback by ID
  public async getFeedbackById(id: number): Promise<IFeedback | null> {
    try {
      const response = await apiService.get<IFeedback>(`${this.endpoint}/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      console.log(`Feedback with ID ${id} not found`);
      return null;
    } catch (error) {
      console.error(`Error fetching feedback with ID ${id}:`, error);
      return null;
    }
  }

  // Create new feedback
  public async createFeedback(feedbackData: Partial<IFeedback>): Promise<IFeedback | null> {
    try {
      const response = await apiService.post<IFeedback>(this.endpoint, feedbackData);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to create feedback via API');
      return null;
    } catch (error) {
      console.error('Error creating feedback:', error);
      return null;
    }
  }

  // Delete feedback
  public async deleteFeedback(id: number): Promise<boolean> {
    try {
      const response = await apiService.delete(`${this.endpoint}/${id}`);

      if (response.success) {
        return true;
      }

      console.log(`Failed to delete feedback with ID ${id}`);
      return false;
    } catch (error) {
      console.error(`Error deleting feedback with ID ${id}:`, error);
      return false;
    }
  }

  // Get feedback statistics
  public async getFeedbackStatistics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<IFeedbackStatistics | null> {
    try {
      const response = await apiService.get<IFeedbackStatistics>(`${this.endpoint}/statistics`, params);

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to get feedback statistics');
      return null;
    } catch (error) {
      console.error('Error fetching feedback statistics:', error);
      return null;
    }
  }

  // Get recent feedback
  public async getRecentFeedback(limit = 5): Promise<IFeedback[]> {
    try {
      const response = await apiService.get<IFeedback[]>(`${this.endpoint}/recent`, { limit });

      if (response.success && response.data) {
        return response.data;
      }

      console.log('Failed to get recent feedback');
      return [];
    } catch (error) {
      console.error('Error fetching recent feedback:', error);
      return [];
    }
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
