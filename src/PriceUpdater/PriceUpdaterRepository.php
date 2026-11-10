<?php

namespace SheetsExcelUpdater\PriceUpdater;

defined('ABSPATH') || exit;

final class PriceUpdaterRepository
{
	private const TABLE_SUFFIX = 'sheets_and_excel_updater';
	
	public function count(string $slug): int
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return (int)$wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
                FROM {$table}
                WHERE sheet_slug = %s
				AND (sheet_price != 0 OR site_price  != 0)",
				$slug
			)
		);
	}
	
    public function paginate(string $slug, int $page, int $perPage, string $sort = '', string $direction = 'asc', int $defaultStock = 1): array
    {
        global $wpdb;
        $table = $wpdb->prefix . self::TABLE_SUFFIX;
        $columns = [
            'product' => "COALESCE(NULLIF(parent.post_title, ''), r.sheet_product)",
            'sheetPrice' => 'r.sheet_price',
            'sitePrice' => "COALESCE(NULLIF((SELECT pm.meta_value FROM {$wpdb->postmeta} pm WHERE pm.post_id = r.attr_id AND pm.meta_key = '_price' LIMIT 1), ''), r.site_price) + 0",
            'stockQuantity' => 'CASE WHEN r.stock_quantity_override = 1 THEN r.stock_quantity ELSE ' . (int) $defaultStock . ' END',
            'listName' => 'r.list_name',
            'status' => "CASE WHEN variation.ID IS NULL THEN 'unconnected' WHEN r.product_onhold = 1 THEN 'on_hold' ELSE 'connected' END",
        ];
        $direction = strtolower($direction) === 'desc' ? 'DESC' : 'ASC';
        $order = isset($columns[$sort]) ? $columns[$sort] . " {$direction}, r.id ASC" : 'r.id ASC';
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT r.* FROM {$table} r
             LEFT JOIN {$wpdb->posts} variation ON variation.ID = r.attr_id
             LEFT JOIN {$wpdb->posts} parent ON parent.ID = variation.post_parent
             WHERE r.sheet_slug = %s AND (r.sheet_price != 0 OR r.site_price != 0)
             ORDER BY {$order} LIMIT %d OFFSET %d", $slug, $perPage, max(0, ($page - 1) * $perPage)
        ));
        return is_array($rows) ? $rows : [];
    }

	public function find(int $id): ?object
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT *
                FROM {$table}
                WHERE id = %d
                LIMIT 1",
				$id
			)
		);
		
		return $row ?: null;
	}
	
	public function resetSheetPrices(string $slug): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table}
                SET sheet_price = 0
                WHERE sheet_slug = %s",
					$slug
				)
			) !== false;
	}
	
	public function upsert(array $data): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$existingId = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT id
                FROM {$table}
                WHERE sheet_slug = %s
                AND sheet_full_name = %s
                LIMIT 1",
				$data['sheet_slug'],
				$data['sheet_full_name']
			)
		);

		if (!isset($data['list_name'])) {
			$data['list_name'] = '';
		}
		
		if ($existingId !== null) {
			return $wpdb->update(
					$table,
					[
						'sheet_product'   => (string) ($data['sheet_product'] ?? ''),
						'sheet_variation' => (string) ($data['sheet_variation'] ?? ''),
						'sheet_price'     => (int) ($data['sheet_price'] ?? 0),
					],
					['id' => (int) $existingId],
					['%s', '%s', '%d'],
					['%d']
				) !== false;
		}
		
		return $wpdb->insert(
				$table,
				[
					'sheet_slug'      => (string) ($data['sheet_slug'] ?? ''),
					'sheet_full_name' => (string) ($data['sheet_full_name'] ?? ''),
					'sheet_product'   => (string) ($data['sheet_product'] ?? ''),
					'sheet_variation' => (string) ($data['sheet_variation'] ?? ''),
					'sheet_price'     => (int) ($data['sheet_price'] ?? 0),
					'stock_quantity'  => (int) ($data['stock_quantity'] ?? 1),
					'list_name'       => (string) ($data['list_name'] ?? ''),
					'product_conect'  => 0,
					'product_onhold'  => 0,
				],
				['%s', '%s', '%s', '%s', '%d', '%d', '%s', '%d', '%d']
			) !== false;
	}
	
	public function beginTransaction(): void
	{
		global $wpdb;
		
		$wpdb->query('START TRANSACTION');
	}
	
	public function commit(): void
	{
		global $wpdb;
		
		$wpdb->query('COMMIT');
	}
	
	public function rollback(): void
	{
		global $wpdb;
		
		$wpdb->query('ROLLBACK');
	}
	
	public function lastError(): string
	{
		global $wpdb;
		
		return (string)$wpdb->last_error;
	}
	
	public function findBySlugAndId(
		string $slug,
		int    $id
	): ?object
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT *
            FROM {$table}
            WHERE id = %d
            AND sheet_slug = %s
            LIMIT 1",
				$id,
				$slug
			)
		);
		
		return $row ?: null;
	}
	
	public function findBestPriceRow(
		int   $variationId,
		array $slugs
	): ?object
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$slugs = array_values(
			array_filter(
				array_map(
					'sanitize_key',
					$slugs
				)
			)
		);
		
		if ($variationId <= 0 || $slugs === []) {
			return null;
		}
		
		$placeholders = implode(
			', ',
			array_fill(
				0,
				count($slugs),
				'%s'
			)
		);
		
		$params = [
			$variationId,
			...$slugs,
            ...$slugs,
		];
		
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT *
            FROM {$table}
            WHERE attr_id = %d
            AND sheet_slug IN ({$placeholders})
            AND product_onhold = 0
            AND sheet_price > 0
            ORDER BY sheet_price ASC, FIELD(sheet_slug, {$placeholders}) ASC, id ASC
            LIMIT 1",
				...$params
			)
		);
		
		return $row ?: null;
	}
	
	public function clearVariationConnection(
		string $slug,
		int    $variationId
	): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table}
            SET attr_id = NULL,
                site_price = NULL,
                product_conect = 0
            WHERE sheet_slug = %s
            AND attr_id = %d",
					$slug,
					$variationId
				)
			) !== false;
	}
	
	public function connectVariation(
		int $id,
		int $variationId
	): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->update(
				$table,
				[
					'attr_id' => $variationId,
					'product_conect' => 1,
				],
				[
					'id' => $id,
				],
				[
					'%d',
					'%d',
				],
				[
					'%d',
				]
			) !== false;
	}
	
	public function updateOnHold(
		int  $id,
		bool $onHold
	): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->update(
				$table,
				[
					'product_onhold' => $onHold ? 1 : 0,
				],
				[
					'id' => $id,
				],
				[
					'%d',
				],
				[
					'%d',
				]
			) !== false;
	}
	
	public function deleteVariationConnection(
		int $id
	): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->update(
				$table,
				[
					'attr_id' => null,
					'site_price' => null,
					'product_conect' => 0,
				],
				[
					'id' => $id,
				],
				[
					'%d',
					'%d',
					'%d',
				],
				[
					'%d',
				]
			) !== false;
	}
	
	public function getConnectedRows(
		string $slug
	): array
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT *
            FROM {$table}
            WHERE sheet_slug = %s
            AND attr_id IS NOT NULL
            AND attr_id > 0
            ORDER BY id ASC",
				$slug
			)
		);
		
		return is_array($rows) ? $rows : [];
	}
	
	public function getConnectedRowsBatch(
		string $slug,
		int    $lastId,
		int    $limit
	): array
	{
		global $wpdb;
		
		$table = $wpdb->prefix . 'sheets_and_excel_updater';
		
		$limit = min(100, max(1, $limit));
		
		return $wpdb->get_results(
			$wpdb->prepare(
				"SELECT *
             FROM {$table}
             WHERE sheet_slug = %s
               AND id > %d
               AND attr_id IS NOT NULL
               AND product_onhold = 0
             ORDER BY id ASC
             LIMIT %d",
				$slug,
				$lastId,
				$limit
			)
		) ?: [];
	}
	
	public function countConnectedRows(string $slug): int
	{
		global $wpdb;
		
		$table = $wpdb->prefix . 'sheets_and_excel_updater';
		
		return (int)$wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
             FROM {$table}
             WHERE sheet_slug = %s
               AND attr_id IS NOT NULL
               AND product_onhold = 0",
				$slug
			)
		);
	}
	
    public function getDisableTasks(string $slug): array
    {
        global $wpdb;
        $table = $wpdb->prefix . self::TABLE_SUFFIX;
        return $wpdb->get_results($wpdb->prepare(
            "SELECT MIN(r.id) AS id, r.attr_id AS variationId, COALESCE(p.post_parent, 0) AS parentId
             FROM {$table} r LEFT JOIN {$wpdb->posts} p ON p.ID = r.attr_id
             WHERE r.sheet_slug = %s AND r.attr_id > 0 AND r.product_onhold = 0
             GROUP BY r.attr_id, p.post_parent ORDER BY MIN(r.id) ASC", $slug
        ), ARRAY_A) ?: [];
    }

	public function disableSheetList(string $slug): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		return $wpdb->update(
				$table,
				[
					'sheet_price' => 0,
				],
				[
					'sheet_slug' => $slug,
				],
				[
					'%d',
				],
				[
					'%s',
				]
			) !== false;
	}
	
	public function update(
		int   $id,
		array $data
	): bool
	{
		global $wpdb;
		
		$table = $wpdb->prefix . self::TABLE_SUFFIX;
		
		$formats = [];
		
		foreach ($data as $value) {
			$formats[] = match (true) {
				is_int($value),
				is_bool($value) => '%d',
				is_float($value) => '%f',
				default => '%s',
			};
		}
		
		return $wpdb->update(
				$table,
				$data,
				[
					'id' => $id,
				],
				$formats,
				[
					'%d',
				]
			) !== false;
	}
}