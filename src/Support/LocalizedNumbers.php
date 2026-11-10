<?php
namespace SheetsExcelUpdater\Support;
defined('ABSPATH') || exit;
final class LocalizedNumbers
{
    public static function normalize(string $value): string
    {
        $value = strtr($value, [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
            '−'=>'-','–'=>'-','﹣'=>'-','－'=>'-','٫'=>'.','٪'=>'%',
        ]);
        return (string) preg_replace('/[\s,٬\x{200e}\x{200f}\x{2066}-\x{2069}]/u', '', $value);
    }
}