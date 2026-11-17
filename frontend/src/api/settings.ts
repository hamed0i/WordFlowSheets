import { z } from 'zod';
import { request } from './client';
import {
    deleteSettingResponseSchema,
    headersResponseSchema,
    settingResponseSchema,
    settingsResponseSchema,
} from '../schemas/settings';
import type {
    SheetCredentialsForm,
    SheetSettingPayload,
} from '../types/settings';

const generalSettingsSchema = z.object({
    success: z.literal(true),
    data: z.object({
        searchMetaKey: z.string(),
        worker: z.object({useWorker: z.boolean(), workerUrl: z.string(), hasWorkerToken: z.boolean()}),
    }),
});

export const settingsApi = {
    reorder: (slugs: string[]) => request('/settings/reorder', settingsResponseSchema, {method: 'POST', body: JSON.stringify({slugs})}),
    getAll: () =>
        request(
            '/settings',
            settingsResponseSchema,
        ),

    get: (slug: string) =>
        request(
            `/settings/${encodeURIComponent(slug)}`,
            settingResponseSchema,
        ),

    save: (setting: SheetSettingPayload) =>
        request(
            '/settings',
            settingResponseSchema,
            {
                method: 'POST',
                body: JSON.stringify(setting),
            },
        ),

    remove: (slug: string) =>
        request(
            `/settings/${encodeURIComponent(slug)}`,
            deleteSettingResponseSchema,
            {
                method: 'DELETE',
            },
        ),

    getHeaders: (credentials: SheetCredentialsForm, slug = '') =>
        request(
            '/settings/headers',
            headersResponseSchema,
            {
                method: 'POST',
                body: JSON.stringify({
                    credentials,
                    slug,
                }),
            },
        ),

    getHeadersForSetting: (slug: string) =>
        request(
            `/settings/${encodeURIComponent(slug)}/headers`,
            headersResponseSchema,
            {
                method: 'POST',
            },
        ),
    getGeneralSettings: () => request('/general-settings', generalSettingsSchema),
    updateGeneralSettings: (searchMetaKey: string, worker: {useWorker: boolean; workerUrl: string; workerToken: string}) => {
        const token = worker.workerToken.trim();
        if (token && (token.length < 32 || token.length > 256 || /[^\x21-\x7E]/.test(token))) {
            throw new Error('کلید ورکر باید ۳۲ تا ۲۵۶ کاراکتر ASCII قابل چاپ، بدون فاصله یا خط جدید باشد؛ علامت‌های ویژه مجازند.');
        }
        return request('/general-settings', generalSettingsSchema, {
            method: 'POST', body: JSON.stringify({searchMetaKey, worker: {
                useWorker: worker.useWorker, workerUrl: worker.workerUrl,
                workerTokenEncoded: btoa(token),
            }}),
        });
    },
};
