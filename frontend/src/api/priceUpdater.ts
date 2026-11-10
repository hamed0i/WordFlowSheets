import {request} from './client';
import {
    connectVariationResponseSchema,
    deleteConnectionResponseSchema,
    disablePrepareSchema, disableItemSchema, listStateSchema,
    priceUpdaterResponseSchema,
    regenerateSitePriceResponseSchema,
    startUpdateResponseSchema,
    syncResponseSchema,
    syncSingleResponseSchema,
    updateOnHoldResponseSchema,
    updateStockQuantityResponseSchema,
    nextUpdateResponseSchema,
} from '../schemas/priceUpdater';
import type {
    PriceUpdaterRow,
    PriceUpdaterTable,
} from '../types/priceUpdater';

const mapPriceUpdaterRow = (
    row: {
        id: number;
        sheetProduct: string;
        sheetVariation: string;
        sheetPrice: number;
        stockQuantity: number;
        stockQuantityOverride: boolean;
        sitePrice: number;
        variationId: number | null;
        productName: string | null;
        productMetaValue?: string | null;
        variationName: string | null;
        listName: string | null;
        status: 'connected' | 'on_hold' | 'unconnected';
    },
    slug: string,
): PriceUpdaterRow => ({
    id: row.id,
    slug,
    product: row.productName ?? row.sheetProduct,
    sheetVariation: row.sheetVariation,
    variation: row.variationName ?? row.sheetVariation,
    sheetPrice: row.sheetPrice,
    stockQuantity: row.stockQuantity,
    stockQuantityOverride: row.stockQuantityOverride,
    sitePrice: row.sitePrice,
    variationId: row.variationId,
    variationName: row.variationName ?? '',
    productName: row.productName ?? '',
    productMetaValue: row.productMetaValue ?? null,
    listName: row.listName ?? '',
    connected: row.status === 'connected' || row.status === 'on_hold',
    onHold: row.status === 'on_hold',
});

export const priceUpdaterApi = {
    importFile: (slug: string, data: {values: string[][]; sheetName: string; format: string}) => {
        const body = JSON.stringify({slug, ...data});
        if (new Blob([body]).size > 20 * 1024 * 1024) throw new Error('حجم داده بیش از ۲۰ مگابایت است.');
        return request('/price-updater/import-file', syncResponseSchema, {method: 'POST', body});
    },
    nextUpdate: (slug: string, signal?: AbortSignal, lastId = 0) =>
        request(`/price-updater/update-next?slug=${encodeURIComponent(slug)}&lastId=${lastId}`, nextUpdateResponseSchema, {signal}),
    updateStockQuantity: (slug: string, id: number, stockQuantity: number) =>
        request('/price-updater/stock-quantity', updateStockQuantityResponseSchema, {
            method: 'POST', body: JSON.stringify({slug, id, stockQuantity}),
        }),
    getTable: async (
        slug: string,
        page = 1,
        perPage = 50,
        sort = '', direction = 'asc',
    ): Promise<{ data: PriceUpdaterTable }> => {
        const response = await request(
            `/price-updater?slug=${encodeURIComponent(slug)}&page=${page}&per_page=${perPage}&sort=${encodeURIComponent(sort)}&direction=${direction}`,
            priceUpdaterResponseSchema,
        );

        return {
            data: {
                items: response.data.items.map((row) =>
                    mapPriceUpdaterRow(row, response.data.slug),
                ),
                page: response.data.pagination.page,
                perPage: response.data.pagination.perPage,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages,
            },
        };
    },

    sync: (slug: string) =>
        request('/price-updater/sync', syncResponseSchema, {
            method: 'POST',
            body: JSON.stringify({slug}),
        }),

    syncSingle: (slug: string, id: number) =>
        request('/price-updater/sync-single', syncSingleResponseSchema, {
            method: 'POST',
            body: JSON.stringify({slug, id}),
        }),

    connectVariation: (
        slug: string,
        id: number,
        variationId: number,
    ) =>
        request('/price-updater/connect', connectVariationResponseSchema, {
            method: 'POST',
            body: JSON.stringify({
                slug,
                id,
                variationId,
            }),
        }),

    updateOnHold: (
        slug: string,
        id: number,
        onHold: boolean,
    ) =>
        request('/price-updater/on-hold', updateOnHoldResponseSchema, {
            method: 'POST',
            body: JSON.stringify({
                slug,
                id,
                onHold,
            }),
        }),

    deleteConnection: (
        slug: string,
        id: number,
    ) =>
        request(
            `/price-updater/connection?slug=${encodeURIComponent(slug)}&id=${id}`,
            deleteConnectionResponseSchema,
            {
                method: 'DELETE',
            },
        ),


    regenerateSitePrice: (slug: string) =>
        request(
            '/price-updater/regenerate-site-price',
            regenerateSitePriceResponseSchema,
            {
                method: 'POST',
                body: JSON.stringify({slug}),
            },
        ),

    startUpdate: (
        slug: string,
        lastId = 0,
        batchSize = 50,
        signal?: AbortSignal,
    ) =>
        request(
            `/price-updater/start-update`,
            startUpdateResponseSchema,
            {
                method: 'POST',
                body: JSON.stringify({
                    slug,
                    lastId,
                    batchSize,
                }),
                signal,
            },
        ),

    prepareUpdate: (slug: string) => request('/price-updater/start-update', disablePrepareSchema, {
        method: 'POST', body: JSON.stringify({slug, action: 'prepare'}),
    }),
    updateItem: (slug: string, id: number, allActive = false) => request('/price-updater/start-update', disableItemSchema, {
        method: 'POST', body: JSON.stringify({slug, action: 'item', id, allActive}),
    }),
    enableList: (slug: string) => request('/price-updater/disable-list', listStateSchema, {method: 'POST', body: JSON.stringify({slug, action: 'enable'})}),
    prepareDisable: (slug: string) => request('/price-updater/disable-list', disablePrepareSchema, {
        method: 'POST', body: JSON.stringify({slug, action: 'prepare'}),
    }),
    disableItem: (slug: string, id: number) => request('/price-updater/disable-list', disableItemSchema, {
        method: 'POST', body: JSON.stringify({slug, action: 'item', id}),
    }),
};