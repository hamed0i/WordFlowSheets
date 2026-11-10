<?php

namespace SheetsExcelUpdater\Api;

use SheetsExcelUpdater\Settings\SettingsService;
use SheetsExcelUpdater\Api\GoogleSheetsService;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined('ABSPATH') || exit;

final class SettingsController
{
	private const NAMESPACE = 'sheets-excel-updater/v1';
	
	public function __construct(
		private readonly SettingsService $settings,
		private readonly GoogleSheetsService $googleSheets
	) {
	}
	
	public function register(): void
	{
        register_rest_route(self::NAMESPACE, '/settings/reorder', [
            'methods' => 'POST', 'permission_callback' => [$this, 'writePermission'],
            'callback' => [$this, 'reorder'],
        ]);

		register_rest_route(
			self::NAMESPACE,
			'/settings',
			[
				[
					'methods' => 'GET',
					'callback' => [$this, 'index'],
					'permission_callback' => [$this, 'readPermission'],
				],
				[
					'methods' => 'POST',
					'callback' => [$this, 'store'],
					'permission_callback' => [$this, 'writePermission'],
				],
			]
		);
		
		register_rest_route(
			self::NAMESPACE,
			'/settings/(?P<slug>[a-zA-Z0-9_-]+)',
			[
				[
					'methods' => 'GET',
					'callback' => [$this, 'show'],
					'permission_callback' => [$this, 'readPermission'],
				],
				[
					'methods' => 'DELETE',
					'callback' => [$this, 'destroy'],
					'permission_callback' => [$this, 'writePermission'],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/settings/headers',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'headers'],
					'permission_callback' => [$this, 'writePermission'],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/settings/(?P<slug>[a-zA-Z0-9_-]+)/headers',
			[
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => [$this, 'headersForSetting'],
				'permission_callback' => [$this, 'writePermission'],
				'args' => [
					'slug' => [
						'required' => true,
						'sanitize_callback' => 'sanitize_key',
					],
				],
			]
		);
	}
	
    public function reorder(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $result = $this->settings->reorder($request->get_param('slugs'));
        return is_wp_error($result) ? $result : new WP_REST_Response(['success' => true, 'data' => $result]);
    }

	public function index(): WP_REST_Response
	{
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => $this->settings->getAll(),
			]
		);
	}
	
	public function show(
		WP_REST_Request $request
	): WP_REST_Response|WP_Error {
		$slug = sanitize_key(
			(string) $request->get_param('slug')
		);
		
		$setting = $this->settings->get($slug);
		
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found',
				'تنظیمات موردنظر پیدا نشد.',
				['status' => 404]
			);
		}
		
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => $setting,
			]
		);
	}
	
	public function store(
		WP_REST_Request $request
	): WP_REST_Response|WP_Error {
		$data = $request->get_json_params();
		
		if (!is_array($data)) {
			return new WP_Error(
				'invalid_request',
				'داده‌های ارسال‌شده معتبر نیستند.',
				['status' => 400]
			);
		}
		
		$result = $this->settings->save($data);
		
		if (is_wp_error($result)) {
			return $result;
		}
		
		$slug = sanitize_key(
			(string) ($data['slug'] ?? '')
		);
		
		$setting = $this->settings->get($slug);
		
		if ($setting === null) {
			return new WP_Error(
				'setting_not_found_after_save',
				'تنظیمات ذخیره شد اما اطلاعات آن قابل دریافت نیست.',
				['status' => 500]
			);
		}
		
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => $setting,
			]
		);
	}
	
	public function destroy(
		WP_REST_Request $request
	): WP_REST_Response|WP_Error {
		$slug = sanitize_key(
			(string) $request->get_param('slug')
		);
		
		if (!$this->settings->remove($slug)) {
			return new WP_Error(
				'setting_delete_failed',
				'حذف تنظیمات انجام نشد.',
				['status' => 404]
			);
		}
		
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => [
					'slug' => $slug,
				],
			]
		);
	}
	
	public function readPermission(): bool
	{
		return current_user_can('manage_woocommerce');
	}
	
	public function writePermission(): bool
	{
		return current_user_can('manage_options');
	}
	public function headers(
		WP_REST_Request $request
	): WP_REST_Response|WP_Error {
		$data = $request->get_json_params();
		
		if (!is_array($data)) {
			return new WP_Error(
				'invalid_request',
				'داده‌های ارسال‌شده معتبر نیستند.',
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
		
		$result = $this->googleSheets->getHeaders(
			(string) ($credentials['spreadsheetId'] ?? ''),
			(string) ($credentials['apiKey'] ?? ''),
			(string) ($credentials['sheetName'] ?? ''),
			(string) ($credentials['range'] ?? '')
		);
		
		if (is_wp_error($result)) {
			return $result;
		}
		
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => $result,
			]
		);
	}
	public function headersForSetting(
		WP_REST_Request $request
	): WP_REST_Response|WP_Error {
		$slug = sanitize_key(
			(string) $request->get_param('slug')
		);
		
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
		
		$credentials = $setting['credentials'] ?? null;
		
		if (!is_array($credentials)) {
			return new WP_Error(
				'invalid_credentials',
				'اطلاعات اتصال شیت معتبر نیست.',
				['status' => 400]
			);
		}
		
		$result = $this->googleSheets->getHeaders(
			(string) ($credentials['spreadsheetId'] ?? ''),
			(string) ($credentials['apiKey'] ?? ''),
			(string) ($credentials['sheetName'] ?? ''),
			(string) ($credentials['range'] ?? '')
		);
		
		if (is_wp_error($result)) {
			return $result;
		}
		
		return new WP_REST_Response([
			'success' => true,
			'data' => $result,
		]);
	}
}