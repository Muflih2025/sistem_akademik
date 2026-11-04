import { portalRedirect } from '@/lib/portal';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return portalRedirect('rapor', await searchParams); }
