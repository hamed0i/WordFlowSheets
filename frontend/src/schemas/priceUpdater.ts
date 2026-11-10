import { z } from 'zod';

export const startUpdateItemSchema = z.object({
    id: z.number().int().positive(),
    fullName: z.string(),
    price: z.number().nonnegative(),
    listName: z.string(),
    updated: z.boolean(),
    variationId: z.number().int().optional(),
    oldPrice: z.number().nullable().optional(),
    oldQuantity: z.number().nullable().optional(),
    quantity: z.number().nullable().optional(),
    stockStatus: z.string().optional(),
    stockUnchanged: z.boolean().optional(),
});

const priceUpdaterItemSchema = z.object({
    id: z.number().int(),
    sheetProduct: z.string(),
    sheetVariation: z.string(),
    sheetFullName: z.string(),
    sheetPrice: z.number().int(),
    stockQuantityOverride: z.boolean().default(false),
    stockQuantity: z.number().int().min(-1).max(2147483647).refine((value) => value !== 0),
    sitePrice: z.number().int(),
    variationId: z.number().int().nullable(),
    productName: z.string().nullable(),
    variationName: z.string().nullable(),
    listName: z.string().nullable(),
    productMetaValue: z.string().nullable().optional(),
    status: z.enum([
        'connected',
        'on_hold',
        'unconnected',
    ]),
});

const priceUpdaterSettingSchema = z.object({
    name: z.string(),
    productColumn: z.array(z.string()),
    variationColumn: z.array(z.string()),
    priceColumn: z.array(z.string()),
    bulkConcurrency: z.number().int(),
});

export const priceUpdaterResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        slug: z.string(),
        setting: priceUpdaterSettingSchema,
        items: z.array(priceUpdaterItemSchema),
        pagination: z.object({
            page: z.number().int(),
            perPage: z.number().int(),
            total: z.number().int(),
            totalPages: z.number().int(),
        }),
    }),
});

export const syncResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        slug: z.string(),
        counter: z.number().int(),
    }),
});

export const syncSingleResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.number().int(),
        variationId: z.number().int(),
        price: z.number().int(),
        listName: z.string().nullable(),
        details: startUpdateItemSchema,
        stockStatus: z.enum([
            'instock',
            'outofstock',
            'onbackorder',
        ]),
    }),
});

export const connectVariationResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.number().int(),
        variationId: z.number().int(),
        productName: z.string().nullable().optional(),
        productMetaValue: z.string().nullable().optional(),
        listName: z.string().nullable().optional(),
        status: z.literal('connected'),
    }),
});

export const updateOnHoldResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.number().int(),
        onHold: z.boolean(),
        status: z.enum([
            'on_hold',
            'connected',
        ]),
    }),
});

export const deleteConnectionResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.number().int(),
        variationId: z.number().int().nullable(),
        status: z.literal('unconnected'),
    }),
})

export const regenerateSitePriceResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        slug: z.string(),
        updated: z.number().int(),
        notUpdated: z.number().int(),
        total: z.number().int(),
    }),
});





export const startUpdateResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        items: z.array(startUpdateItemSchema),
        nextItem: startUpdateItemSchema.nullable(),
        processed: z.number().int().nonnegative(),
        lastId: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        completed: z.boolean(),
        total: z.number().int().nonnegative(),
    }),
});


export const disableListResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        slug: z.string(),
        disabled: z.boolean(),
        lastId: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        updated: z.number().int().nonnegative(),
    }),
});

export const updateStockQuantityResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({stockQuantityOverride: z.boolean(), id: z.number().int(), stockQuantity: z.number().int().min(-1).refine((value) => value !== 0)}),
});

export const nextUpdateResponseSchema = z.object({success: z.literal(true), data: z.object({item: startUpdateItemSchema.nullable()})});
export const disablePrepareSchema = z.object({success: z.literal(true), data: z.object({
    tasks: z.array(z.object({id: z.number().int(), variationId: z.number().int(), parentId: z.number().int()})),
    concurrency: z.number().int().min(1).max(20),
})});
export const disableItemSchema = z.object({success: z.literal(true), data: z.object({item: startUpdateItemSchema})});

export const listStateSchema = z.object({success: z.literal(true), data: z.object({slug: z.string(), disabled: z.boolean()})});