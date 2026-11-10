<?php

namespace SheetsExcelUpdater\Database;

defined('ABSPATH') || exit;

final class Installer
{
	private const DB_VERSION = '1.0.5';
	private const DB_VERSION_OPTION = 'sheets_and_excel_updater_db_version';
	
	public static function install(): void
	{
		global $wpdb;
		
		$table_name = $wpdb->prefix . 'sheets_and_excel_updater';
		$charset_collate = $wpdb->get_charset_collate();
		
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		
		$sql = "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            sheet_slug TEXT NOT NULL,
            sheet_full_name TEXT NOT NULL,
            sheet_product TEXT NOT NULL,
            sheet_variation TEXT NOT NULL,
            sheet_price BIGINT NULL,
            stock_quantity INT NOT NULL DEFAULT 1,
            stock_quantity_override BOOL NOT NULL DEFAULT 0,
            site_price BIGINT NULL,
            attr_id BIGINT UNSIGNED NULL,
            list_name TEXT NOT NULL,
            product_conect BOOL NOT NULL DEFAULT '0',
            product_onhold BOOL NOT NULL DEFAULT '0',
            PRIMARY KEY (id)
        ) {$charset_collate};";
		
		$hadOverrideColumn = $wpdb->get_var("SHOW COLUMNS FROM {$table_name} LIKE 'stock_quantity_override'");
		dbDelta($sql);
		if (!$hadOverrideColumn) {
			// Legacy rows did not distinguish the default 1 from an explicit 1.
			// Preserve distinct custom quantities; other rows now inherit settings.
			$options = get_option('sheets_excel_options', []);
			foreach (is_array($options) ? $options : [] as $setting) {
				if (!is_array($setting) || empty($setting['slug'])) continue;
				$wpdb->query($wpdb->prepare(
					"UPDATE {$table_name} SET stock_quantity_override = 1 WHERE sheet_slug = %s AND stock_quantity != 1 AND stock_quantity != %d",
					$setting['slug'], (int) ($setting['defaultStockQuantity'] ?? 1)
				));
			}
		}
		
		update_option(self::DB_VERSION_OPTION, self::DB_VERSION);
	}
	
	public static function maybe_upgrade(): void
	{
		$installed_version = get_option(self::DB_VERSION_OPTION);
		
		if ($installed_version !== self::DB_VERSION) {
			self::install();
		}
	}
}