<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Ultra-Lightweight Zero-Memory Template View Engine
 * Eliminates compilation overhead and renders directly in microsecond time
 */
class View
{
    private static string $viewsPath = __DIR__ . '/../../views';

    public static function render(string $template, array $data = []): string
    {
        $file = self::$viewsPath . '/' . str_replace('.', '/', $template) . '.php';
        if (!file_exists($file)) {
            throw new \RuntimeException("View template not found: {$file}");
        }

        // Shared helpers
        $csrfField = Csrf::inputField();
        $csrfToken = Csrf::getToken();
        $flashSuccess = Session::getFlash('success');
        $flashError = Session::getFlash('error');
        $currentUser = Session::has('user_id') ? [
            'id' => Session::get('user_id'),
            'username' => Session::get('username'),
            'role' => Session::get('user_role'),
            'full_name' => Session::get('full_name')
        ] : null;

        extract($data, EXTR_SKIP);

        ob_start();
        include $file;
        return (string)ob_get_clean();
    }

    public static function escape(mixed $string): string
    {
        return htmlspecialchars((string)$string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

// Global short escape helper for clean templating
if (!function_exists('e')) {
    function e(mixed $string): string
    {
        return View::escape($string);
    }
}
