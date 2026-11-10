<?php

namespace SheetsExcelUpdater\Settings;

defined('ABSPATH') || exit;

final class SettingsRepository
{
	private const OPTION_KEY = 'sheets_excel_options';
	
	public function all(): array
	{
		$options = get_option(self::OPTION_KEY, []);
		
		return is_array($options) ? $options : [];
	}
	
	public function find(string $slug): ?array
	{
		foreach ($this->all() as $setting) {
			if (
				is_array($setting) &&
				($setting['slug'] ?? '') === $slug
			) {
				return $setting;
			}
		}
		
		return null;
	}
	
	public function save(array $data): bool
	{
		$settings = $this->all();
		$slug = sanitize_key((string) ($data['slug'] ?? ''));
		
		if ($slug === '') {
			return false;
		}
		
		foreach ($settings as $index => $setting) {
			if (
				is_array($setting) &&
				($setting['slug'] ?? '') === $slug
			) {
				$merged = array_merge($setting, $data);
				if ($merged === $setting) {
					return true;
				}
				$settings[$index] = $merged;
				
				return update_option(
					self::OPTION_KEY,
					array_values($settings)
				);
			}
		}
		
		$settings[] = $data;
		
		return update_option(
			self::OPTION_KEY,
			array_values($settings)
		);
	}
	
    public function reorder(array $slugs): bool
    {
        $settings = $this->all();
        $bySlug = [];
        foreach ($settings as $setting) $bySlug[$setting['slug']] = $setting;
        if (count($slugs) !== count($bySlug) || count(array_unique($slugs)) !== count($slugs) || array_diff($slugs, array_keys($bySlug))) return false;
        $ordered = array_map(static fn(string $slug): array => $bySlug[$slug], $slugs);
        return $ordered === $settings || update_option(self::OPTION_KEY, $ordered);
    }

	public function remove(string $slug): bool
	{
		$settings = $this->all();
		
		$filtered = array_values(
			array_filter(
				$settings,
				static fn (mixed $setting): bool =>
					!is_array($setting) ||
					($setting['slug'] ?? '') !== $slug
			)
		);
		
		if (count($filtered) === count($settings)) {
			return false;
		}
		
		return update_option(
			self::OPTION_KEY,
			$filtered
		);
	}
	public function setDisabled(string $slug, bool $disabled): bool
	{
		$settings = $this->all();
		
		foreach ($settings as $index => $setting) {
			if (
				!is_array($setting) ||
				($setting['slug'] ?? '') !== $slug
			) {
				continue;
			}
			
            $previous = $settings;
			$settings[$index]['list_disabled'] = $disabled ? 'on' : 'off';
			$settings[$index]['disabled'] = $disabled;
			
			return $settings === $previous || update_option(
				self::OPTION_KEY,
				array_values($settings)
			);
		}
		
		return false;
	}
}