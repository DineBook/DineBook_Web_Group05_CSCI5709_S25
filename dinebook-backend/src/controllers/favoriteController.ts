import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Favorite } from '../models/favorite';
import { Restaurant } from '../models';

export const toggleFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'customer') {
            res.status(403).json({ error: "Only customers can manage favorites." });
            return;
        }

        const { restaurantId } = req.params;
        const userId = req.user.id;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.isActive) {
            res.status(404).json({ error: "Restaurant not found or not active." });
            return;
        }

        const existingFavorite = await Favorite.findOne({ userId, restaurantId });

        if (existingFavorite) {
            await Favorite.deleteOne({ _id: existingFavorite._id });
            res.json({ 
                message: "Restaurant removed from favorites.",
                isFavorited: false 
            });
        } else {
            const favorite = new Favorite({ userId, restaurantId });
            await favorite.save();
            res.status(201).json({ 
                message: "Restaurant added to favorites.",
                isFavorited: true 
            });
        }
    } catch (error) {
        console.error('Favorite toggle error:', error);
        res.status(500).json({ error: "Unable to update favorite at this time. Please try again later." });
    }
};

export const getFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'customer') {
            res.status(403).json({ error: "Only customers can view favorites." });
            return;
        }

        const favorites = await Favorite.find({ userId: req.user.id })
            .populate('restaurantId', 'name cuisine location description _averageRating')
            .sort({ createdAt: -1 });

        res.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: "Unable to fetch favorites at this time. Please try again later." });
    }
};

export const checkFavoriteStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (req.user.role !== 'customer') {
            res.status(403).json({ error: "Only customers can check favorite status." });
            return;
        }

        const { restaurantId } = req.params;
        const userId = req.user.id;

        const favorite = await Favorite.findOne({ userId, restaurantId });
        
        res.json({ isFavorited: !!favorite });
    } catch (error) {
        console.error('Check favorite status error:', error);
        res.status(500).json({ error: "Unable to check favorite status at this time. Please try again later." });
    }
};