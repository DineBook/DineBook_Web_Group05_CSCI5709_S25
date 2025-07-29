import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface Review {
  _id?: string;
  customerId: {
    _id: string;
    name: string;
  };
  restaurantId:
    | string
    | {
        _id: string;
        name: string;
      };
  rating: number;
  comment: string;
  ownerReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  restaurantId: string;
  rating: number;
  comment: string;
  image?: File; // Optional image file for review creation
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  image?: File; // Optional image file for update
}

export interface ReplyToReviewRequest {
  reply: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private apiUrl = 'http://localhost:3000/api';
  private reviewsSubject = new BehaviorSubject<Review[]>([]);
  public reviews$ = this.reviewsSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  // Create a new review (customer only)
  createReview(reviewData: CreateReviewRequest): Observable<any> {
    // If an image is present, use FormData for multipart/form-data
    if (reviewData.image) {
      const formData = new FormData();
      formData.append('restaurantId', reviewData.restaurantId);
      formData.append('rating', reviewData.rating.toString());
      formData.append('comment', reviewData.comment);
      formData.append('image', reviewData.image);

      // For FormData, don't set Content-Type header - let the browser set it
      const headers = this.getAuthHeaders();
      return this.http.post(`${this.apiUrl}/reviews`, formData, {
        headers: headers,
      });
    } else {
      // No image, send regular JSON
      return this.http.post(
        `${this.apiUrl}/reviews`,
        {
          restaurantId: reviewData.restaurantId,
          rating: reviewData.rating,
          comment: reviewData.comment,
        },
        {
          headers: this.getHeaders(),
        }
      );
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  // Update a review (customer only, own review)
  updateReview(
    reviewId: string,
    reviewData: UpdateReviewRequest
  ): Observable<any> {
    // If there is an image, use FormData
    if (reviewData.image) {
      const formData = new FormData();
      if (reviewData.rating !== undefined)
        formData.append('rating', reviewData.rating.toString());
      if (reviewData.comment !== undefined)
        formData.append('comment', reviewData.comment);
      formData.append('image', reviewData.image);

      // Remove Content-Type so browser sets it for FormData
      return this.http.put(`${this.apiUrl}/reviews/${reviewId}`, formData, {
        headers: this.getHeaders().delete('Content-Type'),
      });
    } else {
      // No image, send as JSON
      return this.http.put(`${this.apiUrl}/reviews/${reviewId}`, reviewData, {
        headers: this.getHeaders(),
      });
    }
  }

  // Delete a review (customer only, own review)
  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}`, {
      headers: this.getHeaders(),
    });
  }

  // Get all reviews for a restaurant (public)
  getReviewsByRestaurant(restaurantId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reviews/restaurant/${restaurantId}`);
  }

  // Get customer's own reviews (customer only)
  getMyReviews(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reviews/my-reviews`, {
      headers: this.getHeaders(),
    });
  }

  // Reply to a review (owner only)
  replyToReview(
    reviewId: string,
    replyData: ReplyToReviewRequest
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/reviews/${reviewId}/reply`,
      replyData,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // Update reply to a review (owner only)
  updateReply(
    reviewId: string,
    replyData: ReplyToReviewRequest
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/reviews/${reviewId}/reply`,
      replyData,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // Delete reply to a review (owner only)
  deleteReply(reviewId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}/reply`, {
      headers: this.getHeaders(),
    });
  }

  // Helper method to update reviews in subject
  updateReviewsSubject(reviews: Review[]): void {
    this.reviewsSubject.next(reviews);
  }

  // Helper method to get star array for display
  getStarArray(rating: number): { icon: string; filled: boolean }[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push({
        icon: i <= rating ? 'star' : 'star_border',
        filled: i <= rating,
      });
    }
    return stars;
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
