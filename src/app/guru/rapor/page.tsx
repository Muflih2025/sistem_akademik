import GradeBook from '@/components/academic/GradeBook';
import ReportBoard from '@/components/modules/ReportBoard';
export default function Page() { return process.env.HOMEROOM_MODE === 'required' ? <ReportBoard /> : <GradeBook readOnly />; }
