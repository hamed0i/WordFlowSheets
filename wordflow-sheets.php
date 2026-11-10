<?php

/**
 * Plugin Name: WordFlow Sheets Updater
 * Description: Synchronize WooCommerce product prices and variations with Google Sheets and Excel data.
 * Version: 1.0.17
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: WordFlow Team
 * Text Domain: wordflow-sheets-updater
 * Domain Path: /languages
 */

namespace SheetsExcelUpdater;

use SheetsExcelUpdater\Bootstrap\Bootstrap;
use SheetsExcelUpdater\Database\Installer;

defined('ABSPATH') || exit;

final class SheetsExcelUpdater
{
	private const VERSION = '1.0.17';
	private const MINIMUM_PHP_VERSION = '8.1';
	private const MINIMUM_WP_VERSION = '6.6';
	private const MINIMUM_WC_VERSION = '9.0';
	
	public const FILE = __FILE__;
	public const DIR = __DIR__;
	
	public static function boot(): void
	{
		if (!self::php_requirements_met()) {
			return;
		}
		
		self::define_constants();
		self::load_dependencies();
		
		register_activation_hook(
			self::FILE,
			[Installer::class, 'install']
		);
		
		Bootstrap::boot();
	}
	
	private static function php_requirements_met(): bool
	{
		if (version_compare(PHP_VERSION, self::MINIMUM_PHP_VERSION, '<')) {
			return false;
		}
		
		if (version_compare(get_bloginfo('version'), self::MINIMUM_WP_VERSION, '<')) {
			return false;
		}
		
		return true;
	}
	
	private static function define_constants(): void
	{
		if (!defined('SHEETS_EXCEL_UPDATER_VERSION')) {
			define(
				'SHEETS_EXCEL_UPDATER_VERSION',
				self::VERSION
			);
		}
		
		if (!defined('SHEETS_EXCEL_UPDATER_FILE')) {
			define(
				'SHEETS_EXCEL_UPDATER_FILE',
				self::FILE
			);
		}
		
		if (!defined('SHEETS_EXCEL_UPDATER_DIR')) {
			define(
				'SHEETS_EXCEL_UPDATER_DIR',
				self::DIR . '/'
			);
		}
		
		if (!defined('SHEETS_EXCEL_UPDATER_URL')) {
			define(
				'SHEETS_EXCEL_UPDATER_URL',
				plugin_dir_url(self::FILE)
			);
		}
	}
	
	
	private static function load_dependencies(): void
	{
		require_once self::DIR . '/src/Bootstrap/Autoloader.php';
		\SheetsExcelUpdater\Bootstrap\Autoloader::register();
	}
}

SheetsExcelUpdater::boot();