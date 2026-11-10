<?php

namespace SheetsExcelUpdater\Bootstrap;

use SheetsExcelUpdater\Admin\AdminMenu;
use SheetsExcelUpdater\Api\GoogleSheetsService;
use SheetsExcelUpdater\Api\SettingsController;
use SheetsExcelUpdater\Database\Installer;
use SheetsExcelUpdater\Settings\SettingsRepository;
use SheetsExcelUpdater\Settings\SettingsService;
use SheetsExcelUpdater\Api\PriceUpdaterController;
use SheetsExcelUpdater\PriceUpdater\PriceUpdaterRepository;
use SheetsExcelUpdater\PriceUpdater\PriceUpdaterService;
use SheetsExcelUpdater\Api\ProductSearchController;

defined('ABSPATH') || exit;

final class Bootstrap
{
	public static function boot(): void
	{
		add_action('plugins_loaded', [self::class, 'initialize'], 20);
	}
	
	public static function initialize(): void
	{
		if (!class_exists('WooCommerce')) {
			return;
		}
		
		if (
			defined('WC_VERSION') &&
			version_compare(WC_VERSION, '9.0', '<')
		) {
			return;
		}
		
		Installer::maybe_upgrade();
		
		$settings_repository = new SettingsRepository();
		$google_sheets = new GoogleSheetsService();
		
		$settings_service = new SettingsService(
			$settings_repository,
			$google_sheets
		);
		
		$admin_menu = new AdminMenu();
		
		$settings_controller = new SettingsController(
			$settings_service,
			$google_sheets
		);
		
		add_action('admin_menu', [$admin_menu, 'register']);
		add_action('admin_enqueue_scripts', [$admin_menu, 'enqueue_assets']);
		add_action('rest_api_init', [$settings_controller, 'register']);
		
		
		$price_updater_repository = new PriceUpdaterRepository();
		
		$price_updater_service = new PriceUpdaterService(
			$price_updater_repository,
			$settings_service,
			$google_sheets
		);
		
		$price_updater_controller = new PriceUpdaterController(
			$price_updater_service
		);
		
		add_action('rest_api_init', [$price_updater_controller, 'register']);
		
		$product_search_controller = new ProductSearchController();
		
		add_action(
			'rest_api_init',
			[$product_search_controller, 'register']
		);
		
	}
}