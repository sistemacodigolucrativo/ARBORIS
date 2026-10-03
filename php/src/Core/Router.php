<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Lightweight, Ultra-Fast Regular Expression Router
 * Memory footprint: < 0.1 MB
 */
class Router
{
    private array $routes = [];

    public function get(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }

    private function addRoute(string $method, string $path, callable|array $handler, array $middlewares): void
    {
        // Convert {param} to regex named captures
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        $regex = '#^' . rtrim($pattern, '/') . '$#';

        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'regex' => $regex,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function dispatch(Request $request): void
    {
        $method = $request->getMethod();
        $path = $request->getPath();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['regex'], $path, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                // Run Middlewares
                foreach ($route['middlewares'] as $mw) {
                    $mwResult = $this->runMiddleware($mw, $request);
                    if ($mwResult !== true) {
                        return; // Stopped by middleware
                    }
                }

                // Call Handler
                $handler = $route['handler'];
                if (is_array($handler)) {
                    [$class, $action] = $handler;
                    $controller = new $class();
                    $controller->$action($request, $params);
                    return;
                }

                if (is_callable($handler)) {
                    $handler($request, $params);
                    return;
                }
            }
        }

        // 404 Not Found
        if ($request->isJson()) {
            Response::json(['error' => 'Endpoint não encontrado', 'path' => $path], 404);
        } else {
            Response::html("<h1>404 - Página Não Encontrada</h1><p>O recurso solicitado não existe.</p><a href='/'>Voltar</a>", 404);
        }
    }

    private function runMiddleware(string $middlewareName, Request $request): bool
    {
        switch ($middlewareName) {
            case 'auth':
                Session::start();
                if (!Session::has('user_id')) {
                    if ($request->isJson()) {
                        Response::json(['error' => 'Não autenticado'], 401);
                    } else {
                        Session::setFlash('error', 'Por favor, autentique-se para continuar.');
                        Response::redirect('/login');
                    }
                    return false;
                }
                return true;

            case 'admin':
                Session::start();
                if (Session::get('user_role') !== 'admin') {
                    if ($request->isJson()) {
                        Response::json(['error' => 'Acesso restrito a administradores'], 403);
                    } else {
                        Session::setFlash('error', 'Acesso negado. Requer permissão administrativa.');
                        Response::redirect('/dashboard');
                    }
                    return false;
                }
                return true;

            case 'csrf':
                if ($request->getMethod() === 'POST') {
                    $token = $request->input('_csrf');
                    if (!Csrf::validate($token)) {
                        if ($request->isJson()) {
                            Response::json(['error' => 'Falha de validação CSRF. Atualize a página e tente novamente.'], 403);
                        } else {
                            Session::setFlash('error', 'Sessão expirada ou token de segurança inválido.');
                            Response::redirect($_SERVER['HTTP_REFERER'] ?? '/');
                        }
                        return false;
                    }
                }
                return true;

            case 'rate_limit':
                $ip = $request->getIp();
                $path = $request->getPath();
                if (!RateLimiter::check("{$ip}_{$path}", 15, 60)) {
                    Response::json(['error' => 'Muitas requisições. Aguarde um minuto e tente novamente.'], 429);
                    return false;
                }
                return true;
        }

        return true;
    }
}
