<?php

namespace SheetsExcelUpdater\Api;

defined('ABSPATH') || exit;

final class ProductSearchController
{
	public function register(): void
	{
		register_rest_route(
			'sheets-excel-updater/v1',
			'/products/search',
			[
				'methods' => 'GET',
				'callback' => [$this, 'search'],
				'permission_callback' => [$this, 'permission'],
			]
		);
	}
	
	public function permission(): bool
	{
		return current_user_can('manage_woocommerce');
	}
	
	public function search(\WP_REST_Request $request): \WP_REST_Response|\WP_Error
	{
		$search = sanitize_text_field(
			(string) $request->get_param('search')
		);
		
		$limit = absint(
			$request->get_param('limit') ?: 20
		);
		
		$limit = min(50, max(1, $limit));
		
		if ($search === '') {
			return new \WP_REST_Response([
				'success' => true,
				'data' => [],
			]);
		}
		
		$terms = preg_split(
			'/\s+/u',
			trim($search),
			-1,
			PREG_SPLIT_NO_EMPTY
		);
		
		if (!is_array($terms) || $terms === []) {
			return new \WP_REST_Response([
				'success' => true,
				'data' => [],
			]);
		}
		
		$metaKey = sanitize_text_field(
			(string) get_option(
				'input_add_meta_search_excel_updater',
				''
			)
		);
		
		$this->searchTerms = $terms;
		$this->searchMetaKey = $metaKey;
		
		add_filter(
			'posts_clauses',
			[$this, 'filterSearchClauses'],
			10,
			2
		);
		
		try {
			$query = new \WP_Query([
				'post_type' => 'product',
				'sheets_excel_updater_search' => true,
				'post_status' => 'publish',
				'posts_per_page' => $limit,
				'fields' => 'ids',
				'no_found_rows' => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			]);
		} finally {
			remove_filter(
				'posts_clauses',
				[$this, 'filterSearchClauses'],
				10
			);
			
			$this->searchTerms = [];
			$this->searchMetaKey = '';
		}
		
		$products = [];
		
		foreach ($query->posts as $productId) {
			$product = wc_get_product($productId);
			
			if (!$product) {
				continue;
			}
			
			$products[] = $this->mapProduct($product);
		}
		
		return new \WP_REST_Response([
			'success' => true,
			'data' => $products,
		]);
	}
	
	public function filterSearchClauses(
		array $clauses,
		\WP_Query $query
	): array {
		global $wpdb;
		
		if ($this->searchTerms === [] || !$query->get('sheets_excel_updater_search')) {
			return $clauses;
		}
		
		$conditions = [];
		
		foreach ($this->searchTerms as $term) {
			$like = '%' . $wpdb->esc_like($term) . '%';
			
			$termConditions = [
				$wpdb->prepare(
					"{$wpdb->posts}.post_title LIKE %s",
					$like
				),
			];
			
			if ($this->searchMetaKey !== '') {
				$termConditions[] = $wpdb->prepare(
					"EXISTS (
                        SELECT 1
                        FROM {$wpdb->postmeta} search_meta
                        WHERE search_meta.post_id = {$wpdb->posts}.ID
                        AND search_meta.meta_key = %s
                        AND search_meta.meta_value LIKE %s
                    )",
					$this->searchMetaKey,
					$like
				);
				$termConditions[] = $wpdb->prepare(
					"EXISTS (
                        SELECT 1 FROM {$wpdb->posts} meta_child
                        INNER JOIN {$wpdb->postmeta} variation_search_meta ON variation_search_meta.post_id = meta_child.ID
                        WHERE meta_child.post_parent = {$wpdb->posts}.ID
                        AND meta_child.post_type = 'product_variation'
                        AND meta_child.post_status IN ('publish', 'private')
                        AND variation_search_meta.meta_key = %s
                        AND variation_search_meta.meta_value LIKE %s
                    )",
					$this->searchMetaKey,
					$like
				);

			}
			
			$conditions[] = '(' . implode(
					' OR ',
					$termConditions
				) . ')';
		}
		
		$clauses['where'] .= ' AND ' . implode(
				' AND ',
				$conditions
			);
		
		return $clauses;
	}
	
	private array $searchTerms = [];
	
	private string $searchMetaKey = '';
	
	private function readMetaValue(\WC_Product $product, string $key): ?string
	{
		if ($key === '') return null;
		$value = $product->get_meta($key, true);
		if (!is_scalar($value)) return null;
		$value = trim((string) $value);
		return $value !== '' ? $value : null;
	}

	private function mapProduct(
		\WC_Product $product
	): array {
		$variations = [];
		$variationMetaValues = [];
		$metaKey = sanitize_text_field((string) get_option('input_add_meta_search_excel_updater', ''));
		
		if ($product->is_type('variable')) {
			foreach (
				$product->get_children()
				as $variationId
			) {
				$variation = wc_get_product($variationId);
				
				if (!$variation) {
					continue;
				}
				
				$attributes = [];
				
				foreach (
					$variation->get_attributes()
					as $name => $value
				) {
					if ($value === '') {
						continue;
					}
					
					$taxonomy = str_starts_with($name, 'pa_')
						? $name
						: 'pa_' . $name;
					
					$term = get_term_by(
						'slug',
						$value,
						$taxonomy
					);
					
					$attributes[] = [
						'name' => $name,
						'value' => $term instanceof \WP_Term
							? $term->name
							: $value,
					];
				}
				
				$variationMeta = $this->readMetaValue($variation, $metaKey);
				if ($variationMeta !== null) $variationMetaValues[] = $variationMeta;
				$variations[] = [
					'metaValue' => $variationMeta,
					'id' => $variation->get_id(),
					'name' => $variation->get_name(),
					'attributes' => $attributes,
					'price' => (float) $variation->get_price(),
				];
			}
		}
		
		// خواندن مقدار Meta Key در صورت تنظیم بودن
		$metaKey = sanitize_text_field(
			(string) get_option('input_add_meta_search_excel_updater', '')
		);
		$metaValue = $this->readMetaValue($product, $metaKey);
		if ($metaValue === null && $variationMetaValues !== []) {
			$metaValue = implode(' · ', array_unique($variationMetaValues));
		}
		
		return [
			'id'         => $product->get_id(),
			'name'       => $product->get_name(),
			'sku'        => $product->get_sku(),
			'type'       => $product->get_type(),
			'metaValue'  => $metaValue,
			'variations' => $variations,
		];
	}
}