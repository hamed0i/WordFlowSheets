<?php

namespace SheetsExcelUpdater\Admin;

defined('ABSPATH') || exit;

final class AdminMenu
{
	private const CAPABILITY = 'manage_woocommerce';
	private const PARENT_SLUG = 'sheets-excel-updater';
	
	public function register(): void
	{
		add_menu_page(
			'شیت و اکسل',
			'شیت و اکسل',
			self::CAPABILITY,
			self::PARENT_SLUG,
			[$this, 'render'],
			'dashicons-update',
			56
		);
	}
	
	public function enqueue_assets(string $hook_suffix): void
	{
		
		if ($hook_suffix !== 'toplevel_page_' . self::PARENT_SLUG) {
			return;
		}
		
		$manifest_path = SHEETS_EXCEL_UPDATER_DIR . 'assets/build/manifest.json';
		
		if (!is_readable($manifest_path)) {
			return;
		}
		
		$manifest = json_decode(
			(string) file_get_contents($manifest_path),
			true
		);
		
		if (!is_array($manifest)) {
			return;
		}
		
		$entry = $manifest['src/main.tsx'] ?? null;
		
		if (!is_array($entry) || empty($entry['file'])) {
			return;
		}
		
		wp_enqueue_script(
			'sheets-excel-updater',
			SHEETS_EXCEL_UPDATER_URL . 'assets/build/' . $entry['file'],
			[],
			SHEETS_EXCEL_UPDATER_VERSION,
			true
		);
		
		if (!empty($entry['css']) && is_array($entry['css'])) {
			foreach ($entry['css'] as $index => $css_file) {
				wp_enqueue_style(
					'sheets-excel-updater-' . $index,
					SHEETS_EXCEL_UPDATER_URL . 'assets/build/' . $css_file,
					[],
					SHEETS_EXCEL_UPDATER_VERSION
				);
			}
		}
		
		wp_add_inline_script(
			'sheets-excel-updater',
			'window.sheetsExcelUpdaterConfig = ' . wp_json_encode([
				'apiUrl' => rest_url('sheets-excel-updater/v1'),
				'nonce' => wp_create_nonce('wp_rest'),
			]) . ';',
			'before'
		);
	}
	
	public function render(): void
	{
		echo '<div id="sheets-excel-updater-app"><p style="padding:24px">در حال بارگذاری افزونه… اگر این پیام باقی ماند، صفحه را با Ctrl+Shift+R بازخوانی کنید.</p></div>';
	}
}