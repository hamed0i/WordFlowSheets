import {toPersianDigits} from '../../utils/numbers';
import {useCallback, useEffect, useState} from 'react';
import {settingsApi} from '../../api/settings';
import {priceUpdaterApi} from '../../api/priceUpdater';
import type {SheetSetting} from '../../types/settings';
import type {PriceUpdaterRow, PriceUpdaterTable as PriceUpdaterTableData} from '../../types/priceUpdater';
import {PriceUpdaterTable} from './PriceUpdaterTable';
import {PriceUpdaterToolbar} from './PriceUpdaterToolbar';
import {PriceUpdaterButtons} from './PriceUpdaterButtons';

export const PriceUpdaterPage = () => {
    const [settings, setSettings] = useState<SheetSetting[]>([]);
    const [selectedSlug, setSelectedSlug] = useState('');
    const [table, setTable] = useState<PriceUpdaterTableData | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [tableError, setTableError] = useState<string | null>(null);
    const [sort, setSort] = useState({key: '', direction: 'asc'});
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);

    const loadSettings = useCallback(async (): Promise<void> => {
        setSettingsLoading(true);
        setSettingsError(null);

        try {
            const response = await settingsApi.getAll();
            const nextSettings = response.data;

            setSettings(nextSettings);

            setSelectedSlug((currentSlug) => {
                if (
                    currentSlug &&
                    nextSettings.some(
                        (setting) => setting.slug === currentSlug,
                    )
                ) {
                    return currentSlug;
                }

                return nextSettings[0]?.slug ?? '';
            });
        } catch (error) {
            setSettingsError(
                error instanceof Error
                    ? error.message
                    : 'دریافت تنظیمات شیت با خطا مواجه شد.',
            );
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    const loadTable = useCallback(async (): Promise<void> => {
        if (!selectedSlug) {
            setTable(null);
            setTableLoading(false);
            return;
        }

        setTableLoading(true);
        setTableError(null);

        try {
            const response = await priceUpdaterApi.getTable(
                selectedSlug,
                page,
                perPage, sort.key, sort.direction,
            );

            setTable(response.data);
        } catch (error) {
            setTableError(
                error instanceof Error
                    ? error.message
                    : 'دریافت اطلاعات شیت با خطا مواجه شد.',
            );
        } finally {
            setTableLoading(false);
        }
    }, [selectedSlug, page, perPage, sort.key, sort.direction]);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    useEffect(() => {
        void loadTable();
    }, [loadTable]);

    const handleSlugChange = (slug: string): void => {
        setTable(null);
        setTableError(null);
        setPage(1);
        setSelectedSlug(slug);
    };
    const handlePerPageChange = (value: number): void => {
        setPerPage(value);
        setPage(1);
    };
    const handleUpdated = (): void => {
        void loadTable();
        void settingsApi.getAll().then(response => setSettings(response.data)).catch(() => {});
    };

    const handleRowUpdate = useCallback(
        (rowId: number, changes: Partial<PriceUpdaterRow>): void => {
            setTable((currentTable) => {
                if (!currentTable) {
                    return currentTable;
                }

                return {
                    ...currentTable,
                    items: currentTable.items.map((row) =>
                        row.id === rowId
                            ? {...row, ...changes}
                            : row,
                    ),
                };
            });
        },
        [],
    );

    const selectedSetting = settings.find(
        (setting) => setting.slug === selectedSlug,
    );

    const slug = selectedSetting?.slug ?? '';

    if (settingsLoading) {
        return (
            <div className="app-page bg-slate-50 dark:bg-slate-950 transition-colors">
                <div className="w-full min-w-0">
                    <PriceUpdaterToolbar settings={settings} onSyncCompleted={handleUpdated} />

                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                        در حال دریافت تنظیمات...
                    </div>
                </div>
            </div>
        );
    }

    if (settingsError) {
        return (
            <div className="app-page bg-slate-50 dark:bg-slate-950 transition-colors">
                <div className="w-full min-w-0">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-600">
                        {toPersianDigits(settingsError!)}
                    </div>
                </div>
            </div>
        );
    }

    if (settings.length === 0) {
        return (
            <div className="app-page bg-slate-50 dark:bg-slate-950 transition-colors">
                <div className="w-full min-w-0">
                    <PriceUpdaterToolbar settings={settings} onSyncCompleted={handleUpdated} />

                    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                        <p className="text-sm text-slate-500">
                            هنوز هیچ لیست شیتی ایجاد نشده است.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-page bg-slate-50 dark:bg-slate-950 transition-colors">
            <div className="w-full min-w-0">
                <PriceUpdaterToolbar settings={settings} onSyncCompleted={handleUpdated} />

                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="w-full md:max-w-sm">
                            <p className="mt-0 text-xs font-medium text-slate-400">
                                لیست قیمت
                            </p>

                            <select
                                id="sheet-list-selector"
                                value={selectedSlug}
                                onChange={(event) => {
                                    handleSlugChange(event.target.value);
                                }}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            >
                                {settings.map((setting) => (
                                    <option
                                        key={setting.slug}
                                        value={setting.slug}
                                    >
                                        {toPersianDigits(setting.name)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <PriceUpdaterButtons
                            key={selectedSlug}
                            disabled={settings.find(s => s.slug === selectedSlug)?.disabled ?? false}
                            slug={slug}
                            onUpdated={handleUpdated}
                        />
                    </div>
                </div>

                <PriceUpdaterTable
                    sort={sort}
                    onSort={(key) => {setPage(1); setSort(s => s.key !== key ? {key, direction: 'asc'} : s.direction === 'asc' ? {key, direction: 'desc'} : {key: '', direction: 'asc'});}}
                    table={table}
                    loading={tableLoading}
                    error={tableError}
                    onPageChange={setPage}
                    onPerPageChange={handlePerPageChange}
                    onRowUpdate={handleRowUpdate}
                />
            </div>
        </div>
    );
};