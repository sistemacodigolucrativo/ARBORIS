<?php
declare(strict_types=1);

namespace App\Core;

/**
 * CSRF Protection Utility
 * Cryptographically secure tokens with constant-time comparison
 */
class Csrf
{
    private const SESSION_KEY = '_csrf_token';

    public static function getToken(): string
    {
        Session::start();
        $token = Session::get(self::SESSION_KEY);
        if (!$token) {
            $token = bin2hex(random_bytes(32));
            Session::set(self::SESSION_KEY, $token);
        }
        return $token;
    }

    public static function validate(?string $submittedToken): bool
    {
        if (empty($submittedToken)) {
            return false;
        }
        $stored = Session::get(self::SESSION_KEY);
        if (!$stored) {
            return false;
        }
        return hash_equals($stored, $submittedToken);
    }

    public static function inputField(): string
    {
        $token = htmlspecialchars(self::getToken(), ENT_QUOTES, 'UTF-8');
        return '<input type="hidden" name="_csrf" value="' . $token . '">';
    }
}
