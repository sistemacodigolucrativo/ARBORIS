<?php
declare(strict_types=1);

/**
 * Arboris Web Application Entry Point
 * High-performance, zero-overhead bootstrap for 512MB RAM VPS
 */

// Autoloading
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\Session;
use App\Core\Database;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\TreeController;
use App\Controllers\AdminController;
use App\Controllers\ApiController;

// Initialize Session & Error Handling
Session::start();

// Ensure Database & Migrations on first run
try {
    Database::runMigrations();
} catch (\Throwable $e) {
    error_log("[Bootstrap Error] Migrations check: " . $e->getMessage());
}

$router = new Router();
$request = new Request();

// Public Routes
$router->get('/', function() {
    if (Session::has('user_id')) {
        Response::redirect('/dashboard');
    } else {
        Response::redirect('/login');
    }
});

$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'postLogin'], ['csrf', 'rate_limit']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->get('/register', [AuthController::class, 'showRegister']);
$router->post('/register', [AuthController::class, 'postRegister'], ['csrf', 'rate_limit']);
$router->get('/ref/{token}', [AuthController::class, 'showRegister']);

// Authenticated Player Routes
$router->get('/dashboard', [DashboardController::class, 'index'], ['auth']);
$router->get('/arvore-mae', [TreeController::class, 'motherTree'], ['auth']);
$router->post('/arvore-mae/transferir', [TreeController::class, 'transfer'], ['auth', 'csrf']);

// Administrative Routes
$router->get('/admin', [AdminController::class, 'index'], ['auth', 'admin']);
$router->post('/admin/user/{id}/toggle-status', [AdminController::class, 'toggleUserStatus'], ['auth', 'admin', 'csrf']);
$router->post('/admin/setting/update', [AdminController::class, 'updateSetting'], ['auth', 'admin', 'csrf']);

// JSON API Endpoints
$router->get('/api/referral/check', [ApiController::class, 'checkReferral']);
$router->get('/api/tree/{id}', [ApiController::class, 'getTreeData']);
$router->post('/api/transfer/participante-vez', [ApiController::class, 'transferParticipanteVez'], ['auth']);
$router->get('/api/player/summary', [ApiController::class, 'getPlayerSummary'], ['auth']);

// Dispatch
$router->dispatch($request);
