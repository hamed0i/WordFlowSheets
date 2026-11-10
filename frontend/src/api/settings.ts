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

    getHeaders: (credentials: SheetCredentialsForm) =>
        request(
            '/settings/headers',
            headersResponseSchema,
            {
                method: 'POST',
                body: JSON.stringify({
                    credentials,
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
    getGeneralSettings: () =>
        request<{ success: boolean; data: { searchMetaKey: string } }>(
            '/general-settings',
            z.object({
                success: z.literal(true),
                data: z.object({ searchMetaKey: z.string() }),
            })
        ),

    updateGeneralSettings: (searchMetaKey: string) =>
        request<{ success: boolean; data: { searchMetaKey: string } }>(
            '/general-settings',
            z.object({
                success: z.literal(true),
                data: z.object({ searchMetaKey: z.string() }),
            }),
            {
                method: 'POST',
                body: JSON.stringify({ searchMetaKey }),
            }
        ),
};