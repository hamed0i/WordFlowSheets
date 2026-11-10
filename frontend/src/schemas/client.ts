import { z } from 'zod';

declare global {
    interface Window {
        sheetsExcelUpdaterConfig?: {
            apiUrl: string;
            nonce: string;
        };
    }
}

const getConfig = () => {
    const config = window.sheetsExcelUpdaterConfig;

    if (!config?.apiUrl || !config.nonce) {
        throw new Error(
            'Sheets Excel Updater API configuration is missing.',
        );
    }

    return config;
};

const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestInit = {},
): Promise<T> => {
    const config = getConfig();

    const response = await fetch(`${config.apiUrl}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-WP-Nonce': config.nonce,
            ...options.headers,
        },
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
        throw new Error(
            payload &&
            typeof payload === 'object' &&
            'message' in payload &&
            typeof payload.message === 'string'
                ? payload.message
                : 'درخواست با خطا مواجه شد.',
        );
    }

    return schema.parse(payload);
};

export { request };