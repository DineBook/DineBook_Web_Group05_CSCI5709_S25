import express from 'express';
import { toggleFavorite, getFavorites, checkFavoriteStatus } from '../controllers/favoriteController';
import { authenticate } from '../utils';

const router = express.Router();

router.use(authenticate as any);

router.get('/', getFavorites as any);

router.get('/:restaurantId/status', checkFavoriteStatus as any);

router.post('/:restaurantId', toggleFavorite as any);

export default router;