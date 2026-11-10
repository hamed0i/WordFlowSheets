<?php
namespace SheetsExcelUpdater\PriceUpdater;

defined('ABSPATH') || exit;

final class PriceAdjustment
{
    public static function parse(string $input): ?array
    {
        $input = \SheetsExcelUpdater\Support\LocalizedNumbers::normalize($input);
        $input = strtr($input, [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
            '٪'=>'%', '٫'=>'.',
        ]);
        $input = preg_replace('/[\s\x{00a0}\x{200c},٬]/u', '', trim($input));
        if (!is_string($input) || !preg_match('/^(\d+(?:\.\d+)?)(%)?$/D', $input, $match)) return null;
        $percentage = isset($match[2]) && $match[2] === '%';
        $value = (float) $match[1];
        if (!is_finite($value) || $value > 1000000000000 || (!$percentage && floor($value) !== $value)) return null;
        return ['type' => $percentage ? 'percent' : 'fixed', 'value' => $value, 'input' => $input];
    }

    public static function apply(int $basePrice, string $input, int $zeros): int
    {
        if ($basePrice <= 0) return 0;
        $adjustment = self::parse($input);
        if ($adjustment === null || $zeros < 0 || $zeros > 9) {
            throw new \InvalidArgumentException('تنظیم افزایش قیمت یا گردکردن معتبر نیست.');
        }
        if ($adjustment['type'] === 'percent') {
            $unit = 10 ** $zeros;
            // Round upwards, matching the previous percentage behavior.
            $price = ceil(round(($basePrice * (1 + $adjustment['value'] / 100)) / $unit, 8)) * $unit;
        } else {
            $price = $basePrice + $adjustment['value'];
        }
        if (!is_finite((float) $price) || $price > PHP_INT_MAX) {
            throw new \OverflowException('قیمت محاسبه‌شده بیش از حد مجاز است.');
        }
        return (int) $price;
    }
}