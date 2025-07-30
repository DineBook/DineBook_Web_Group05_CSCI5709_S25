/**
 * Utility functions for consistent price range formatting across the application
 */

export interface PriceRangeOption {
    value: number | string;
    label: string;
    icon?: string;
}

/**
 * Standard price range options for filters and forms
 */
export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
    { value: '1', label: '$10 - $20', icon: '$' },
    { value: '2', label: '$20 - $40', icon: '$$' },
    { value: '3', label: '$40 - $60', icon: '$$$' },
    { value: '4', label: '$60+', icon: '$$$$' },
];

/**
 * Price range options for management forms (using number values)
 */
export const PRICE_RANGE_MANAGEMENT_OPTIONS: PriceRangeOption[] = [
    { value: 1, label: '$10 - $20' },
    { value: 2, label: '$20 - $40' },
    { value: 3, label: '$40 - $60' },
    { value: 4, label: '$60+' },
];

/**
 * Format price range number to display string
 * @param priceRange - The price range number (1-4)
 * @returns Formatted price range string
 */
export function formatPriceRange(priceRange: number): string {
    const priceRanges = {
        1: '$10 - $20',
        2: '$20 - $40',
        3: '$40 - $60',
        4: '$60+',
    };
    return priceRanges[priceRange as keyof typeof priceRanges] || 'Price varies';
}

/**
 * Get price range icon based on range number
 * @param priceRange - The price range number (1-4)
 * @returns Price range icon string
 */
export function getPriceRangeIcon(priceRange: number): string {
    const icons = {
        1: '$',
        2: '$$',
        3: '$$$',
        4: '$$$$',
    };
    return icons[priceRange as keyof typeof icons] || '$';
}

/**
 * Get price range description for accessibility
 * @param priceRange - The price range number (1-4)
 * @returns Price range description
 */
export function getPriceRangeDescription(priceRange: number): string {
    const descriptions = {
        1: 'Budget-friendly dining',
        2: 'Moderate pricing',
        3: 'Higher-end dining',
        4: 'Premium fine dining',
    };
    return descriptions[priceRange as keyof typeof descriptions] || 'Variable pricing';
}
