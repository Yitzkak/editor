import React from 'react';

const ProductCard = ({ title, description, badge, icon }) => (
  <div className="group relative rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
    <div className="flex items-center justify-between">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
        {icon}
      </div>
      {badge ? (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {badge}
        </span>
      ) : null}
    </div>
    <h3 className="mt-6 text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    <div className="mt-6 inline-flex items-center text-sm font-semibold text-slate-900">
      Explore
      <svg className="ml-2 h-4 w-4 transition group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7.5 4.75a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L11.69 10 7.5 5.81a.75.75 0 0 1 0-1.06Z" />
      </svg>
    </div>
  </div>
);

const FeatureItem = ({ title, description }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
    <h4 className="text-base font-semibold text-slate-900">{title}</h4>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </div>
);

const HomePage = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%)]"></div>
        <div className="absolute right-10 top-20 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl"></div>
        <div className="absolute left-10 top-56 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9-9-4.03-9-9Z" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
              </svg>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Scriptorfi</p>
              <p className="text-lg font-semibold">Studio</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <span className="hover:text-white">Products</span>
            <span className="hover:text-white">Solutions</span>
            <span className="hover:text-white">Resources</span>
          </nav>
          <button
            onClick={onStart}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-white/20 transition hover:-translate-y-0.5"
          >
            Open Editor
          </button>
        </header>

        <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-10 px-6 py-16 md:flex-row md:items-center md:py-24">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
              Transcription & Editing Suite
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-5xl">
              A sleek workspace for fast, accurate audio transcription.
            </h1>
            <p className="mt-6 text-base text-white/70 md:text-lg">
              Scriptorfi Studio brings everything you need to polish interviews, podcasts, and research notes into one modern editor.
              Work faster with smart controls, clean output, and a focused, professional workflow.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={onStart}
                className="rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-400/40 transition hover:-translate-y-0.5"
              >
                Launch Editor
              </button>
              <button className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white">
                View Features
              </button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Secure local processing
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-300"></span>
                Designed for long-form audio
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-lg">
            <div className="absolute -left-6 top-6 hidden h-56 w-56 rounded-3xl border border-white/20 bg-white/10 backdrop-blur md:block"></div>
            <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live Session</p>
                  <p className="mt-2 text-2xl font-semibold">Interview Clean-up</p>
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70">
                  42 min
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {["Remove filler words", "Auto timestamp highlights", "Speaker swaps", "Export-ready formatting"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span className="text-sm text-white/80">{item}</span>
                    <span className="text-xs font-semibold text-sky-300">Done</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3">
                <div className="text-xs text-white/60">Waveform preview</div>
                <div className="h-2 w-24 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureItem
            title="Precision Editing"
            description="Navigate timestamps instantly, clean dialogue, and keep every speaker perfectly aligned."
          />
          <FeatureItem
            title="Audio Intelligence"
            description="Waveform insights, skip controls, and speed tuning keep you in flow without missing a beat."
          />
          <FeatureItem
            title="Ready for Publishing"
            description="Export clean transcripts, save versions, and maintain a professional production pipeline."
          />
        </div>
      </section>

      <section className="bg-slate-100 py-20 text-slate-900">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Products</p>
              <h2 className="mt-4 text-3xl font-semibold">Explore the Scriptorfi stack</h2>
              <p className="mt-4 max-w-xl text-sm text-slate-600">
                A suite of tools built for creators, journalists, and research teams. Keep everything aligned with your workflow.
              </p>
            </div>
            <button
              onClick={onStart}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              Try the Editor
            </button>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ProductCard
              title="Scriptorfi Editor"
              description="Your flagship transcript editor with smart shortcuts, cleanup tools, and export-ready formatting."
              badge="Core"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h10M4 18h7" />
                </svg>
              }
            />
            <ProductCard
              title="Audio Assist"
              description="Boost clarity and adjust playback speed while keeping every spoken word accessible."
              badge="Coming Soon"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 4v16" />
                  <path d="M7 9v6" />
                  <path d="M17 7v10" />
                </svg>
              }
            />
            <ProductCard
              title="Review Hub"
              description="Share transcripts with your team, capture feedback, and finalize approvals in one place."
              badge="Beta"
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16v10H4z" />
                  <path d="M8 7V5h8v2" />
                </svg>
              }
            />
            <ProductCard
              title="Insight Summaries"
              description="Generate concise summaries and action items directly from your edited transcripts."
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h10v12H4z" />
                  <path d="M14 10h6" />
                  <path d="M14 14h6" />
                </svg>
              }
            />
            <ProductCard
              title="Workflow Templates"
              description="Standardize how your team cleans and formats transcripts across projects."
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 7h10v10H7z" />
                  <path d="M4 4h4v4H4z" />
                  <path d="M16 16h4v4h-4z" />
                </svg>
              }
            />
            <ProductCard
              title="Team Library"
              description="Keep every transcript, export, and revision organized with shared storage."
              icon={
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 4h10v6H5z" />
                  <path d="M5 14h14v6H5z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-14 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row">
          <div>
            <p className="text-lg font-semibold text-white">Scriptorfi Studio</p>
            <p className="mt-2 text-sm">Modern transcription workflow for professionals.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="hover:text-white">Privacy</span>
            <span className="hover:text-white">Terms</span>
            <span className="hover:text-white">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
