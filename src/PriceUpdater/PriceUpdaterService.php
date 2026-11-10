<?php

namespace SheetsExcelUpdater\PriceUpdater;

use SheetsExcelUpdater\Api\GoogleSheetsService;
use SheetsExcelUpdater\Settings\SettingsService;
use WP_Error;

defined('ABSPATH') || exit;

final class PriceUpdaterService
{
	private const DEFAULT_PER_PAGE = 50;
	private const MAX_PER_PAGE = 1000;
	
	public function __construct(
		private readonly PriceUpdaterRepository $repository,
		private readonly SettingsService $settings,
		private readonly GoogleSheetsService $googleSheets
	) {
	}
	
	public function getTable(
		string $slug,
		int $page = 1,
		int $perPage = self::DEFAULT_PER_PAGE,
        string $sort = '', string $direction = 'asc'
	): array|WP_Error {
		$slug = sanitize_key($slug);
		
		if ($slug === '') {
			return new WP_Error(
				'invalid_slug',
				'شناسه شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$setting = $this->settings->get($slug);
		
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found',
				'تنظیمات شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		$page = max(1, $page);
		$perPage = min(
			self::MAX_PER_PAGE,
			max(1, $perPage)
		);
		
		$total = $this->repository->count($slug);
		
		return [
			'slug' => $slug,
			'setting' => [
				'name' => $setting['name'],
				'productColumn' => $setting['productColumn'],
				'variationColumn' => $setting['variationColumn'],
				'priceColumn' => $setting['priceColumn'],
				'bulkConcurrency' => $setting['bulkConcurrency'],
			],
			'items' => array_map(
				[$this, 'mapRow'],
				$this->repository->paginate(
					$slug,
					$page,
					$perPage, $sort, $direction, (int) ($setting['defaultStockQuantity'] ?? 1)
				)
			),
			'pagination' => [
				'page' => $page,
				'perPage' => $perPage,
				'total' => $total,
				'totalPages' => $total > 0
					? (int) ceil($total / $perPage)
					: 1,
			],
		];
	}
	
	public function sync(string $slug): array|WP_Error
	{
		$slug = sanitize_key($slug);
		
		if ($slug === '') {
			return new WP_Error(
				'invalid_slug',
				'شناسه شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$setting = $this->settings->getInternal($slug);
		
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found',
				'تنظیمات شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		$credentials = $setting['credentials'] ?? [];
		
		if (!is_array($credentials)) {
			return new WP_Error(
				'invalid_credentials',
				'اطلاعات اتصال شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$rows = $this->googleSheets->getRows(
			(string) ($credentials['spreadsheetId'] ?? ''),
			(string) ($credentials['apiKey'] ?? ''),
			(string) ($credentials['sheetName'] ?? ''),
			(string) ($credentials['range'] ?? '')
		);

		if (is_wp_error($rows)) {
			return $rows;
		}
		
		return $this->syncRows($slug, $setting, $rows);
	}

    public function importFileRows(string $slug, mixed $values, string $sheetName, string $format): array|WP_Error
    {
        $slug = sanitize_key($slug);
        $setting = $this->settings->getInternal($slug);
        if ($setting === null) {
            return new WP_Error('setting_not_found', 'تنظیمات شیت پیدا نشد.', ['status' => 404]);
        }
        $credentials = $setting['credentials'] ?? [];
        if (!in_array($format, ['csv', 'xlsx', 'xls'], true) ||
            ($format !== 'csv' && $sheetName !== (string) ($credentials['sheetName'] ?? ''))) {
            return new WP_Error('invalid_sheet', 'نام برگه فایل با نام شیت در تنظیمات مطابقت ندارد.', ['status' => 400]);
        }
        if (!is_array($values) || count($values) < 2 || count($values) > 50000) {
            return new WP_Error('invalid_file', 'فایل باید دارای عنوان ستون‌ها و داده باشد؛ حداکثر ۵۰٬۰۰۰ ردیف.', ['status' => 400]);
        }
        $cells = 0;
        foreach ($values as $row) {
            if (!is_array($row) || count($row) > 512) {
                return new WP_Error('invalid_file', 'ساختار ستون‌های فایل معتبر نیست.', ['status' => 400]);
            }
            $cells += count($row);
            foreach ($row as $cell) {
                if ((!is_scalar($cell) && $cell !== null) || (is_string($cell) && strlen($cell) > 10000)) {
                    return new WP_Error('invalid_file', 'مقدار سلول فایل معتبر نیست.', ['status' => 400]);
                }
            }
        }
        if ($cells > 1000000) {
            return new WP_Error('file_too_large', 'تعداد سلول‌های فایل بیش از حد مجاز است.', ['status' => 400]);
        }
        // Full-sheet exports use the same configured A1 range as Google Sheets.
        $range = str_replace('$', '', trim((string) ($credentials['range'] ?? '')));
        if ($range !== '') {
            if (!preg_match('/^([A-Z]+)([1-9][0-9]*)?(?::([A-Z]+)([1-9][0-9]*)?)?$/i', $range, $m)) {
                return new WP_Error('invalid_range', 'بازه تنظیمات باید به شکل A1:Z یا A1:Z1000 باشد.', ['status' => 400]);
            }
            $columnIndex = static function (string $letters): int {
                $n = 0;
                foreach (str_split(strtoupper($letters)) as $letter) { $n = $n * 26 + ord($letter) - 64; }
                return $n - 1;
            };
            $firstCol = $columnIndex($m[1]);
            $lastCol = $columnIndex($m[3] ?? $m[1]);
            $firstRow = max(0, (int) ($m[2] ?? 1) - 1);
            $lastRow = isset($m[4]) && $m[4] !== '' ? (int) $m[4] : count($values);
            $values = array_map(static fn($row) => array_slice($row, $firstCol, $lastCol - $firstCol + 1),
                array_slice($values, $firstRow, max(0, $lastRow - $firstRow)));
        }
        $rows = $this->googleSheets->parseValues($values);
        if (is_wp_error($rows)) { return $rows; }
        $required = array_unique(array_merge(
            $this->normalizeColumns($setting['productColumn'] ?? []),
            $this->normalizeColumns($setting['variationColumn'] ?? []),
            $this->normalizeColumns($setting['priceColumn'] ?? [])
        ));
        $headers = array_keys($rows[0] ?? []);
        $missing = array_diff($required, $headers);
        if ($rows === [] || $missing !== []) {
            return new WP_Error('missing_columns', 'فایل خالی است یا ستون‌های تنظیم‌شده را ندارد: ' . implode('، ', $missing), ['status' => 400]);
        }
        // Validate every parallel table before resetting any stored price.
        foreach ($rows as $row) {
            if (array_diff($required, array_keys($row)) !== []) {
                return new WP_Error('missing_columns', 'ستون‌های یکی از جدول‌های فایل با تنظیمات مطابقت ندارد.', ['status' => 400]);
            }
        }
        $productHeaders = $this->normalizeColumns($setting['productColumn'] ?? []);
        if (!array_filter($rows, fn($row) => $this->buildProductName($row, $productHeaders) !== '')) {
            return new WP_Error('empty_file', 'هیچ کالای معتبری در فایل پیدا نشد.', ['status' => 400]);
        }
        return $this->syncRows($slug, $setting, $rows);
    }

	private function syncRows(string $slug, array $setting, array $rows): array|WP_Error
	{

		$productHeaders = $this->normalizeColumns(
			$setting['productColumn'] ?? []
		);
		
		$variationHeaders = $this->normalizeColumns(
			$setting['variationColumn'] ?? []
		);
		
		$priceHeaders = $this->normalizeColumns(
			$setting['priceColumn'] ?? []
		);
		
		$priceIncrease = (string) ($setting['priceIncrease'] ?? ((string) ($setting['upscalePercent'] ?? 0) . '%'));
		$roundingZeros = (int) ($setting['roundingZeros'] ?? 3);

		$this->repository->beginTransaction();
		
		try {
			if (!$this->repository->resetSheetPrices($slug)) {
				throw new \RuntimeException(
					$this->repository->lastError()
				);
			}
			
			$counter = 0;
			
			foreach ($rows as $row) {
				$sheetProduct = $this->buildProductName(
					$row,
					$productHeaders
				);
				
				if ($sheetProduct === '') {
					continue;
				}
				
				$variationGroups = $this->buildVariationGroups(
					$row,
					$variationHeaders
				);
				
				$combinations = $variationGroups === []
					? [[]]
					: $this->cartesian($variationGroups);
				
				$sheetPrice = $this->calculatePrice(
					$row,
					$priceHeaders,
					$priceIncrease,
					$roundingZeros
				);
				
				foreach ($combinations as $combination) {
					$sheetVariation = implode(
						' ',
						$combination
					);
					
					$sheetFullName = trim(
						$sheetProduct . ' ' . $sheetVariation
					);
					
					if ($sheetFullName === '') {
						continue;
					}
					
					$saved = $this->repository->upsert([
						'sheet_slug' => $slug,
						'sheet_full_name' => $sheetFullName,
						'sheet_product' => $sheetProduct,
						'sheet_variation' => $sheetVariation,
						'sheet_price' => $sheetPrice,
					]);

					if (!$saved) {
						throw new \RuntimeException(
							$this->repository->lastError()
						);
					}
					
					$counter++;
					
				}
			}
			
			$this->repository->commit();

			return [
				'slug' => $slug,
				'counter' => $counter,
			];
		} catch (\Throwable $exception) {
			$this->repository->rollback();
			
			return new WP_Error(
				'sheet_sync_failed',
				'همگام‌سازی شیت انجام نشد.',
				[
					'status' => 500,
					'error' => $exception->getMessage(),
				]
			);
		}
	}
	
	private function normalizeColumns(mixed $columns): array
	{
		if (!is_array($columns)) {
			return [];
		}
		
		$result = [];
		
		foreach ($columns as $column) {
			if (!is_string($column)) {
				continue;
			}
			
			$column = trim($column);
			
			if ($column !== '') {
				$result[] = $column;
			}
		}
		
		return array_values(array_unique($result));
	}
	
	private function buildProductName(
		array $row,
		array $headers
	): string {
		$parts = [];
		
		foreach ($headers as $header) {
			$value = $row[$header] ?? '';
			
			if (!is_scalar($value)) {
				continue;
			}
			
			$value = trim((string) $value);
			
			if ($value !== '') {
				$parts[] = $value;
			}
		}
		
		return implode(' ', $parts);
	}
	
	private function buildVariationGroups(
		array $row,
		array $headers
	): array {
		$groups = [];
		
		foreach ($headers as $header) {
			$value = $row[$header] ?? '';
			
			if (!is_scalar($value)) {
				continue;
			}
			
			$value = trim((string) $value);
			
			if ($value === '') {
				continue;
			}
			
			$values = preg_split(
				'/[.\-]/u',
				$value,
				-1,
				PREG_SPLIT_NO_EMPTY
			);
			
			if (!is_array($values)) {
				continue;
			}
			
			$values = array_values(
				array_filter(
					array_map('trim', $values),
					static fn(string $item): bool =>
						$item !== ''
				)
			);
			
			if ($values !== []) {
				$groups[] = $values;
			}
		}
		
		return $groups;
	}
	
	private function calculatePrice(
		array $row,
		array $headers,
		string $priceIncrease,
		int $roundingZeros
	): int {
		$rawPrice = '';
		
		foreach ($headers as $header) {
			$value = $row[$header] ?? '';
			
			if (!is_scalar($value)) {
				continue;
			}
			
			$value = trim((string) $value);
			
			if ($value !== '') {
				$rawPrice .= $value . ' ';
			}
		}
		
		$rawPrice = trim($rawPrice);
		
		if ($rawPrice === '') {
			return 0;
		}
		
		// ۱. تبدیل اعداد فارسی و عربی به انگلیسی
		$persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
		$arabic  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
		$english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
		
		$rawPrice = str_replace($persian, $english, $rawPrice);
		$rawPrice = str_replace($arabic, $english, $rawPrice);
		
		$rawPrice = preg_replace('/[–—−‐־ـ]/u', '-', $rawPrice);
		
		$parts = explode('-', $rawPrice);
		$pricePart = trim($parts[0] ?? '');
		
		$cleanPrice = preg_replace('/[^\d]/', '', $pricePart);
		
		$price = (int) $cleanPrice;
		
		if ($price <= 0) {
			return 0;
		}
		
		$price *= 1000;
		
		return PriceAdjustment::apply((int) $price, $priceIncrease, $roundingZeros);
	}
	
	private function cartesian(array $groups): array
	{
		$result = [[]];
		
		foreach ($groups as $group) {
			$next = [];
			
			foreach ($result as $combination) {
				foreach ($group as $value) {
					$next[] = [
						...$combination,
						$value,
					];
				}
			}
			
			$result = $next;
		}
		return $result;
	}
	
	private function mapRow(object $row): array
	{
		$variationId = absint($row->attr_id);
		$variationName = null;
		$productName = null;
		$productMetaValue = null;
		$status = 'unconnected';
		$sitePrice = (int) $row->site_price;
		
		$metaKey = sanitize_text_field((string) get_option('input_add_meta_search_excel_updater', ''));
		
		if ($variationId > 0) {
			$variation = wc_get_product($variationId);
			
			if ($variation) {
				$variationName = $this->getVariationName($variation);
				$parentId = $variation->get_parent_id();
				
				if ($parentId > 0) {
					$parent = wc_get_product($parentId);
					if ($parent) {
						$productName = $parent->get_name();
						if ($metaKey !== '') {
							$productMetaValue = (string) $parent->get_meta($metaKey, true);
						}
					}
				}
				
				if (empty($productMetaValue) && $metaKey !== '') {
					$productMetaValue = (string) $variation->get_meta($metaKey, true);
				}
				
				$status = (bool) $row->product_onhold ? 'on_hold' : 'connected';
				$currentPrice = $variation->get_price();
				if ($currentPrice !== '') {
					$sitePrice = (int) $currentPrice;
				}
			}
		}
		
		return [
			'id'               => (int) $row->id,
			'sheetProduct'     => (string) $row->sheet_product,
			'sheetVariation'   => (string) $row->sheet_variation,
			'sheetFullName'    => (string) $row->sheet_full_name,
			'sheetPrice'       => (int) $row->sheet_price,
			'stockQuantity'    => $this->effectiveStockQuantity($row),
			'stockQuantityOverride' => !empty($row->stock_quantity_override),
			'sitePrice'        => $sitePrice,
			'variationId'      => $variationId > 0 ? $variationId : null,
			'productName'      => $productName,
			'productMetaValue' => $productMetaValue !== '' ? $productMetaValue : null,
			'variationName'    => $variationName,
			'listName'         => $row->list_name !== '' ? (string) $row->list_name : null,
			'status'           => $status,
		];
	}
	
	private function getVariationName(object $variation): ?string
	{
		if (!method_exists($variation, 'get_attributes')) {
			return null;
		}
		
		$attributes = $variation->get_attributes();
		
		if (!is_array($attributes) || $attributes === []) {
			return null;
		}
		
		$names = [];
		
		foreach ($attributes as $attributeName => $attributeValue) {
			$attributeValue = (string) $attributeValue;
			
			if ($attributeValue === '') {
				continue;
			}
			
			$taxonomy = str_starts_with(
				$attributeName,
				'pa_'
			)
				? $attributeName
				: 'pa_' . $attributeName;
			
			$term = get_term_by(
				'slug',
				$attributeValue,
				$taxonomy
			);
			
			$names[] = $term instanceof \WP_Term
				? $term->name
				: $attributeValue;
		}
		
		return $names !== []
			? implode(' ', $names)
			: null;
	}
	public function syncSingle(
		string $slug,
		int $id
	): array|WP_Error {
		$slug = sanitize_key($slug);
		$id = absint($id);
		
		if ($slug === '' || $id <= 0) {
			return new WP_Error(
				'invalid_sync_row',
				'اطلاعات ردیف برای همگام‌سازی معتبر نیست.',
				['status' => 400]
			);
		}
		
		$row = $this->repository->findBySlugAndId(
			$slug,
			$id
		);
		
		if (!$row) {
			return new WP_Error(
				'sync_row_not_found',
				'ردیف موردنظر پیدا نشد.',
				['status' => 404]
			);
		}
		
		$variationId = absint($row->attr_id);
		
		if ($variationId <= 0) {
			return new WP_Error(
				'variation_not_connected',
				'این ردیف هنوز به یک Variation متصل نشده است.',
				['status' => 400]
			);
		}
		
		if ((bool) $row->product_onhold) {
			return new WP_Error(
				'variation_on_hold',
				'این Variation در حالت توقف قرار دارد.',
				['status' => 400]
			);
		}
		
		$variation = wc_get_product($variationId);
		
		if (!$variation) {
			return new WP_Error(
				'variation_not_found',
				'Variation ووکامرس پیدا نشد.',
				['status' => 404]
			);
		}
		
		$slugs = $this->settings->getSyncAllSlugs();
		if (!in_array($slug, $slugs, true)) {
			$slugs[] = $slug;
		}
		$result = $this->applyBestPrice($row, $slugs);
		if (!$result['updated']) {
			return new WP_Error('variation_not_found', 'Variation ووکامرس پیدا نشد.', ['status' => 404]);
		}
		if (!$this->repository->update($id, [
			'site_price' => $result['sheet_price'],
			'list_name' => $result['list_name'],
		])) {
			return new WP_Error('row_update_failed', 'قیمت محصول ذخیره شد اما ثبت نتیجه در جدول انجام نشد.', ['status' => 500]);
		}
		return [
			'id' => $id,
			'variationId' => $variationId,
			'price' => $result['sheet_price'],
			'listName' => $result['list_name'] !== '' ? $result['list_name'] : null,
			'stockStatus' => $result['details']['stockStatus'],
			'details' => $result['details'],
		];
	}

	public function connectVariation(
		string $slug,
		int $id,
		int $variationId
	): array|WP_Error {
		$slug = sanitize_key($slug);
		$id = absint($id);
		$variationId = absint($variationId);
		
		if (
			$slug === '' ||
			$id <= 0 ||
			$variationId <= 0
		) {
			return new WP_Error(
				'invalid_connection',
				'اطلاعات اتصال Variation معتبر نیست.',
				['status' => 400]
			);
		}
		
		$row = $this->repository->findBySlugAndId(
			$slug,
			$id
		);
		
		if (!$row) {
			return new WP_Error(
				'sheet_row_not_found',
				'ردیف شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		$variation = wc_get_product($variationId);
		
		if (
			!$variation ||
			!($variation instanceof \WC_Product_Variation)
		) {
			return new WP_Error(
				'variation_not_found',
				'Variation ووکامرس پیدا نشد.',
				['status' => 404]
			);
		}
		
		global $wpdb;
		
		$table = $wpdb->prefix . 'sheets_and_excel_updater';
		
		$wpdb->query('START TRANSACTION');
		
		try {
			if (
				!$this->repository->clearVariationConnection(
					$slug,
					$variationId
				)
			) {
				throw new \RuntimeException(
					'خطا در حذف اتصال قبلی Variation.'
				);
			}
			
			if (
				!$this->repository->connectVariation(
					$id,
					$variationId
				)
			) {
				throw new \RuntimeException(
					'خطا در اتصال Variation.'
				);
			}
			
			$wpdb->query('COMMIT');
			
			$listName = $this->settings->getNameBySlug($slug);
			
			// استخراج نام محصول والد و متادیتای آن
			$productName = null;
			$productMetaValue = null;
			$metaKey = sanitize_text_field((string) get_option('input_add_meta_search_excel_updater', ''));
			
			$parentId = $variation->get_parent_id();
			if ($parentId > 0) {
				$parent = wc_get_product($parentId);
				if ($parent) {
					$productName = $parent->get_name();
					if ($metaKey !== '') {
						$productMetaValue = (string) $parent->get_meta($metaKey, true);
					}
				}
			}
			
			if (empty($productMetaValue) && $metaKey !== '') {
				$productMetaValue = (string) $variation->get_meta($metaKey, true);
			}
			
			return [
				'id'               => $id,
				'variationId'      => $variationId,
				'productName'      => $productName,
				'productMetaValue' => !empty($productMetaValue) ? $productMetaValue : null,
				'listName'         => $listName !== '' ? $listName : null,
				'status'           => 'connected',
			];
		} catch (\Throwable $exception) {
			$wpdb->query('ROLLBACK');
			
			return new WP_Error(
				'variation_connection_failed',
				'اتصال Variation انجام نشد.',
				[
					'status' => 500,
					'error' => $exception->getMessage(),
				]
			);
		}
	}
	public function updateStockQuantity(string $slug, int $id, int $quantity): array|WP_Error
	{
		$slug = sanitize_key($slug);
		if ($id < 1 || $slug === '' || ($quantity !== -1 && $quantity < 1) || $quantity > 2147483647) {
			return new WP_Error('invalid_stock_quantity', 'موجودی باید ۱- (بدون تغییر) یا یک عدد صحیح حداقل ۱ باشد.', ['status' => 400]);
		}
		if (!$this->repository->findBySlugAndId($slug, $id)) {
			return new WP_Error('row_not_found', 'ردیف موردنظر پیدا نشد.', ['status' => 404]);
		}
		if (!$this->repository->update($id, ['stock_quantity' => $quantity, 'stock_quantity_override' => 1])) {
			return new WP_Error('quantity_save_failed', 'ذخیره موجودی انجام نشد.', ['status' => 500]);
		}
		return ['id' => $id, 'stockQuantity' => $quantity, 'stockQuantityOverride' => true];
	}

	public function updateOnHold(
		string $slug,
		int $id,
		bool $onHold
	): array|WP_Error {
		$slug = sanitize_key($slug);
		$id = absint($id);
		
		if ($slug === '' || $id <= 0) {
			return new WP_Error(
				'invalid_request',
				'اطلاعات ردیف معتبر نیست.',
				['status' => 400]
			);
		}
		
		$row = $this->repository->findBySlugAndId($slug, $id);
		
		if (!$row) {
			return new WP_Error(
				'row_not_found',
				'ردیف موردنظر پیدا نشد.',
				['status' => 404]
			);
		}
		
		if (!$this->repository->updateOnHold($id, $onHold)) {
			return new WP_Error(
				'update_failed',
				'تغییر وضعیت توقف انجام نشد.',
				['status' => 500]
			);
		}
		
		// بروزرسانی ردیف خوانده‌شده برای محاسبه مجدد قیمت در سایت
		$row->product_onhold = $onHold ? 1 : 0;
		
		if (!empty($row->attr_id)) {
			$syncSlugs = $this->settings->getSyncAllSlugs();
			if (!in_array($slug, $syncSlugs, true)) {
				$syncSlugs[] = $slug;
			}
			
			$result = $this->applyBestPrice($row, $syncSlugs);
			
			$this->repository->update(
				$id,
				[
					'site_price' => $result['sheet_price'],
					'list_name'  => $result['list_name'],
				]
			);
		}
		
		return [
			'id'     => $id,
			'onHold' => $onHold,
			'status' => $onHold ? 'on_hold' : (!empty($row->attr_id) ? 'connected' : 'unconnected'),
		];
	}
	
	private function setDefaultVariationByLowestPrice(int $parentId): void
	{
		$parent = wc_get_product($parentId);
		if (!$parent instanceof \WC_Product_Variable) {
			return;
		}
		
		$children = $parent->get_children();
		if (empty($children)) {
			return;
		}
		
		$lowestPrice = PHP_FLOAT_MAX;
		$lowestVariation = null;
		
		foreach ($children as $childId) {
			$variation = wc_get_product($childId);
			if (
				!$variation instanceof \WC_Product_Variation ||
				$variation->get_status() !== 'publish' ||
				!$variation->is_in_stock()
			) {
				continue;
			}
			
			$price = (float)$variation->get_price();
			if ($price > 0 && $price < $lowestPrice) {
				$lowestPrice = $price;
				$lowestVariation = $variation;
			}
		}
		
		if ($lowestVariation instanceof \WC_Product_Variation) {
			$attributes = $lowestVariation->get_variation_attributes(false);
			$parent->set_default_attributes($attributes);
			$parent->save();
		}
	}
	
	public function deleteConnection(
		string $slug,
		int $id
	): array|WP_Error {
		$slug = sanitize_key($slug);
		$id = absint($id);
		
		if ($slug === '' || $id <= 0) {
			return new WP_Error(
				'invalid_connection',
				'اطلاعات اتصال معتبر نیست.',
				['status' => 400]
			);
		}
		
		$row = $this->repository->findBySlugAndId(
			$slug,
			$id
		);
		
		if (!$row) {
			return new WP_Error(
				'sheet_row_not_found',
				'ردیف شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		if (!$this->repository->deleteVariationConnection($id)) {
			return new WP_Error(
				'connection_delete_failed',
				'قطع اتصال Variation انجام نشد.',
				['status' => 500]
			);
		}
		
		return [
			'id' => $id,
			'variationId' => $row->attr_id !== null
				? (int) $row->attr_id
				: null,
			'status' => 'unconnected',
		];
	}
	public function regenerateSitePrice(
		string $slug
	): array|WP_Error {
		$slug = sanitize_key($slug);
		
		if ($slug === '') {
			return new WP_Error(
				'invalid_slug',
				'شناسه شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$setting = $this->settings->get($slug);
		
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found',
				'تنظیمات شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		$rows = $this->repository->getConnectedRows($slug);
		
		$updated = 0;
		$notUpdated = 0;
		
		foreach ($rows as $row) {
			$variationId = absint($row->attr_id);
			
			if ($variationId <= 0) {
				$notUpdated++;
				continue;
			}
			
			$variation = wc_get_product($variationId);
			
			if (
				!$variation ||
				!($variation instanceof \WC_Product_Variation)
			) {
				$notUpdated++;
				continue;
			}
			
			$price = $variation->get_price();
			
			if ($price === '') {
				$notUpdated++;
				continue;
			}
			
			if (
				!$this->repository->update(
					(int) $row->id,
					[
						'site_price' => (int) $price,
					]
				)
			) {
				$notUpdated++;
				continue;
			}
			
			$updated++;
		}
		
		return [
			'slug' => $slug,
			'updated' => $updated,
			'notUpdated' => $notUpdated,
			'total' => count($rows),
		];
	}
    public function prepareUpdateList(string $slug): array|WP_Error
    {
        $setting = $this->settings->getInternal($slug);
        if (!$setting) {
            return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
        }
        $tasks = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'], 'variationId' => (int) $row['variationId'],
            'parentId' => (int) $row['parentId'],
        ], $this->repository->getDisableTasks($slug));
        return ['tasks' => $tasks, 'concurrency' => max(1, min(20, (int) ($setting['bulkConcurrency'] ?? 1)))];
    }

    public function updateListItem(string $slug, int $id, bool $allActive = false): array|WP_Error
    {
        if (!$this->settings->getInternal($slug)) {
            return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
        }
        $row = $this->repository->findBySlugAndId($slug, $id);
        if (!$row || empty($row->attr_id) || !empty($row->product_onhold)) {
            return new WP_Error('invalid_update_row', 'ردیف حذف شده یا در حالت توقف است.', ['status' => 409]);
        }
        $slugs = $allActive ? array_values(array_map(static fn(array $setting): string => $setting['slug'], array_filter($this->settings->getAll(), static fn(array $setting): bool => empty($setting['disabled'])))) : $this->settings->getSyncAllSlugs();
        if (!in_array($slug, $slugs, true)) $slugs[] = $slug;
        try {
            $result = $this->applyBestPrice($row, $slugs);
            if (!$this->repository->update($id, ['site_price' => $result['sheet_price'], 'list_name' => $result['list_name']])) {
                return new WP_Error('update_save_failed', 'ذخیره نتیجه ردیف انجام نشد.', ['status' => 500]);
            }
            return ['item' => [
                'id' => $id, 'fullName' => (string) $row->sheet_full_name,
                ...($result['details'] ?? []),
                'price' => (float) ($result['details']['price'] ?? $result['sheet_price']),
                'listName' => (string) $result['list_name'], 'updated' => (bool) $result['updated'],
            ]];
        } catch (\Throwable $error) {
            return new WP_Error('update_product_failed', 'ذخیره محصول انجام نشد؛ دوباره تلاش کنید.', ['status' => 500]);
        }
    }

	public function startUpdateBatch(
		string $slug,
		int $lastId = 0,
		int $batchSize = 50
	): array|WP_Error {
		$setting = $this->settings->getInternal($slug);
		$total = $this->repository->countConnectedRows($slug);
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found',
				'تنظیمات این لیست پیدا نشد.',
				['status' => 404]
			);
		}
		
		$syncSlugs = $this->settings->getSyncAllSlugs();
		if (!in_array($slug, $syncSlugs, true)) {
			$syncSlugs[] = $slug;
		}
		
		$batchSize = min(100, max(1, $batchSize));
		
		$rows = $this->repository->getConnectedRowsBatch(
			$slug,
			$lastId,
			$batchSize
		);
		
		if ($rows === []) {
			wc_delete_product_transients();
			
			return [
				'items' => [],
				'processed' => 0,
				'lastId' => $lastId,
				'hasMore' => false,
				'completed' => true,
				'nextItem' => null,
				'total' => $total,
			];
		}
		
		$items = [];
		$processed = 0;
		$newLastId = $lastId;
		
		foreach ($rows as $row) {
			$newLastId = (int) $row->id;
			
			$result = $this->applyBestPrice(
				$row,
				$syncSlugs
			);
			
			$this->repository->update(
				(int) $row->id,
				[
					'site_price' => $result['sheet_price'],
					'list_name' => $result['list_name'],
				]
			);
			
			$items[] = [
				'id' => (int) $row->id,
				'fullName' => (string) $row->sheet_full_name,
				...($result['details'] ?? []),
				'price' => (float) ($result['details']['price'] ?? $result['sheet_price']),
				'listName' => (string) $result['list_name'],
				'updated' => $result['updated'],
				'total' => $total,
			];
			
			$processed++;
		}
		
		$hasMore = count($rows) === $batchSize;
		
		if (!$hasMore) {
			wc_delete_product_transients();
		}
		
		$nextUpdate = $hasMore ? $this->getNextUpdate($slug, $newLastId) : ['item' => null];
		if ($hasMore && !is_wp_error($nextUpdate) && $nextUpdate['item'] === null) {
			$hasMore = false;
			wc_delete_product_transients();
		}
		return [
			'items' => $items,
			'processed' => $processed,
			'lastId' => $newLastId,
			'hasMore' => $hasMore,
			'completed' => !$hasMore,
			'total' => $total,
			'nextItem' => is_wp_error($nextUpdate) ? null : $nextUpdate['item'],
		];
	}
	
	public function getNextUpdate(string $slug, int $lastId = 0): array|WP_Error
	{
		$slug = sanitize_key($slug);
		if (!$this->settings->getInternal($slug)) {
			return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
		}
		$rows = $this->repository->getConnectedRowsBatch($slug, max(0, $lastId), 1);
		$row = $rows[0] ?? null;
		if (!$row) return ['item' => null];
		$variation = wc_get_product((int) $row->attr_id);
		if (!$variation || $variation->get_type() !== 'variation') {
			return ['item' => ['id' => (int) $row->id, 'fullName' => (string) $row->sheet_full_name,
				'price' => 0, 'listName' => '', 'updated' => false]];
		}
		$slugs = $this->settings->getSyncAllSlugs();
		if (!in_array($slug, $slugs, true)) $slugs[] = $slug;
		$bestRow = $this->repository->findBestPriceRow((int) $row->attr_id, $slugs);
		return ['item' => $this->describeUpdate($row, $variation, $bestRow)];
	}

	private function effectiveStockQuantity(object $row): int
	{
		if (!empty($row->stock_quantity_override)) {
			return (int) $row->stock_quantity;
		}
		$setting = $this->settings->getInternal((string) $row->sheet_slug);
		return (int) ($setting['defaultStockQuantity'] ?? 1);
	}

	private function describeUpdate(object $row, object $variation, ?object $bestRow): array
	{
		$quantity = $this->effectiveStockQuantity($row);
		// A saved row override takes precedence, including over another list's -1.
		if (empty($row->stock_quantity_override) && $quantity !== -1 && $bestRow) {
			$quantity = $this->effectiveStockQuantity($bestRow);
		}
		$preserve = $quantity === -1;
		$price = $bestRow ? (int) $bestRow->sheet_price : 0;
		$currentPrice = $variation->get_price();
		return [
			'id' => (int) $row->id,
			'fullName' => $variation->get_name(),
			'variationId' => (int) $row->attr_id,
			'oldPrice' => $currentPrice === '' ? null : (float) $currentPrice,
			'price' => $price,
			'oldQuantity' => $variation->get_stock_quantity(),
			'quantity' => $preserve ? $variation->get_stock_quantity() : ($price > 0 ? max(1, $quantity) : 0),
			'stockStatus' => $preserve ? $variation->get_stock_status() : ($price > 0 ? 'instock' : 'outofstock'),
			'stockUnchanged' => $preserve,
			'listName' => $bestRow ? $this->settings->getNameBySlug((string) $bestRow->sheet_slug) : '',
			'updated' => false,
		];
	}

	private function applyBestPrice(
		object $row,
		array $syncSlugs
	): array {
		if (empty($row->attr_id)) {
			return [
				'sheet_price' => 0,
				'list_name' => '',
				'updated' => false,
			];
		}
		
		$variation = wc_get_product((int) $row->attr_id);
		
		if (!$variation || $variation->get_type() !== 'variation') {
			return [
				'sheet_price' => 0,
				'list_name' => '',
				'updated' => false,
			];
		}
		
		$bestRow = $syncSlugs !== []
			? $this->repository->findBestPriceRow(
				(int) $row->attr_id,
				$syncSlugs
			)
			: (empty($row->product_onhold) && (int) ($row->sheet_price ?? 0) > 0 ? $row : null);
		
		$details = $this->describeUpdate($row, $variation, $bestRow);
		$preserveStock = $details['stockUnchanged'];
		$price = 0;
		$listName = '';
		
		if ($bestRow && (int) $bestRow->sheet_price > 0) {
			$price = (int) $bestRow->sheet_price;
			$listName = $this->settings->getNameBySlug(
				(string) $bestRow->sheet_slug
			);
			
			$variation->set_regular_price($price);
			$variation->set_price($price);
			if (!$preserveStock) {
				$variation->set_stock_status('instock');
				$variation->set_manage_stock(true);
				$variation->set_stock_quantity((int) $details['quantity']);
			}
			$variation->update_meta_data('_list_name', $listName);
		} else {
			$variation->set_regular_price('');
			$variation->set_price('');
			$variation->set_sale_price('');
			if (!$preserveStock) {
				$variation->set_stock_status('outofstock');
				$variation->set_manage_stock(true);
				$variation->set_stock_quantity(0);
			}
			$variation->delete_meta_data('_list_name');
		}
		
		$variation->save();
		
		$parentId = $variation->get_parent_id();
		
		$this->setDefaultVariationByLowestPrice($parentId);
		
		return [
			'sheet_price' => $price,
			'list_name' => $listName,
			'updated' => true,
			'details' => array_merge($details, [
				'updated' => true,
				'price' => (float) $variation->get_price(),
				'quantity' => $variation->get_stock_quantity(),
				'stockStatus' => $variation->get_stock_status(),
			]),
		];
	}
	
    public function enableList(string $slug): array|WP_Error
    {
        // Enabling changes only settings; no synchronization or product updates.
        return $this->settings->setDisabled($slug, false);
    }

    public function prepareDisableList(string $slug): array|WP_Error
    {
        if (!$this->settings->getInternal($slug)) {
            return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
        }
        if (!$this->repository->disableSheetList($slug)) {
            return new WP_Error('disable_failed', 'غیرفعال کردن قیمت‌های لیست انجام نشد.', ['status' => 500]);
        }
        $state = $this->settings->setDisabled($slug, true);
        if (is_wp_error($state)) return $state;
        $setting = $this->settings->getInternal($slug);
        $tasks = array_map(static fn(array $row): array => [
            'id' => (int) $row['id'], 'variationId' => (int) $row['variationId'],
            'parentId' => (int) $row['parentId'],
        ], $this->repository->getDisableTasks($slug));
        return ['tasks' => $tasks, 'concurrency' => max(1, min(20, (int) ($setting['bulkConcurrency'] ?? 1)))];
    }

    public function disableListItem(string $slug, int $id): array|WP_Error
    {
        if (!$this->settings->getInternal($slug)) {
            return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
        }
        $row = $this->repository->findBySlugAndId($slug, $id);
        if (!$row || empty($row->attr_id) || !empty($row->product_onhold)) {
            return new WP_Error('invalid_disable_row', 'ردیف حذف شده یا در حالت توقف است.', ['status' => 409]);
        }
        // Every worker touches only its own row; never reset the whole list here.
        if (!$this->repository->update($id, ['sheet_price' => 0])) {
            return new WP_Error('disable_row_failed', 'ثبت قیمت لیست انجام نشد.', ['status' => 500]);
        }
        $row->sheet_price = 0;
        $slugs = array_values(array_filter($this->settings->getSyncAllSlugs(), static fn(string $value): bool => $value !== $slug));
        try {
            $result = $this->applyBestPrice($row, $slugs);
            if (!$this->repository->update($id, ['site_price' => $result['sheet_price'], 'list_name' => $result['list_name']])) {
                return new WP_Error('disable_save_failed', 'ذخیره نتیجه ردیف انجام نشد.', ['status' => 500]);
            }
            return ['item' => [
                'id' => $id, 'fullName' => (string) $row->sheet_full_name,
                ...($result['details'] ?? []),
                'price' => (float) ($result['details']['price'] ?? $result['sheet_price']),
                'listName' => (string) $result['list_name'], 'updated' => (bool) $result['updated'],
            ]];
        } catch (\Throwable $error) {
            return new WP_Error('disable_product_failed', 'ذخیره محصول انجام نشد؛ دوباره تلاش کنید.', ['status' => 500]);
        }
    }
}