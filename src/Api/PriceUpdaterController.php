<?php

namespace SheetsExcelUpdater\Api;

use SheetsExcelUpdater\PriceUpdater\PriceUpdaterService;
use WP_Error;
use SheetsExcelUpdater\Support\LocalizedNumbers;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined('ABSPATH') || exit;

final class PriceUpdaterController
{
	private const NAMESPACE = 'sheets-excel-updater/v1';
	
	public function __construct(
		private readonly PriceUpdaterService $service
	) {
	}
	
	public function register(): void
	{
        register_rest_route(self::NAMESPACE, '/price-updater/import-file', [
            'methods' => 'POST',
            'permission_callback' => [$this, 'writePermission'],
            'callback' => function (WP_REST_Request $request): WP_REST_Response {
                if (strlen($request->get_body()) > 20 * 1024 * 1024) {
                    return $this->response(new WP_Error('file_too_large', 'حجم داده بیش از ۲۰ مگابایت است.', ['status' => 413]));
                }
                return $this->response($this->service->importFileRows(
                    (string) $request->get_param('slug'), $request->get_param('values'),
                    (string) $request->get_param('sheetName'), (string) $request->get_param('format')
                ));
            },
            'args' => ['slug' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_key']],
        ]);

		register_rest_route(self::NAMESPACE, '/price-updater/update-next', [
			'methods' => 'GET',
			'permission_callback' => [$this, 'readPermission'],
			'callback' => function (WP_REST_Request $request): WP_REST_Response {
				return $this->response($this->service->getNextUpdate(
					(string) $request->get_param('slug'), (int) $request->get_param('lastId')
				));
			},
			'args' => [
				'slug' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_key'],
				'lastId' => ['type' => 'integer', 'minimum' => 0, 'default' => 0],
			],
		]);

		register_rest_route(self::NAMESPACE, '/price-updater/stock-quantity', [
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => [$this, 'updateStockQuantity'],
			'permission_callback' => [$this, 'writePermission'],
			'args' => [
				'slug' => ['required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_key'],
				'id' => ['required' => true, 'type' => 'integer', 'minimum' => 1],
				'stockQuantity' => ['required' => true, 'type' => 'integer', 'minimum' => -1, 'maximum' => 2147483647, 'validate_callback' => static function ($value, $request, $param) {
					$normalized = is_string($value) ? LocalizedNumbers::normalize($value) : $value;
					$request->set_param($param, $normalized);
					$valid = rest_validate_request_arg($normalized, $request, $param);
					return is_wp_error($valid) ? $valid : (int) $normalized !== 0;
				}],
			],
		]);

		register_rest_route(
			self::NAMESPACE,
			'/price-updater',
			[
				[
					'methods' => 'GET',
					'callback' => [$this, 'index'],
					'permission_callback' => [$this, 'readPermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
						'page' => [
							'default' => 1,
							'sanitize_callback' => 'absint',
						],
						'per_page' => [
							'default' => 400,
							'sanitize_callback' => 'absint',
						],
					],
				],
			]
		);
		
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/sync',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'sync'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/sync-single',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'syncSingle'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
						'id' => [
							'required' => true,
							'sanitize_callback' => 'absint',
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/connect',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'connectVariation'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
						'id' => [
							'required' => true,
							'sanitize_callback' => 'absint',
						],
						'variationId' => [
							'required' => true,
							'sanitize_callback' => 'absint',
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/on-hold',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'updateOnHold'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
						'id' => [
							'required' => true,
							'sanitize_callback' => 'absint',
						],
						'onHold' => [
							'required' => true,
							'sanitize_callback' => static fn(mixed $value): bool =>
							filter_var(
								$value,
								FILTER_VALIDATE_BOOLEAN
							),
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/connection',
			[
				[
					'methods' => 'DELETE',
					'callback' => [$this, 'deleteConnection'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
						'id' => [
							'required' => true,
							'sanitize_callback' => 'absint',
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/regenerate-site-price',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'regenerateSitePrice'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
					],
				],
			]
		);
		register_rest_route(
			'sheets-excel-updater/v1',
			'/price-updater/start-update',
			[
				'methods' => WP_REST_Server::CREATABLE,
				'callback' => [$this, 'startUpdate'],
				'permission_callback' => [$this, 'writePermission'],
				'args' => [
					'slug' => [
						'required' => true,
						'type' => 'string',
						'sanitize_callback' => 'sanitize_key',
					],
					'lastId' => [
						'required' => false,
						'type' => 'integer',
						'default' => 0,
						'minimum' => 0,
					],
					'batchSize' => [
						'required' => false,
						'type' => 'integer',
						'default' => 50,
						'minimum' => 1,
						'maximum' => 100,
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/price-updater/disable-list',
			[
				[
					'methods' => 'POST',
					'callback' => [$this, 'disableList'],
					'permission_callback' => [$this, 'writePermission'],
					'args' => [
						'slug' => [
							'required' => true,
							'sanitize_callback' => 'sanitize_key',
						],
					],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/general-settings',
			[
				[
					'methods'             => 'GET',
					'callback'            => [$this, 'getGeneralSettings'],
					'permission_callback' => [$this, 'readPermission'],
				],
				[
					'methods'             => 'POST',
					'callback'            => [$this, 'updateGeneralSettings'],
					'permission_callback' => [$this, 'writePermission'],
				],
			]
		);
	}
	
	public function updateStockQuantity(WP_REST_Request $request): WP_REST_Response
	{
		return $this->response($this->service->updateStockQuantity(
			(string) $request->get_param('slug'),
			(int) $request->get_param('id'),
			(int) $request->get_param('stockQuantity')
		));
	}

	public function index(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->getTable(
			(string) $request->get_param('slug'),
			(int) $request->get_param('page'),
			(int) $request->get_param('per_page'),
            (string) $request->get_param('sort'), (string) $request->get_param('direction')
		);
		
		return $this->response($result);
	}
	
	public function sync(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->sync(
			(string) $request->get_param('slug')
		);
		
		return $this->response($result);
	}
	
	public function readPermission(): bool
	{
		return current_user_can('manage_woocommerce');
	}
	
	public function writePermission(): bool
	{
		return current_user_can('manage_woocommerce');
	}
	
	private function response(
		mixed $result
	): WP_REST_Response {
		if (is_wp_error($result)) {
			return new WP_REST_Response(
				[
					'success' => false,
					'code' => $result->get_error_code(),
					'message' => $result->get_error_message(),
				],
				(int) (
					$result->get_error_data()['status']
					?? 500
				)
			);
		}
		
		return new WP_REST_Response(
			[
				'success' => true,
				'data' => $result,
			],
			200
		);
	}
	public function syncSingle(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->syncSingle(
			(string) $request->get_param('slug'),
			(int) $request->get_param('id')
		);
		
		return $this->response($result);
	}
	public function connectVariation(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->connectVariation(
			(string) $request->get_param('slug'),
			(int) $request->get_param('id'),
			(int) $request->get_param('variationId')
		);
		
		return $this->response($result);
	}
	public function updateOnHold(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->updateOnHold(
			(string) $request->get_param('slug'),
			(int) $request->get_param('id'),
			(bool) $request->get_param('onHold')
		);
		
		return $this->response($result);
	}
	public function deleteConnection(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->deleteConnection(
			(string) $request->get_param('slug'),
			(int) $request->get_param('id')
		);
		
		return $this->response($result);
	}
	public function regenerateSitePrice(
		WP_REST_Request $request
	): WP_REST_Response {
		$result = $this->service->regenerateSitePrice(
			(string) $request->get_param('slug')
		);
		
		return $this->response($result);
	}
	public function startUpdate(WP_REST_Request $request): WP_REST_Response|WP_Error
	{
        $slug = sanitize_key((string) $request->get_param('slug'));
        $action = (string) $request->get_param('action');
        if ($action === 'prepare') {
            $result = $this->service->prepareUpdateList($slug);
            return is_wp_error($result) ? $result : $this->response($result);
        }
        if ($action === 'item') {
            $id = (int) $request->get_param('id');
            if ($id <= 0) return new WP_Error('invalid_update_id', 'شناسه ردیف معتبر نیست.', ['status' => 400]);
            $result = $this->service->updateListItem($slug, $id, rest_sanitize_boolean($request->get_param('allActive')));
            return is_wp_error($result) ? $result : $this->response($result);
        }

		$result = $this->service->startUpdateBatch(
			sanitize_key((string) $request->get_param('slug')),
			max(0, (int) $request->get_param('lastId')),
			min(
				100,
				max(
					1,
					(int) $request->get_param('batchSize')
				)
			)
		);
		
		if (is_wp_error($result)) {
			return $result;
		}
		
		return $this->response($result);
	}
    public function disableList(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $slug = sanitize_key((string) $request->get_param('slug'));
        $action = (string) $request->get_param('action');
        if ($action === 'enable') {
            $result = $this->service->enableList($slug);
        } elseif ($action === 'prepare') {
            $result = $this->service->prepareDisableList($slug);
        } elseif ($action === 'item' && (int) $request->get_param('id') > 0) {
            $result = $this->service->disableListItem($slug, (int) $request->get_param('id'));
        } else {
            return new WP_Error('invalid_disable_action', 'صفحه را بازخوانی کنید و دوباره تلاش کنید.', ['status' => 400]);
        }
        return is_wp_error($result) ? $result : $this->response($result);
    }

	public function getGeneralSettings(): WP_REST_Response
	{
		return new WP_REST_Response([
			'success' => true,
			'data'    => [
				'searchMetaKey' => (string) get_option('input_add_meta_search_excel_updater', ''),
			],
		]);
	}
	
	public function updateGeneralSettings(WP_REST_Request $request): WP_REST_Response|WP_Error
	{
		$params = $request->get_json_params();
		$metaKey = sanitize_text_field((string) ($params['searchMetaKey'] ?? ''));
		
		update_option('input_add_meta_search_excel_updater', $metaKey);
		
		return new WP_REST_Response([
			'success' => true,
			'data'    => [
				'searchMetaKey' => $metaKey,
			],
		]);
	}
}