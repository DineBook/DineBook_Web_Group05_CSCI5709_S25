import { Request, Response } from "express";
import { Review, Restaurant } from "../models/";
import type { AuthenticatedRequest } from "../types/";
import { uploadFileToS3 } from "../services/s3Upload";

const calculateAverageRating = async (restaurantId: string) => {
  try {
    const reviews = await Review.find({ restaurantId });
    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      await Restaurant.findByIdAndUpdate(restaurantId, { _averageRating: 0 });
      return;
    }
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / totalReviews;
    await Restaurant.findByIdAndUpdate(restaurantId, {
      _averageRating: average,
    });
  } catch (error) {
    console.error("Error calculating average rating:", error);
    throw new Error("Failed to update average rating");
  }
};

export const createReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "customer") {
      res.status(403).json({ error: "Only customers can create reviews." });
      return;
    }
    const { restaurantId, rating, comment } = req.body;
    const customerId = req.user.id;

    if (!restaurantId || !rating || !comment) {
      res
        .status(400)
        .json({ error: "Restaurant ID, rating, and comment are required." });
      return;
    }
    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5." });
      return;
    }
    if (comment.trim() === "") {
      res.status(400).json({ error: "Comment cannot be empty." });
      return;
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      res.status(404).json({ error: "Restaurant not found or not active." });
      return;
    }

    const existingReview = await Review.findOne({ customerId, restaurantId });
    if (existingReview) {
      res
        .status(400)
        .json({ error: "You have already reviewed this restaurant." });
      return;
    }

    let imageUrl: string | undefined;
    if (req.file) {
      try {
        console.log("Image file detected, uploading to S3...");
        imageUrl = await uploadFileToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        console.log("Image uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        console.log(
          "Continuing review creation without image due to upload failure"
        );
        imageUrl = undefined;
      }
    }

    const reviewData: any = {
      customerId,
      restaurantId,
      rating,
      comment,
    };

    if (imageUrl) {
      reviewData.imageUrl = imageUrl;
    }

    const review = new Review(reviewData);
    await review.save();
    await calculateAverageRating(restaurantId);

    res.status(201).json({
      message: "Review created successfully",
      review,
    });
    } catch (error) {
    console.error("Review creation error:", error);
    if (
      error instanceof Error &&
      error.name === "MongoServerError" &&
      (error as any).code === 11000
    ) {
      res
        .status(400)
        .json({ error: "You have already reviewed this restaurant." });
    } else {
      res.status(500).json({ error: "Unable to create review at this time. Please try again later." });
    }
  }
};

export const updateReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "customer") {
      res
        .status(403)
        .json({ error: "Only customers can update their reviews." });
      return;
    }
    const { id } = req.params;
    const { rating, comment, removeImage } = req.body;
    const customerId = req.user.id;

    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({ error: "Rating must be between 1 and 5." });
      return;
    }
    if (comment && comment.trim() === "") {
      res.status(400).json({ error: "Comment cannot be empty." });
      return;
    }

    const review = await Review.findOne({ _id: id, customerId });

    if (!review) {
      res.status(404).json({
        error: "Review not found or you do not have permission to update it.",
      });
      return;
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    if (removeImage === true || removeImage === 'true') {
      review.imageUrl = undefined;
      console.log("Image removed from review");
    }

    if (req.file) {
      try {
        console.log(
          "Image file detected for review update, uploading to S3..."
        );
        const imageUrl = await uploadFileToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        review.imageUrl = imageUrl;
        console.log("Image uploaded successfully:", imageUrl);
      } catch (uploadError) {
        console.error("S3 upload failed during review update:", uploadError);
        res.status(500).json({
          error: "Failed to upload image. Please try again.",
        });
        return;
      }
    }

    await review.save();
    await calculateAverageRating(review.restaurantId.toString());

    res.json({
      message: "Review updated successfully",
      review,
    });
    } catch (error) {
    console.error("Review update error:", error);
    res.status(500).json({ error: "Unable to update review at this time. Please try again later." });
  }
};

