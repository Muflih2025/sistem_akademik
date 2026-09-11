<?php
require_once __DIR__.'/config.php';
function require_login(): void { ensure_auth_tables(); if (!current_user()) redirect('../auth/login.php'); }
function require_role(string ...$roles): void { require_login(); if (!in_array(current_user()['role'], $roles, true)) redirect('../errors/403.php'); }
function user_reference(): string|int|null { return current_user()['id_referensi'] ?? null; }
