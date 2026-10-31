<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/transfer.php';
require_once dirname(__DIR__).'/academic/layout.php';
require_once dirname(__DIR__).'/includes/crud.php';
require_role('admin');if(app_setting('ACADEMIC_WORKFLOWS')!=='1')not_found();
$isAdminBulk=true;$error='';
if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf();try{
        $action=input_choice($_POST,'action',['impor_preview','impor_commit']);
        if($action==='impor_preview'){
            input_choice($_POST,'module',array_keys(AK_MASTER_IMPORT_KEYS));
            ak_preview_import($_POST,$_FILES['berkas']??[]);
        }else{
            $module=$_SESSION['ak_import']['module']??'';
            if(!isset(AK_MASTER_IMPORT_KEYS[$module]))throw new InputError('Pilih unggahan master Admin yang sesuai.');
            $count=ak_commit_import($_POST);flash('success','Bulk upload berhasil: '.$count.' baris disimpan.');
            redirect('/admin/bulk_upload.php?'.http_build_query(['module'=>$module]));
        }
    }catch(Throwable $caught){$error=operation_error($caught);}
}
ak_begin('Bulk Upload Excel · Admin','bulk');
if($error!=='')echo '<div class="notice error" role="alert">'.e($error).'</div>';
try{require dirname(__DIR__).'/academic/views/transfer.php';}catch(InputError $caught){http_response_code(422);echo '<div class="notice error" role="alert">'.e($caught->getMessage()).'</div>';}
ak_end();
