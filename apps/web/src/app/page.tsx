import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import {
  ArrowRight,
  CheckCircle2,
  Columns3,
  FolderKanban,
  KeyRound,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const FEATURES = [
  {
    icon: Columns3,
    title: 'Custom Kanban & List Views',
    description:
      'Build custom board columns, drag tasks smoothly across stages, track subtasks, and discuss details in slide-over drawers.',
    accent: 'bg-[#e6f7f1] text-[#006c52] dark:bg-[#66deb4]/15 dark:text-[#66deb4]',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Channels & DMs',
    description:
      'Instant Socket.io project channels and 1:1 direct messages with rich inline markdown, live typing indicators, reactions, and unread badges.',
    accent: 'bg-[#F0FF7C] text-[#191c1d] dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]',
  },
  {
    icon: KeyRound,
    title: '6-Character Join Codes',
    description:
      'Spin up a workspace and onboard teammates in seconds using secure, regeneratable 6-character codes with Admin, Moderator, and Member roles.',
    accent: 'bg-[#eef6ff] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    icon: Paperclip,
    title: 'Ephemeral 24h File Sharing',
    description:
      'Drop images and documents up to 25 MB directly into chats with live expiry countdowns and automatic 24-hour cleanup.',
    accent: 'bg-[#e6f7f1] text-[#006c52] dark:bg-[#66deb4]/15 dark:text-[#66deb4]',
  },
  {
    icon: FolderKanban,
    title: 'Personal Dashboard & Velocity',
    description:
      'Stay ahead of deadlines with Upcoming, Overdue, and Completed views, private personal tasks, and weekly completion analytics.',
    accent: 'bg-[#F0FF7C] text-[#191c1d] dark:bg-[#F0FF7C]/15 dark:text-[#F0FF7C]',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Security',
    description:
      'Protected by Clerk authentication, JWT-verified WebSockets, Redis-backed presence, and strict project membership boundaries.',
    accent: 'bg-[#e7e8e9] text-[#191c1d] dark:bg-white/[0.08] dark:text-zinc-200',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Create your account',
    desc: 'Sign up in seconds with email or OAuth and unlock your personal Synca workspace.',
  },
  {
    num: '02',
    title: 'Launch or join a project',
    desc: 'Create a new project board or enter a teammate’s 6-character join code to jump straight in.',
  },
  {
    num: '03',
    title: 'Ship together in real time',
    desc: 'Move Kanban cards, share files, and message your team—every update syncs live across screens.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f3f3f3] dark:bg-[#000000] text-[#191c1d] dark:text-zinc-100 flex flex-col">
      {/* ─── Sticky Glass Navbar ─── */}
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb]/80 dark:border-white/[0.08] bg-[#f3f3f3]/85 dark:bg-[#000000]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-[11px] bg-gradient-to-br from-[#006c52] to-[#66deb4] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-['Funnel_Display'] text-[22px] font-semibold tracking-tight text-[#191c1d] dark:text-white">
              Synca
            </span>
          </Link>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-[#3e4944] dark:text-zinc-400">
            <a href="#features" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              How it Works
            </a>
            <a href="#preview" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              Workspace
            </a>
          </nav>

          {/* Right Auth & Theme */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <SignedOut>
              <Link
                href="/sign-in"
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-[#191c1d] dark:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[13px] font-semibold shadow-sm transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[13px] font-semibold shadow-sm transition-colors"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111316] border border-[#bdc9c2] dark:border-white/[0.12] text-[12px] font-medium text-[#006c52] dark:text-[#66deb4] shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unified Collaborative Workspace for Modern Teams</span>
            </div>

            <h1 className="font-['Funnel_Display'] text-[40px] sm:text-[56px] leading-[1.08] tracking-tight font-medium text-[#191c1d] dark:text-white">
              Plan projects, ship tasks, and chat{' '}
              <span className="bg-gradient-to-r from-[#006c52] via-[#179d78] to-[#66deb4] bg-clip-text text-transparent">
                in real time.
              </span>
            </h1>

            <p className="text-[15.5px] sm:text-[17px] leading-relaxed text-[#3e4944] dark:text-zinc-400 max-w-2xl mx-auto">
              Synca brings Kanban boards, team channels, direct messages, and ephemeral file sharing into one fast, distraction-free workspace—no more juggling five different tabs.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[14.5px] font-semibold shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-[#111316] border border-[#bdc9c2] dark:border-white/[0.14] hover:border-[#006c52] dark:hover:border-[#66deb4] text-[#191c1d] dark:text-zinc-100 text-[14.5px] font-semibold transition-colors"
                >
                  <span>Sign In to Workspace</span>
                </Link>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[14.5px] font-semibold shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-[#111316] border border-[#bdc9c2] dark:border-white/[0.14] hover:border-[#006c52] dark:hover:border-[#66deb4] text-[#191c1d] dark:text-zinc-100 text-[14.5px] font-semibold transition-colors"
                >
                  <span>View Projects</span>
                </Link>
              </SignedIn>
            </div>

            {/* Trust / Quick highlights */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-3 text-[12.5px] text-[#3e4944] dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                Real-time Socket.io sync
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                Instant 6-char project invites
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
                Light &amp; Dark mode built in
              </span>
            </div>
          </div>

          {/* ─── Live Workspace Visual Preview ─── */}
          <div
            id="preview"
            className="mt-14 rounded-[24px] p-3 sm:p-4 bg-white dark:bg-[#111316] border border-[#e5e7eb] dark:border-white/[0.08] shadow-2xl shadow-black/[0.06] dark:shadow-black/50"
          >
            <div className="rounded-[18px] bg-[#f3f3f3] dark:bg-[#0a0b0d] p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Mock Obsidian Sidebar */}
              <div className="lg:col-span-3 rounded-[16px] bg-[#17181c] dark:bg-[#111316] p-4 text-white flex flex-col justify-between gap-4 border border-white/[0.06]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-gradient-to-tr from-[#006c52] to-[#66deb4] flex items-center justify-center text-xs font-bold">
                      S
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">Synca Workspace</p>
                      <p className="text-[10.5px] text-white/50">Active Sprint</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="px-3 py-2 rounded-[8px] bg-white/[0.1] text-[12px] font-medium flex items-center justify-between">
                      <span>Dashboard</span>
                      <span className="size-1.5 rounded-full bg-[#66deb4]" />
                    </div>
                    <div className="px-3 py-2 rounded-[8px] text-[12px] text-white/70 flex items-center justify-between">
                      <span>All Projects</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08]">4</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 px-1">
                      Direct Messages
                    </p>
                    {[
                      { name: 'Ayesha K.', status: 'online', unread: 2 },
                      { name: 'Bilal R.', status: 'online', unread: 0 },
                      { name: 'Sara M.', status: 'offline', unread: 0 },
                    ].map((member) => (
                      <div key={member.name} className="flex items-center justify-between px-1.5 py-1 text-[12px] text-white/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              member.status === 'online' ? 'bg-[#66deb4]' : 'bg-zinc-600'
                            }`}
                          />
                          <span>{member.name}</span>
                        </div>
                        {member.unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#66deb4] text-[#111316] text-[10px] font-bold">
                            {member.unread}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2 rounded-[8px] bg-[#66deb4]/15 border border-[#66deb4]/30 text-[#66deb4] text-[11px] font-semibold flex items-center justify-between">
                  <span>Join Code</span>
                  <span className="font-mono tracking-wider">SY94KX</span>
                </div>
              </div>

              {/* Mock Main Content Area */}
              <div className="lg:col-span-9 flex flex-col gap-3.5">
                {/* KPI Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[14px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-3.5">
                    <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Completion Rate</p>
                    <p className="font-['Funnel_Display'] text-[22px] font-semibold text-[#006c52] dark:text-[#66deb4] mt-0.5">
                      86.4%
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-3.5">
                    <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Active Projects</p>
                    <p className="font-['Funnel_Display'] text-[22px] font-semibold text-[#191c1d] dark:text-white mt-0.5">
                      4
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-3.5">
                    <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Live Online</p>
                    <p className="font-['Funnel_Display'] text-[22px] font-semibold text-[#191c1d] dark:text-white mt-0.5 flex items-center gap-1.5">
                      <span>5</span>
                      <Users className="w-4 h-4 text-[#006c52] dark:text-[#66deb4]" />
                    </p>
                  </div>
                </div>

                {/* Kanban + Live Chat Split */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 flex-1">
                  {/* Mini Kanban */}
                  <div className="md:col-span-3 rounded-[16px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-['Funnel_Display'] text-[14px] font-medium">
                        Sprint Board
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#e6f7f1] dark:bg-[#66deb4]/15 text-[#006c52] dark:text-[#66deb4] font-semibold">
                        Live Sync
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-[12px] bg-[#F0FF7C]/60 dark:bg-[#F0FF7C]/10 border border-[#ddec6b] dark:border-[#F0FF7C]/20">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-[#191c1d] dark:text-white">
                            Finalize Realtime Socket Presence
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#191c1d] text-white font-semibold">
                            In Progress
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3e4944] dark:text-zinc-400 mt-1">
                          3/4 subtasks completed · Due Tomorrow
                        </p>
                      </div>
                      <div className="p-3 rounded-[12px] bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-[#191c1d] dark:text-zinc-100">
                            Design System Dark Mode Polish
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6f7f1] dark:bg-[#66deb4]/15 text-[#006c52] dark:text-[#66deb4] font-semibold">
                            Done
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3e4944] dark:text-zinc-400 mt-1">
                          5/5 subtasks completed · Shipped
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mini Chat */}
                  <div className="md:col-span-2 rounded-[16px] bg-white dark:bg-[#15171b] border border-[#e5e7eb] dark:border-white/[0.08] p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-['Funnel_Display'] text-[14px] font-medium">
                        #general
                      </span>
                      <span className="text-[10.5px] text-[#006c52] dark:text-[#66deb4] font-medium">
                        Ayesha is typing...
                      </span>
                    </div>
                    <div className="space-y-2 text-[11.5px]">
                      <div className="p-2.5 rounded-[12px] rounded-tl-sm bg-[#f1f3f4] dark:bg-white/[0.06] text-[#191c1d] dark:text-zinc-200">
                        Uploaded the final sprint specs! Ready for review.
                      </div>
                      <div className="p-2.5 rounded-[12px] rounded-tr-sm bg-[#006c52] text-white ml-6">
                        Looks great — moving the card to Done now 🚀
                      </div>
                    </div>
                    <div className="h-8 rounded-full bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#e5e7eb] dark:border-white/[0.08] px-3 flex items-center text-[11px] text-[#3e4944]/60 dark:text-zinc-500">
                      Message #general...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#006c52] dark:text-[#66deb4]">
              Built for Velocity
            </p>
            <h2 className="font-['Funnel_Display'] text-[30px] sm:text-[38px] font-medium tracking-tight text-[#191c1d] dark:text-white">
              Everything your team needs, nothing it doesn&apos;t
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-[20px] bg-white dark:bg-[#111316] border border-[#e5e7eb] dark:border-white/[0.08] p-6 space-y-3.5 hover:border-[#006c52]/40 dark:hover:border-[#66deb4]/40 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                >
                  <div className={`size-11 rounded-[12px] flex items-center justify-center ${feat.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-['Funnel_Display'] text-[18px] font-medium text-[#191c1d] dark:text-white">
                    {feat.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-[#3e4944] dark:text-zinc-400">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
          <div className="rounded-[24px] bg-white dark:bg-[#111316] border border-[#e5e7eb] dark:border-white/[0.08] p-8 sm:p-12">
            <div className="max-w-xl mb-10 space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#006c52] dark:text-[#66deb4]">
                Get Started in 60 Seconds
              </p>
              <h2 className="font-['Funnel_Display'] text-[28px] sm:text-[34px] font-medium text-[#191c1d] dark:text-white">
                From signup to live collaboration in three steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  className="rounded-[16px] bg-[#f8f9fa] dark:bg-white/[0.03] border border-[#e5e7eb] dark:border-white/[0.07] p-6 space-y-3"
                >
                  <span className="inline-block font-['Funnel_Display'] text-[13px] font-semibold px-2.5 py-1 rounded-full bg-[#e6f7f1] dark:bg-[#66deb4]/15 text-[#006c52] dark:text-[#66deb4]">
                    Step {step.num}
                  </span>
                  <h3 className="font-['Funnel_Display'] text-[18px] font-medium text-[#191c1d] dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-[#3e4944] dark:text-zinc-400">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA Banner ─── */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-6 pb-20">
          <div className="rounded-[24px] bg-[#17181c] dark:bg-[#111316] border border-white/[0.08] p-8 sm:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-[#66deb4]/15 blur-3xl rounded-full pointer-events-none" />
            <div className="relative z-10 max-w-xl mx-auto space-y-5">
              <h2 className="font-['Funnel_Display'] text-[30px] sm:text-[38px] font-medium leading-tight">
                Ready to bring your team into sync?
              </h2>
              <p className="text-[14.5px] text-white/70">
                Create your free Synca account or sign in to pick up right where your team left off.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <SignedOut>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[14px] font-semibold transition-colors"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white text-[14px] font-semibold transition-colors"
                  >
                    <span>Sign In</span>
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#66deb4] hover:bg-[#52d1a4] text-[#111316] text-[14px] font-semibold transition-colors"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#e5e7eb] dark:border-white/[0.08] py-7">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#3e4944] dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#006c52] dark:text-[#66deb4]" />
            <span className="font-['Funnel_Display'] font-medium text-[#191c1d] dark:text-zinc-300">
              Synca
            </span>
            <span>— Collaborative Workspace Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/sign-in" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              Sign Up
            </Link>
            <Link href="/dashboard" className="hover:text-[#006c52] dark:hover:text-[#66deb4] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
