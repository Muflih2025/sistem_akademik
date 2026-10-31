<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/config/academic/export.php';
require_login();if(app_setting('ACADEMIC_WORKFLOWS')!=='1')not_found();
try {
    $kind=input_choice($_GET,'kind',['jurnal','agenda','harian','sesi','kalender','nilai','rapor','template']);
    $format=input_choice($_GET,'format',['csv','xlsx','pdf','print']);
    $data=ak_export_data($kind,$_GET);
    if($format==='print') {header('Content-Type: text/html; charset=utf-8');echo ak_export_html($data);exit;}
    if($format==='xlsx')$output=ak_xlsx($data);
    elseif($format==='pdf')$output=ak_pdf($data);
    else {
        $stream=fopen('php://temp','r+');fwrite($stream,"\xEF\xBB\xBF");
        foreach([$data['headers'],...$data['rows']] as $row)fputcsv($stream,array_map('csv_safe',$row),',','"','');
        rewind($stream);$output=stream_get_contents($stream);fclose($stream);
    }
    header('Cache-Control: no-store, private');
    header('Content-Type: '.['csv'=>'text/csv; charset=utf-8','xlsx'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','pdf'=>'application/pdf'][$format]);
    header('Content-Disposition: attachment; filename="sia-'.$kind.'-'.date('Ymd').'.'.$format.'"');
    header('Content-Length: '.strlen($output));
    echo $output;
} catch(Throwable $error) {echo e(operation_error($error));}
