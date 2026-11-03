<?php
declare(strict_types=1);
// Pure date-boundary regression; no database connection or writes.
require_once dirname(__DIR__).'/config/academic/attendance.php';
$period=['mulai'=>'2026-07-01','selesai'=>'2026-12-31'];
$schedule=['hari'=>'Senin','berlaku_mulai'=>'2026-10-26','berlaku_selesai'=>'2026-10-30'];
$cases=[
    ['expired_assignment',$schedule,$period,'2026-11-03','2026-10-26'],
    ['current_week',$schedule,$period,'2026-10-28','2026-10-26'],
    ['exact_day',$schedule,$period,'2026-10-26','2026-10-26'],
    ['future_assignment',$schedule,$period,'2026-10-25',null],
    ['no_matching_weekday',array_replace($schedule,['berlaku_mulai'=>'2026-10-27']),$period,'2026-11-03',null],
    ['period_end_clamps_assignment',array_replace($schedule,['berlaku_selesai'=>'2026-12-31']),array_replace($period,['selesai'=>'2026-10-30']),'2026-11-03','2026-10-26'],
    ['period_start_excludes_weekday',$schedule,array_replace($period,['mulai'=>'2026-10-27']),'2026-11-03',null],
    ['friday_boundary',array_replace($schedule,['hari'=>'Jumat']),$period,'2026-11-03','2026-10-30'],
    ['never_future_date',array_replace($schedule,['hari'=>'Jumat']),$period,'2026-10-29',null],
];
$failed=0;
foreach($cases as [$name,$s,$p,$today,$expected]){
    $actual=ak_default_schedule_date($s,$p,$today);
    $pass=$actual===$expected;
    echo ($pass?'PASS ':'FAIL ').$name.PHP_EOL;
    if(!$pass)$failed++;
}
exit($failed?1:0);
