<?php

namespace SheetsExcelUpdater\Settings;

use WP_Error;
use SheetsExcelUpdater\Support\LocalizedNumbers;
use SheetsExcelUpdater\PriceUpdater\PriceAdjustment;
use SheetsExcelUpdater\Api\GoogleSheetsService;

defined('ABSPATH') || exit;

final class SettingsService
{
	public function __construct(
		private readonly SettingsRepository $repository,
		private readonly GoogleSheetsService $googleSheets
	) {
	}
	
    public function reorder(mixed $slugs): array|WP_Error
    {
        if (!is_array($slugs) || array_filter($slugs, static fn($slug): bool => !is_string($slug)) || !$this->repository->reorder($slugs)) {
            return new WP_Error('invalid_list_order', 'ذخیره ترتیب انجام نشد؛ صفحه را بازخوانی کنید.', ['status' => 409]);
        }
        return $this->getAll();
    }

    public function setDisabled(string $slug, bool $disabled): array|WP_Error
    {
        if (!$this->repository->find($slug)) {
            return new WP_Error('setting_not_found', 'تنظیمات لیست پیدا نشد.', ['status' => 404]);
        }
        if (!$this->repository->setDisabled($slug, $disabled)) {
            return new WP_Error('setting_state_failed', 'ذخیره وضعیت لیست انجام نشد.', ['status' => 500]);
        }
        return ['slug' => $slug, 'disabled' => $disabled];
    }

	public function getAll(): array
	{
		return array_map(
			[$this, 'toPublicSetting'],
			$this->repository->all()
		);
	}
	
	public function get(string $slug): ?array
	{
		$setting = $this->repository->find(
			sanitize_key($slug)
		);
		
		if ($setting === null) {
			return null;
		}
		
		return $this->toPublicSetting($setting);
	}
	
	public function save(array $data): bool|WP_Error
	{
		$validated = $this->validate($data);
		
		if (is_wp_error($validated)) {
			return $validated;
		}
		
		$headers = $this->googleSheets->getHeaders(
			$validated['credentials']['spreadsheetId'],
			$validated['credentials']['apiKey'],
			$validated['credentials']['sheetName'],
			$validated['credentials']['range']
		);
		
		if (is_wp_error($headers)) {
			return $headers;
		}
		
		foreach ([
			         'productColumn' => [
				         'code' => 'missing_product_column',
				         'message' => 'حداقل یک ستون محصول باید انتخاب شود.',
			         ],
			         'variationColumn' => [
				         'code' => 'missing_variation_column',
				         'message' => 'حداقل یک ستون تنوع باید انتخاب شود.',
			         ],
			         'priceColumn' => [
				         'code' => 'missing_price_column',
				         'message' => 'حداقل یک ستون قیمت باید انتخاب شود.',
			         ],
		         ] as $field => $config) {
			$columns = $validated[$field];
			
			if ($columns === []) {
				return new WP_Error(
					$config['code'],
					$config['message'],
					['status' => 400]
				);
			}
			
			$availableHeaders = array_fill_keys(
				$headers,
				true
			);
			
			foreach ($columns as $column) {
				if (!isset($availableHeaders[$column])) {
					return new WP_Error(
						'invalid_sheet_header',
						sprintf(
							'Header «%s» در شیت وجود ندارد.',
							$column
						),
						[
							'status' => 400,
							'header' => $column,
							'field' => $field,
						]
					);
				}
			}
		}
		
		if (!$this->repository->save($validated)) {
			return new WP_Error(
				'setting_save_failed',
				'ذخیره تنظیمات انجام نشد.',
				['status' => 500]
			);
		}
		
		return true;
	}
	
	public function remove(string $slug): bool
	{
		$slug = sanitize_key($slug);
		
		if ($slug === '') {
			return false;
		}
		
		$removed = $this->repository->remove($slug);
		
		if (!$removed) {
			return false;
		}
		
		global $wpdb;
		
		$table_name = $wpdb->prefix . 'sheets_and_excel_updater';
		
		$wpdb->delete(
			$table_name,
			[
				'sheet_slug' => $slug,
			],
			[
				'%s',
			]
		);
		
		return true;
	}
	
