export type ProductVariationAttribute = {
    name: string;
    value: string;
};

export type ProductVariation = {
    metaValue?: string | null;
    id: number;
    name: string;
    attributes: ProductVariationAttribute[];
    price: number;
};

export type ProductSearchResult = {
    id: number;
    name: string;
    sku: string;
    type: string;
    metaValue?: string | null;
    variations: ProductVariation[];
};