<?php

namespace SheetsExcelUpdater\Bootstrap;

defined('ABSPATH') || exit;

final class Autoloader
{
	private const PREFIX = 'SheetsExcelUpdater\\';
	
	public static function register(): void
	{
		spl_autoload_register(
			[self::class, 'load'],
			true,
			true
		);
	}
	
	private static function load(string $class): void
	{
		if (!str_starts_with($class, self::PREFIX)) {
			return;
		}
		
		$relative_class = substr($class, strlen(self::PREFIX));
		
		if ($relative_class === '') {
			return;
		}
		
		$file = SHEETS_EXCEL_UPDATER_DIR
			. 'src/'
			. str_replace('\\', '/', $relative_class)
			. '.php';
		
		if (is_file($file)) {
			require_once $file;
		}
	}
}