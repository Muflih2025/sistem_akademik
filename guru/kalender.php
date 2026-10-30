<?php require_once __DIR__.'/../config/auth.php';require_role('guru');if($_SERVER['REQUEST_METHOD']==='POST')deny_access();require __DIR__.'/../shared/kalender.php';