	public function getApiKey(string $slug): ?string
	{
		$setting = $this->repository->find(
			sanitize_key($slug)
		);
		
		if ($setting === null) {
			return null;
		}
		
		$api_key = $setting['credentials']['apiKey'] ?? null;
		
		return is_string($api_key) && $api_key !== ''
			? $api_key
			: null;
	}
	
	private function validate(array $data): array|WP_Error
	{
		$slug = sanitize_key(
			(string) ($data['slug'] ?? '')
		);
		
		$name = sanitize_text_field(
			(string) ($data['name'] ?? '')
		);
		
		if ($slug === '') {
			return new WP_Error(
				'invalid_slug',
				'شناسه شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		if ($name === '') {
			return new WP_Error(
				'invalid_name',
				'نام شیت الزامی است.',
				['status' => 400]
			);
		}
		
		$credentials = $data['credentials'] ?? null;
		
		if (!is_array($credentials)) {
			return new WP_Error(
				'invalid_credentials',
				'اطلاعات اتصال شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$spreadsheet_id = sanitize_text_field(
			(string) ($credentials['spreadsheetId'] ?? '')
		);
		
		$api_key = sanitize_text_field(
			(string) ($credentials['apiKey'] ?? '')
		);
		
		$sheet_name = sanitize_text_field(
			(string) ($credentials['sheetName'] ?? '')
		);
		
		$range = sanitize_text_field(
			(string) ($credentials['range'] ?? '')
		);
		
		if (
			$spreadsheet_id === '' ||
			$sheet_name === '' ||
			$range === ''
		) {
			return new WP_Error(
				'invalid_credentials',
				'اطلاعات اتصال شیت کامل نیست.',
				['status' => 400]
			);
		}
		
		$existing = $this->repository->find($slug);
		
		$existing_api_key = null;
		
		if ($existing !== null) {
			$stored_api_key = $existing['credentials']['apiKey'] ?? null;
			
			if (is_string($stored_api_key) && $stored_api_key !== '') {
				$existing_api_key = $stored_api_key;
			}
		}
		
		if ($api_key === '') {
			if ($existing_api_key === null) {
				return new WP_Error(
					'missing_api_key',
					'API Key الزامی است.',
					['status' => 400]
				);
			}
			
			$api_key = $existing_api_key;
		}
		
		$product_column = $this->sanitize_columns(
			$data['productColumn'] ?? null
		);
		
		$variation_column = $this->sanitize_columns(
			$data['variationColumn'] ?? null
		);
		
		$price_column = $this->sanitize_columns(
			$data['priceColumn'] ?? null
		);
		
		if (
			$product_column === null ||
			$variation_column === null ||
			$price_column === null
		) {
			return new WP_Error(
				'invalid_columns',
				'ساختار ستون‌های شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		if ($product_column === []) {
			return new WP_Error(
				'missing_product_column',
				'حداقل یک ستون محصول باید انتخاب شود.',
				['status' => 400]
			);
		}
		
		if ($variation_column === []) {
			return new WP_Error(
				'missing_variation_column',
				'حداقل یک ستون تنوع باید انتخاب شود.',
				['status' => 400]
			);
		}
		
		if ($price_column === []) {
			return new WP_Error(
				'missing_price_column',
				'حداقل یک ستون قیمت باید انتخاب شود.',
				['status' => 400]
			);
		}
		
		$sync_all = $data['sync_all'] ?? null;
		
		if (!in_array($sync_all, ['on', 'off'], true)) {
			return new WP_Error(
				'invalid_sync_all',
				'مقدار همگام‌سازی معتبر نیست.',
				['status' => 400]
			);
		}
		
		$legacyPercent = $data['upscalePercent'] ?? 0;
		$input = $data['priceIncrease'] ?? ((string) $legacyPercent . '%');
		$adjustment = is_string($input) ? PriceAdjustment::parse($input) : null;
		if ($adjustment === null) {
			return new WP_Error('invalid_price_increase', 'افزایش قیمت را مانند ۱۰٪ یا ۲۰۰۰۰ وارد کنید؛ مبلغ ثابت باید عدد صحیح باشد.', ['status' => 400]);
		}
		$rawQuantity = $data['defaultStockQuantity'] ?? ($existing['defaultStockQuantity'] ?? 1);
		if (is_string($rawQuantity)) $rawQuantity = LocalizedNumbers::normalize($rawQuantity);
		$defaultStockQuantity = filter_var($rawQuantity, FILTER_VALIDATE_INT);
		if (is_bool($rawQuantity) || $defaultStockQuantity === false || ($defaultStockQuantity !== -1 && $defaultStockQuantity < 1) || $defaultStockQuantity > 2147483647) {
			return new WP_Error('invalid_default_stock_quantity', 'موجودی پیش‌فرض باید ۱- یا عدد صحیح حداقل ۱ باشد.', ['status' => 400]);
		}
		$roundingZeros = $data['roundingZeros'] ?? 3;
		if (is_string($roundingZeros)) $roundingZeros = LocalizedNumbers::normalize($roundingZeros);
		if (filter_var($roundingZeros, FILTER_VALIDATE_INT) === false || (int) $roundingZeros < 0 || (int) $roundingZeros > 9) {
			return new WP_Error('invalid_rounding_zeros', 'تعداد صفرهای گردکردن باید بین ۰ تا ۹ باشد.', ['status' => 400]);
		}
		$roundingZeros = (int) $roundingZeros;
		$upscale_percent = $adjustment['type'] === 'percent' ? $adjustment['value'] : 0;

		$rawConcurrency = $data['bulkConcurrency'] ?? 0;
		if (is_string($rawConcurrency)) $rawConcurrency = LocalizedNumbers::normalize($rawConcurrency);
		$bulk_concurrency = filter_var($rawConcurrency, FILTER_VALIDATE_INT);

		if ($bulk_concurrency < 1 || $bulk_concurrency > 20) {
			return new WP_Error(
				'invalid_bulk_concurrency',
				'میزان همزمانی باید بین 1 تا 20 باشد.',
				['status' => 400]
			);
		}
		
		if (!is_bool($data['disabled'] ?? null)) {
			return new WP_Error(
				'invalid_disabled',
				'وضعیت فعال یا غیرفعال بودن شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		return [
			'slug' => $slug,
			'name' => $name,
			'credentials' => [
				'spreadsheetId' => $spreadsheet_id,
				'apiKey' => $api_key,
				'sheetName' => $sheet_name,
				'range' => $range,
			],
			'sync_all' => $sync_all,
			'productColumn' => $product_column,
			'variationColumn' => $variation_column,
			'priceColumn' => $price_column,
			'upscalePercent' => $upscale_percent,
			'priceIncrease' => $adjustment['input'],
			'defaultStockQuantity' => $defaultStockQuantity,
			'roundingZeros' => $roundingZeros,
			'bulkConcurrency' => $bulk_concurrency,
			'disabled' => $data['disabled'],
		];
	}
	
	
	private function sanitize_columns(mixed $columns): ?array
	{
		if (!is_array($columns)) {
			return null;
		}
		
		$result = [];
		
		foreach ($columns as $column) {
			if (!is_string($column)) {
				return null;
			}
			
			$column = sanitize_text_field($column);
			
			if ($column !== '') {
				$result[] = $column;
			}
		}
		
		return array_values(
			array_unique($result)
		);
	}
	public function getInternal(string $slug): ?array
	{
		return $this->repository->find(
			sanitize_key($slug)
		);
	}
	private function validateColumns(
		array $columns,
		array $headers,
		string $errorCode,
		string $errorMessage
	): array|WP_Error {
		if ($columns === []) {
			return new WP_Error(
				$errorCode,
				$errorMessage,
				['status' => 400]
			);
		}
		
		$available = array_fill_keys(
			$headers,
			true
		);
		
		foreach ($columns as $column) {
			if (!isset($available[$column])) {
				return new WP_Error(
					'invalid_sheet_header',
					sprintf(
						'Header «%s» در شیت وجود ندارد.',
						$column
					),
					[
						'status' => 400,
						'header' => $column,
					]
				);
			}
		}
		
		return $columns;
	}
	public function validateSheetHeaders(
		array $data
	): bool|WP_Error {
		$credentials = $data['credentials'] ?? null;
		
		if (!is_array($credentials)) {
			return new WP_Error(
				'invalid_credentials',
				'اطلاعات اتصال شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$headers = $this->googleSheets->getHeaders(
			(string) ($credentials['spreadsheetId'] ?? ''),
			(string) ($credentials['apiKey'] ?? ''),
			(string) ($credentials['sheetName'] ?? ''),
			(string) ($credentials['range'] ?? '')
		);
		
		if (is_wp_error($headers)) {
			return $headers;
		}
		
		$columns = [
			'productColumn' => [
				'errorCode' => 'missing_product_column',
				'errorMessage' => 'حداقل یک ستون محصول باید انتخاب شود.',
			],
			'variationColumn' => [
				'errorCode' => 'missing_variation_column',
				'errorMessage' => 'حداقل یک ستون تنوع باید انتخاب شود.',
			],
			'priceColumn' => [
				'errorCode' => 'missing_price_column',
				'errorMessage' => 'حداقل یک ستون قیمت باید انتخاب شود.',
			],
		];
		
		foreach ($columns as $field => $config) {
			$result = $this->validateColumns(
				is_array($data[$field] ?? null)
					? $data[$field]
					: [],
				$headers,
				$config['errorCode'],
				$config['errorMessage']
			);
			
			if (is_wp_error($result)) {
				return $result;
			}
		}
		
		return true;
	}
	private function toPublicSetting(array $setting): array
	{
		$credentials = $setting['credentials'] ?? [];
		
		return [
			'slug' => (string) ($setting['slug'] ?? ''),
			'name' => (string) ($setting['name'] ?? ''),
			'credentials' => [
				'spreadsheetId' => (string) ($credentials['spreadsheetId'] ?? ''),
				'sheetName' => (string) ($credentials['sheetName'] ?? ''),
				'range' => (string) ($credentials['range'] ?? ''),
				'hasApiKey' => !empty($credentials['apiKey']),
			],
			'sync_all' => ($setting['sync_all'] ?? 'off') === 'on'
				? 'on'
				: 'off',
			'productColumn' => $this->normalizeColumns(
				$setting['productColumn'] ?? []
			),
			'variationColumn' => $this->normalizeColumns(
				$setting['variationColumn'] ?? []
			),
			'priceColumn' => $this->normalizeColumns(
				$setting['priceColumn'] ?? []
			),
			'upscalePercent' => (float) ($setting['upscalePercent'] ?? 0),
			'priceIncrease' => (string) ($setting['priceIncrease'] ?? ((string) ($setting['upscalePercent'] ?? 0) . '%')),
			'defaultStockQuantity' => (int) ($setting['defaultStockQuantity'] ?? 1),
			'roundingZeros' => (int) ($setting['roundingZeros'] ?? 3),
			'bulkConcurrency' => max(
				1,
				min(20, (int) ($setting['bulkConcurrency'] ?? 1))
			),
			'disabled' => !empty($setting['disabled']),
		];
	}
	
	private function normalizeColumns(mixed $columns): array
	{
		if (!is_array($columns)) {
			return [];
		}
		
		$normalized = [];
		
		foreach ($columns as $column) {
			if (!is_string($column)) {
				continue;
			}
			
			$parts = preg_split('/\s+-\s+/u', $column);
			
			if (!is_array($parts)) {
				continue;
			}
			
			foreach ($parts as $part) {
				$part = trim($part);
				
				if ($part !== '') {
					$normalized[] = $part;
				}
			}
		}
		
		return array_values(array_unique($normalized));
	}
	public function getSyncAllSlugs(): array
	{
		$settings = $this->repository->all();
		
		$slugs = [];
		
		foreach ($settings as $setting) {
			if (
				!is_array($setting) ||
				($setting['sync_all'] ?? 'off') !== 'on' ||
				!empty($setting['disabled'])
			) {
				continue;
			}
			
			$slug = sanitize_key((string) ($setting['slug'] ?? ''));
			
			if ($slug !== '') {
				$slugs[] = $slug;
			}
		}
		
		return array_values(array_unique($slugs));
	}
	
	public function getNameBySlug(string $slug): string
	{
		$setting = $this->repository->find($slug);
		
		if ($setting === null) {
			return '';
		}
		
		return sanitize_text_field(
			(string) ($setting['name'] ?? '')
		);
	}
}