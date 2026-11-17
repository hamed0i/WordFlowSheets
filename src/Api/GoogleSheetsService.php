<?php

namespace SheetsExcelUpdater\Api;

use WP_Error;

defined('ABSPATH') || exit;

final class GoogleSheetsService
{
	public function getHeaders(
		string $spreadsheetId,
		string $apiKey,
		string $sheetName,
		string $range
	): array|WP_Error {
		$payload = $this->request(
			$spreadsheetId,
			$apiKey,
			$sheetName,
			$range
		);
		
		if (is_wp_error($payload)) {
			return $payload;
		}
		
		$values = $payload['values'] ?? null;
		
		if (
			!is_array($values) ||
			!isset($values[0]) ||
			!is_array($values[0])
		) {
			return new WP_Error(
				'google_sheet_headers_not_found',
				'هیچ Headerای در شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		// پیدا کردن اولین سطری که شامل هدر است (سطر ۱ یا ۲)
		$headerRow = $values[0];
		if (isset($values[1]) && is_array($values[1])) {
			// اگر سطر اول فقط دسته‌بندی است و سطر دوم هدر اصلی
			$count1 = count(array_filter($values[0], static fn($c) => !empty(trim((string)$c))));
			$count2 = count(array_filter($values[1], static fn($c) => !empty(trim((string)$c))));
			if ($count2 > $count1) {
				$headerRow = $values[1];
			}
		}
		
		$headers = [];
		foreach ($headerRow as $header) {
			if (!is_string($header)) {
				continue;
			}
			$header = trim($header);
			if ($header !== '') {
				$headers[] = $header;
			}
		}
		
		$headers = array_values(array_unique($headers));
		
		if ($headers === []) {
			return new WP_Error(
				'google_sheet_headers_empty',
				'Headerهای شیت خالی هستند.',
				['status' => 404]
			);
		}
		
		return $headers;
	}
	
	public function getRows(
		string $spreadsheetId,
		string $apiKey,
		string $sheetName,
		string $range
	): array|WP_Error {
		$payload = $this->request(
			$spreadsheetId,
			$apiKey,
			$sheetName,
			$range
		);
		
		if (is_wp_error($payload)) {
			return $payload;
		}
		
		return $this->parseValues($payload['values'] ?? []);
	}

	public function parseValues(array $values): array|WP_Error
	{

		
		if (
			!is_array($values) ||
			!isset($values[0]) ||
			!is_array($values[0])
		) {
			return new WP_Error(
				'google_sheet_data_not_found',
				'هیچ داده‌ای در شیت پیدا نشد.',
				['status' => 404]
			);
		}
		
		// تشخیص اینکه سطر هدر سطر ۱ است یا سطر ۲
		$headerRowIndex = 0;
		if (isset($values[1]) && is_array($values[1])) {
			$count1 = count(array_filter($values[0], static fn($c) => !empty(trim((string)$c))));
			$count2 = count(array_filter($values[1], static fn($c) => !empty(trim((string)$c))));
			if ($count2 > $count1) {
				$headerRowIndex = 1;
			}
		}
		
		$rawHeaders = [];
		foreach ($values[$headerRowIndex] as $colIndex => $header) {
			$rawHeaders[$colIndex] = is_string($header) ? trim($header) : '';
		}
		
		$dataRows = array_slice($values, $headerRowIndex + 1);
		
		// آرایه نهایی ردیف‌ها
		$flatRows = [];
		
		// پیدا کردن موقعیت تمام ستون‌هایی که هدر دارند (برای پشتیبانی از چند جدول کنار هم)
		// یک بلوک شامل ستون‌های مجاور تا شروع مجدد هدر اول (مثلاً ستون 'مدل') است
		$firstHeaderName = null;
		$headerGroups = [];
		$currentGroup = [];
		
		foreach ($rawHeaders as $colIdx => $hName) {
			if ($hName === '') {
				continue;
			}
			if ($firstHeaderName === null) {
				$firstHeaderName = $hName;
			}
			
			// اگر دوباره به هدر اول رسیدیم، یعنی ستون جدیدی از جدول موازی شروع شده
			if ($hName === $firstHeaderName && !empty($currentGroup)) {
				$headerGroups[] = $currentGroup;
				$currentGroup = [];
			}
			
			$currentGroup[$colIdx] = $hName;
		}
		if (!empty($currentGroup)) {
			$headerGroups[] = $currentGroup;
		}
		
		// حالا سطرهای فایل را پیمایش می‌کنیم و برای هر گروه ستونی، یک رکورد مستقل می‌سازیم
		foreach ($dataRows as $valuesRow) {
			if (!is_array($valuesRow)) {
				continue;
			}
			
			foreach ($headerGroups as $group) {
				$rowItem = [];
				$hasAnyValue = false;
				
				foreach ($group as $colIdx => $hName) {
					$val = isset($valuesRow[$colIdx]) && is_scalar($valuesRow[$colIdx])
						? trim((string) $valuesRow[$colIdx])
						: '';
					
					$rowItem[$hName] = $val;
					if ($val !== '') {
						$hasAnyValue = true;
					}
				}
				
				// اگر در این بلوک ستونی حداقل مقداری وجود داشت، اضافه شود
				if ($hasAnyValue) {
					$flatRows[] = $rowItem;
				}
			}
		}
		
		return $flatRows;
	}
	

	
    public static function validateConnection(array $credentials): array|WP_Error
    {
        $enabled = $credentials['useWorker'] ?? false;
        if (!is_bool($enabled)) {
            return new WP_Error('invalid_worker_mode', 'وضعیت اتصال با ورکر معتبر نیست.', ['status' => 400]);
        }
        $url = trim((string) ($credentials['workerUrl'] ?? ''));
        $token = trim((string) ($credentials['workerToken'] ?? ''));
        if ($enabled) {
            $parts = wp_parse_url($url);
            if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
                || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
                || !wp_http_validate_url($url)) {
                return new WP_Error('invalid_worker_url', 'آدرس ورکر باید HTTPS و عمومی، بدون پارامتر یا اطلاعات ورود باشد.', ['status' => 400]);
            }
            if (!preg_match('/^[\x21-\x7E]{32,256}$/D', $token)) {
                return new WP_Error('invalid_worker_token', 'کلید ورکر باید ۳۲ تا ۲۵۶ کاراکتر ASCII قابل چاپ، بدون فاصله یا خط جدید باشد؛ علامت‌های ویژه مجازند.', ['status' => 400]);
            }
        }
        return ['useWorker' => $enabled, 'workerUrl' => $url, 'workerToken' => $token];
    }

	private function request(
		string $spreadsheetId,
		string $apiKey,
		string $sheetName,
		string $range
	): array|WP_Error {
		$spreadsheetId = sanitize_text_field($spreadsheetId);
		$apiKey = sanitize_text_field($apiKey);
		$sheetName = sanitize_text_field($sheetName);
		$range = sanitize_text_field($range);
		
		if (
			$spreadsheetId === '' ||
			$apiKey === '' ||
			$sheetName === '' ||
			$range === ''
		) {
			return new WP_Error(
				'invalid_sheet_credentials',
				'اطلاعات اتصال به شیت کامل نیست.',
				['status' => 400]
			);
		}
		
		$encodedRange = rawurlencode(
			sprintf(
				'%s!%s',
				$sheetName,
				$range
			)
		);
		
		$url = add_query_arg(
			[
				'key' => $apiKey,
				'majorDimension' => 'ROWS',
			],
			sprintf(
				'https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s',
				rawurlencode($spreadsheetId),
				$encodedRange
			)
		);
		
        $storedConnection = get_option('wordflow_sheets_worker', []);
        $connection = self::validateConnection(is_array($storedConnection) ? $storedConnection : []);
        if (is_wp_error($connection)) {
            return $connection;
        }
        $args = ['timeout' => 30, 'redirection' => 0];
        if ($connection['useWorker']) {
            $url = $connection['workerUrl'];
            $args['method'] = 'POST';
            $args['headers'] = [
                'Content-Type' => 'application/json',
                'X-Worker-Token' => $connection['workerToken'],
            ];
            $args['body'] = wp_json_encode([
                'spreadsheetId' => $spreadsheetId,
                'apiKey' => $apiKey,
                'sheetName' => $sheetName,
                'range' => $range,
            ]);
        }
        $response = wp_safe_remote_request($url, $args);

		if (is_wp_error($response)) {
			return new WP_Error(
				'google_sheets_request_failed',
				$connection['useWorker'] ? 'ارتباط با ورکر برقرار نشد؛ آدرس و دسترسی سرور را بررسی کنید.' : 'ارتباط با Google Sheets برقرار نشد.',
				[
					'status' => 502,
					'transport_code' => $response->get_error_code(),
				]
			);
		}
		
		$statusCode = wp_remote_retrieve_response_code($response);
		$body = wp_remote_retrieve_body($response);
		
		if ($statusCode < 200 || $statusCode >= 300) {
            $message = 'Google Sheets درخواست را نپذیرفت (HTTP ' . $statusCode . ').';
            if ($connection['useWorker']) {
                $errorPayload = json_decode($body, true);
                $error = is_array($errorPayload) && is_array($errorPayload['error'] ?? null) ? $errorPayload['error'] : [];
                $code = (string) ($error['code'] ?? '');
                $legacy = (string) ($error['message'] ?? '');
                $source = (string) wp_remote_retrieve_header($response, 'x-wordflow-source');
                $known = [
                    'worker_token_missing' => 'کلید WORKER_TOKEN در نسخهٔ منتشرشدهٔ همین ورکر تعریف نشده است. Secret را در همان ورکر و محیطی که آدرسش در افزونه است اضافه و Deploy کنید.',
                    'worker_token_invalid' => 'مقدار WORKER_TOKEN در Cloudflare نامعتبر است؛ طول باید ۳۲ تا ۲۵۶ کاراکتر ASCII قابل چاپ، بدون فاصله یا خط جدید باشد. نسخهٔ جدید کد ورکر را Deploy کنید.',
                    'worker_token_mismatch' => 'کلید ذخیره‌شده در افزونه با WORKER_TOKEN ورکر یکسان نیست. مقدار اصلی کلید را در هر دو محل وارد کنید.',
                ];
                if (isset($known[$code])) {
                    $message = $known[$code];
                } elseif ($legacy === 'WORKER_TOKEN is missing or invalid.') {
                    $message = 'خود ورکر WORKER_TOKEN را تعریف‌نشده یا نامعتبر تشخیص داده است. Secret و نسخهٔ کد را در ورکری که آدرسش در افزونه است بررسی و Deploy کنید.';
                } elseif ($legacy === 'Unauthorized.') {
                    $message = $known['worker_token_mismatch'];
                } elseif ($source === 'google') {
                    $message = 'ورکر به گوگل متصل شد، اما Google Sheets پاسخ HTTP ' . $statusCode . ' داد. در خطای ۵۰۳ کمی بعد دوباره تلاش کنید.';
                } elseif (!is_array($errorPayload)) {
                    $message = 'آدرس ورکر پاسخ غیر JSON با HTTP ' . $statusCode . ' برگرداند؛ علت از این پاسخ مشخص نیست. دسترسی به ورکر و لاگ Cloudflare را بررسی کنید.';
                } else {
                    $message = 'مسیر ورکر پاسخ HTTP ' . $statusCode . ' داد؛ منشأ خطا مشخص نیست. کد جدید ورکر را Deploy و دوباره تلاش کنید.';
                }
            }

			return new WP_Error(
				'google_sheets_api_error',
				$message,
				[
					'status' => 502,
					'google_status' => $statusCode,
				]
			);
		}
		
		$payload = json_decode($body, true);
		
		if (!is_array($payload)) {
			return new WP_Error(
				'invalid_google_response',
				'پاسخ Google Sheets معتبر نیست.',
				['status' => 502]
			);
		}
		
		return $payload;
	}
}