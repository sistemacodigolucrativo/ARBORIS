<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Lightweight HTTP Request wrapper
 */
class Request
{
    private array $get;
    private array $post;
    private array $server;
    private ?array $json = null;

    public function __construct()
    {
        $this->get = $_GET;
        $this->post = $_POST;
        $this->server = $_SERVER;
    }

    public function getMethod(): string
    {
        return strtoupper($this->server['REQUEST_METHOD'] ?? 'GET');
    }

    public function getPath(): string
    {
        $uri = $this->server['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        return rtrim($path, '/') ?: '/';
    }

    public function getQuery(string $key, mixed $default = null): mixed
    {
        return $this->get[$key] ?? $default;
    }

    public function getPost(string $key, mixed $default = null): mixed
    {
        return $this->post[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        if ($this->isJson()) {
            $json = $this->getJson();
            return $json[$key] ?? $default;
        }
        return $this->post[$key] ?? $this->get[$key] ?? $default;
    }

    public function all(): array
    {
        if ($this->isJson()) {
            return $this->getJson();
        }
        return array_merge($this->get, $this->post);
    }

    public function isJson(): bool
    {
        $contentType = $this->server['CONTENT_TYPE'] ?? '';
        return str_contains($contentType, 'application/json');
    }

    public function getJson(): array
    {
        if ($this->json === null) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode((string)$raw, true);
            $this->json = is_array($decoded) ? $decoded : [];
        }
        return $this->json;
    }

    public function getIp(): string
    {
        return $this->server['HTTP_X_FORWARDED_FOR'] ??
               $this->server['REMOTE_ADDR'] ??
               '127.0.0.1';
    }

    public function getUserAgent(): string
    {
        return substr($this->server['HTTP_USER_AGENT'] ?? 'Unknown', 0, 255);
    }
}