export const deleteReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "customer") {
      res
        .status(403)
        .json({ error: "Only customers can delete their reviews." });
      return;
    }
    const { id } = req.params;
    const customerId = req.user.id;

    const review = await Review.findOneAndDelete({ _id: id, customerId });

    if (!review) {
      res.status(404).json({
        error: "Review not found or you do not have permission to delete it.",
      });
      return;
    }

    await calculateAverageRating(review.restaurantId.toString());

    res.json({
      message: "Review deleted successfully",
    });
    } catch (error) {
    console.error("Review deletion error:", error);
    res.status(500).json({ error: "Unable to delete review at this time. Please try again later." });
  }
};

export const getReviewsByRestaurant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      res.status(404).json({ error: "Restaurant not found or not active." });
      return;
    }

    const reviews = await Review.find({ restaurantId })
      .populate("customerId", "name")
      .sort({ createdAt: -1 });

    res.json({
      restaurantId,
      restaurantName: restaurant.name,
      reviews,
    });
    } catch (error) {
    console.error("Reviews fetch error:", error);
    res.status(500).json({ error: "Unable to fetch reviews at this time. Please try again later." });
  }
};

export const replyToReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "owner") {
      res
        .status(403)
        .json({ error: "Only restaurant owners can reply to reviews." });
      return;
    }
    const { id } = req.params;
    const { reply } = req.body;
    const ownerId = req.user.id;

    if (!reply || reply.trim() === "") {
      res.status(400).json({ error: "Reply cannot be empty." });
      return;
    }

    const review = await Review.findById(id).populate("restaurantId");

    if (!review) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const restaurant = review.restaurantId as any;
    if (restaurant.ownerId.toString() !== ownerId) {
      res
        .status(403)
        .json({ error: "You do not have permission to reply to this review." });
      return;
    }

    review.ownerReply = reply;
    await review.save();

    res.json({
      message: "Reply added successfully",
      review,
    });
    } catch (error) {
    console.error("Review reply error:", error);
    res.status(500).json({ error: "Unable to add reply at this time. Please try again later." });
  }
};

export const getMyReviews = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "customer") {
      res.status(403).json({ error: "Only customers can view their reviews." });
      return;
    }
    const customerId = req.user.id;
    const reviews = await Review.find({ customerId })
      .populate("restaurantId", "name")
      .sort({ createdAt: -1 });
    res.json({
      reviews,
    });
    } catch (error) {
    console.error("Fetch my reviews error:", error);
    res.status(500).json({ error: "Unable to fetch your reviews at this time. Please try again later." });
  }
};

export const updateReply = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "owner") {
      res
        .status(403)
        .json({ error: "Only restaurant owners can update replies." });
      return;
    }
    const { id } = req.params;
    const { reply } = req.body;
    const ownerId = req.user.id;

    if (!reply || reply.trim() === "") {
      res.status(400).json({ error: "Reply cannot be empty." });
      return;
    }

    const review = await Review.findById(id).populate("restaurantId");

    if (!review) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const restaurant = review.restaurantId as any;
    if (restaurant.ownerId.toString() !== ownerId) {
      res
        .status(403)
        .json({ error: "You do not have permission to update this reply." });
      return;
    }

    review.ownerReply = reply;
    await review.save();

    res.json({
      message: "Reply updated successfully",
      review,
    });
    } catch (error) {
    console.error("Reply update error:", error);
    res.status(500).json({ error: "Unable to update reply at this time. Please try again later." });
  }
};

export const deleteReply = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user.role !== "owner") {
      res
        .status(403)
        .json({ error: "Only restaurant owners can delete replies." });
      return;
    }
    const { id } = req.params;
    const ownerId = req.user.id;

    const review = await Review.findById(id).populate("restaurantId");

    if (!review) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const restaurant = review.restaurantId as any;
    if (restaurant.ownerId.toString() !== ownerId) {
      res
        .status(403)
        .json({ error: "You do not have permission to delete this reply." });
      return;
    }

    review.ownerReply = "";
    await review.save();

    res.json({
      message: "Reply deleted successfully",
      review,
    });
    } catch (error) {
    console.error("Reply deletion error:", error);
    res.status(500).json({ error: "Unable to delete reply at this time. Please try again later." });
  }
};
