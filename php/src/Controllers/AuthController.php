<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Core\View;
use App\Services\AuthService;
use App\Services\ReferralService;

class AuthController
{
    public function showLogin(Request $request): void
    {
        if (Session::has('user_id')) {
            Response::redirect('/dashboard');
        }
        Response::html(View::render('auth.login'));
    }

    public function postLogin(Request $request): void
    {
        $identifier = trim((string)$request->input('identifier'));
        $password = (string)$request->input('password');

        if (empty($identifier) || empty($password)) {
            Session::setFlash('error', 'Preencha todos os campos para entrar.');
            Response::redirect('/login');
        }

        try {
            $user = AuthService::attempt($identifier, $password);
            if (!$user) {
                Session::setFlash('error', 'Credenciais inválidas. Verifique seu usuário e senha.');
                Response::redirect('/login');
            }

            Session::setFlash('success', "Bem-vindo de volta, {$user['full_name']}!");
            Response::redirect('/dashboard');
        } catch (\Throwable $e) {
            Session::setFlash('error', $e->getMessage());
            Response::redirect('/login');
        }
    }

    public function showRegister(Request $request, array $params): void
    {
        $token = $params['token'] ?? (string)$request->getQuery('ref', '');
        $linkData = null;

        if (!empty($token)) {
            $linkData = ReferralService::validateToken($token);
        }

        Response::html(View::render('auth.register', [
            'token' => $token,
            'linkData' => $linkData
        ]));
    }

    public function postRegister(Request $request): void
    {
        $token = trim((string)$request->input('token'));
        $username = trim((string)$request->input('username'));
        $email = trim((string)$request->input('email'));
        $fullName = trim((string)$request->input('full_name'));
        $password = (string)$request->input('password');
        $passwordConfirm = (string)$request->input('password_confirmation');

        if (empty($token)) {
            Session::setFlash('error', 'Link de indicação obrigatório para cadastro no sistema.');
            Response::redirect('/register');
        }

        if (empty($username) || empty($email) || empty($fullName) || empty($password)) {
            Session::setFlash('error', 'Por favor, preencha todos os campos obrigatórios.');
            Response::redirect('/ref/' . urlencode($token));
        }

        if ($password !== $passwordConfirm) {
            Session::setFlash('error', 'As senhas informadas não coincidem.');
            Response::redirect('/ref/' . urlencode($token));
        }

        if (strlen($password) < 6) {
            Session::setFlash('error', 'A senha deve conter no mínimo 6 caracteres.');
            Response::redirect('/ref/' . urlencode($token));
        }

        try {
            $user = ReferralService::registerWithReferral(
                $token,
                $username,
                $email,
                $fullName,
                $password
            );

            // Automatically log in newly registered user
            AuthService::attempt($username, $password);

            Session::setFlash('success', "Cadastro concluído! Você recebeu {$user['tokens_granted']} fichas gratuitas e foi alocado na árvore.");
            Response::redirect('/arvore-mae');
        } catch (\Throwable $e) {
            Session::setFlash('error', $e->getMessage());
            Response::redirect('/ref/' . urlencode($token));
        }
    }

    public function logout(): void
    {
        AuthService::logout();
        Response::redirect('/login');
    }
}
