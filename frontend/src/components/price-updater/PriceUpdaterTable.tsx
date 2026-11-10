import {toPersianDigits} from '../../utils/numbers';
import type {PriceUpdaterRow, PriceUpdaterTable as PriceUpdaterTableData} from '../../types/priceUpdater';
import {PriceUpdaterTableRow} from './PriceUpdaterTableRow';

type PriceUpdaterTableProps = {
    sort: {key: string; direction: string};
    onSort: (key: string) => void;
    table: PriceUpdaterTableData | null;
    loading: boolean;
    error: string | null;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    onRowUpdate: (
        rowId: number,
        changes: Partial<PriceUpdaterRow>,
    ) => void;
};
export const PriceUpdaterTable = ({
                                      sort, onSort, table,
                                      loading,
                                      error,
                                      onPageChange,
                                      onPerPageChange,
                                      onRowUpdate,
                                  }: PriceUpdaterTableProps) => {
    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                در حال دریافت اطلاعات...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-600">
                {toPersianDigits(error!)}
            </div>
        );
    }

    if (!table || table.items.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                اطلاعاتی برای نمایش وجود ندارد.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                    <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900">
                        <th aria-sort={sort.key === 'product' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('product')} className="inline-flex items-center gap-2">محصول <span aria-hidden="true">{sort.key === 'product' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                            ویژگی
                        </th>
                        <th aria-sort={sort.key === 'sheetPrice' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('sheetPrice')} className="inline-flex items-center gap-2">قیمت شیت <span aria-hidden="true">{sort.key === 'sheetPrice' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th aria-sort={sort.key === 'sitePrice' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('sitePrice')} className="inline-flex items-center gap-2">قیمت سایت <span aria-hidden="true">{sort.key === 'sitePrice' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th aria-sort={sort.key === 'stockQuantity' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('stockQuantity')} className="inline-flex items-center gap-2">موجودی <span aria-hidden="true">{sort.key === 'stockQuantity' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th aria-sort={sort.key === 'listName' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('listName')} className="inline-flex items-center gap-2">لیست قیمت <span aria-hidden="true">{sort.key === 'listName' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th aria-sort={sort.key === 'status' ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-xs font-semibold text-slate-500"><button type="button" onClick={() => onSort('status')} className="inline-flex items-center gap-2">وضعیت <span aria-hidden="true">{sort.key === 'status' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                            عملیات
                        </th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                    {table.items.map((row) => (
                        <PriceUpdaterTableRow
                            key={row.id}
                            row={row}
                            onRowUpdate={onRowUpdate}
                        />
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <span className="text-xs text-slate-500">
                    {table.total.toLocaleString('fa-IR')} مورد
                </span>
                <div className="flex items-center gap-2">
    <span className="text-xs text-slate-500">
        نمایش
    </span>

                    <select
                        value={table.perPage}
                        onChange={(event) => {
                            onPerPageChange(Number(event.target.value));
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    >
                        {[20, 50, 100, 200, 300, 500].map((value) => (
                            <option key={value} value={value}>
                                {value.toLocaleString('fa-IR')}
                            </option>
                        ))}
                    </select>

                    <span className="text-xs text-slate-500">
        مورد در صفحه
    </span>
                </div>
                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        disabled={table.page <= 1}
                        onClick={() => onPageChange(table.page - 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        قبلی
                    </button>

                    <span className="px-2 text-xs text-slate-500">
                        صفحه {table.page.toLocaleString('fa-IR')} از{' '}
                        {table.totalPages.toLocaleString('fa-IR')}
                    </span>

                    <button
                        type="button"
                        disabled={table.page >= table.totalPages}
                        onClick={() => onPageChange(table.page + 1)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        بعدی
                    </button>
                </div>
            </div>
        </div>
    );
};