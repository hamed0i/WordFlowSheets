import { z } from 'zod';

export const productVariationAttributeSchema = z.object({
    name: z.string(),
    value: z.string(),
});

export const productVariationSchema = z.object({
    metaValue: z.string().nullable().optional(),
    id: z.number().int().positive(),
    name: z.string(),
    attributes: z.array(productVariationAttributeSchema),
    price: z.number().nonnegative(),
});

export const productSearchResultSchema = z.object({
    id: z.number().int().positive(),
    name: z.string(),
    sku: z.string(),
    type: z.string(),
    metaValue: z.string().nullable().optional(),
    variations: z.array(productVariationSchema),
});

export const productSearchResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(productSearchResultSchema),
});