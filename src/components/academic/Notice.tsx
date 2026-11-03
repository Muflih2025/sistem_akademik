import { CheckCircle, XCircle } from 'lucide-react';
export default function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <div role={error ? 'alert' : 'status'} data-status={error ? 'error' : 'success'} className={`p-4 border rounded-xl flex items-start gap-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-300 bg-white text-black'}`}>
    {error ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}<span>{error || success}</span>
  </div>;
}
