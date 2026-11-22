'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

function JoinProjectByLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  const { joinProject } = useProjects();

  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!code || code.length !== 6) {
      setErrorMsg('Invalid or missing 6-character invite code.');
      setStatus('error');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const joined = await joinProject(code);
        if (!mounted) return;
        setStatus('success');
        router.replace(`/projects/${joined._id}`);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(err?.message || 'Unable to join this project.');
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [code, joinProject, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md bg-white dark:bg-[#10141e]/75 rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] p-8 text-center space-y-4 shadow-xl">
        {status === 'joining' && (
          <>
            <Loader2 className="w-9 h-9 animate-spin text-emerald-500 mx-auto" />
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Joining project…</h1>
            <p className="text-xs text-zinc-500 font-mono">Code: {code}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Joined! Redirecting…</h1>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Could not join project</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{errorMsg}</p>
            <div className="pt-2">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Projects</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinProjectLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <JoinProjectByLinkContent />
    </Suspense>
  );
}
