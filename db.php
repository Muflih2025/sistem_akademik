<?php
function adminer_object() {
    class AdminerCustom extends Adminer {
        function name() {
            return 'Database SIA SMKN 2 Magelang';
        }
        function login($login, $password) {
            return true;
        }
        function loginFormField($name, $heading, $value) {
            if ($name === 'driver') {
                return $heading . '<select name="auth[driver]"><option value="server" selected>MySQL</option></select>';
            }
            if ($name === 'server') {
                return $heading . '<input name="auth[server]" value="127.0.0.1:3307" title="hostname[:port]">';
            }
            if ($name === 'username') {
                return $heading . '<input name="auth[username]" id="username" value="root">';
            }
            if ($name === 'password') {
                return $heading . '<input type="password" name="auth[password]" value="" placeholder="(biarkan kosong)">';
            }
            if ($name === 'db') {
                return $heading . '<input name="auth[db]" value="db_sia_smkn2_magelang">';
            }
            return parent::loginFormField($name, $heading, $value);
        }
    }
    return new AdminerCustom;
}
include __DIR__ . '/adminer.php';
