import { request } from './client';
import { productSearchResponseSchema } from '../schemas/products';

export const productsApi = {
    search: (
        search: string,
        limit = 20,
    ) =>
        request(
            `/products/search?search=${encodeURIComponent(search)}&limit=${limit}`,
            productSearchResponseSchema,
        ),
};