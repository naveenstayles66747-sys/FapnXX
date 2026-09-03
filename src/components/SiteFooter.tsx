import React, { useState } from "react";

const YEAR = new Date().getFullYear();
const DOMAIN = "fapxx.com";

const MODALS: Record<string, { title: string; body: string }> = {
  privacy: { title: "Privacy Policy", body: "FapXX is committed to protecting your privacy. We collect information you provide directly and automatically to improve our services. Contact: privacy@fapxx.com" },
  terms: { title: "Terms of Service", body: "By accessing FapXX, you confirm you are at least 18 years of age. You agree not to upload or share illegal, non-consensual, or minor-depicting content. Violations result in immediate termination." },
  dmca: { title: "DMCA Copyright Takedown", body: "FapXX complies with the DMCA. To file a takedown, email dmca@fapxx.com with: (1) description of copyrighted work, (2) URL of infringing content, (3) your contact info, (4) good faith statement, (5) your signature." },
  usc2257: { title: "18 U.S.C. Section 2257 Statement", body: "FapXX is not the primary or secondary producer of any content on this website. All persons depicted were 18 or older at time of creation. Records maintained by content producers. Contact: legal@fapxx.com" },
  cookies: { title: "Cookie Policy", body: "We use cookies for site functionality, analytics, and advertising. Types: Essential (login), Analytics (anonymized), Advertising (relevant ads), Preferences. Manage cookies via your browser settings." },
  removal: { title: "Content Removal Request", body: "If you appear in a video and want it removed, email removal@fapxx.com with the URL, reason, and your contact info. We process legitimate requests within 72 hours." },
};

const LEGAL_LINKS = [
  { label: "Privacy Policy", key: "privacy" },
  { label: "Terms of Service", key: "terms" },
  { label: "DMCA", key: "dmca" },
  { label: "2257 Statement", key: "usc2257" },
  { label: "Cookie Policy", key: "cookies" },
  { label: "Content Removal", key: "removal" },
];

export const SiteFooter: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const data = modal ? MODALS[modal] : null;

  return (
    <>
      <footer className="w-full lg:pl-64 bg-[#0a0a0d] border-t border-white/[0.06] mt-auto transition-all">
        <div className="w-full bg-rose-950/40 border-b border-rose-900/30 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-center">
            <span className="inline-flex items-center bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-widest uppercase">18+</span>
            <p className="text-zinc-400 text-[10px] sm:text-xs">This website contains adult content for persons aged 18 or older only.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-2 lg:col-span-1 space-y-4">
              <div
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  window.dispatchEvent(new CustomEvent('fapn-reset-home'));
                }}
                className="flex items-center select-none cursor-pointer active:scale-95 transition-transform"
                title="Go to Homepage"
              >
                <h2 className="text-2xl font-black tracking-tight whitespace-nowrap">
                  <span className="text-[#e0358d] drop-shadow-[0_0_12px_rgba(224,53,141,0.6)] font-black">Fap</span>
                  <span className="header-brand-nxx font-black">XX</span>
                </h2>
              </div>
              <p className="text-zinc-500 text-xs">Free adult video platform. All performers are 18+.</p>
              <div className="flex items-center gap-2">
                <a href="https://www.rtalabel.org/" target="_blank" rel="noopener noreferrer" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] font-mono font-bold text-zinc-300">RTA</a>
                <span className="text-zinc-600 text-[10px]">Restricted to Adults</span>
              </div>
              <button type="button" onClick={() => setModal("dmca")} className="inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 hover:bg-zinc-700 transition-colors">
                <span className="text-rose-400 text-xs font-bold">DMCA</span>
                <span className="text-[10px] font-bold text-zinc-300">PROTECTED</span>
              </button>
            </div>
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.key}>
                    <button type="button" onClick={() => setModal(link.key)} className="text-zinc-400 hover:text-[#e0358d] text-xs transition-colors text-left">{link.label}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Company</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><a href={"mailto:hello@" + DOMAIN} className="hover:text-[#e0358d]">About Us</a></li>
                <li><a href={"mailto:contact@" + DOMAIN} className="hover:text-[#e0358d]">Contact</a></li>
                <li><a href={"mailto:ads@" + DOMAIN} className="hover:text-[#e0358d]">Advertise</a></li>
                <li><a href={"mailto:abuse@" + DOMAIN} className="hover:text-[#e0358d]">Report Abuse</a></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Safety</h4>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li><button type="button" onClick={() => setModal("removal")} className="hover:text-[#e0358d] text-left">Remove My Content</button></li>
                <li><a href={"mailto:abuse@" + DOMAIN} className="hover:text-[#e0358d]">Report Abuse</a></li>
                <li><button type="button" onClick={() => setModal("dmca")} className="hover:text-[#e0358d] text-left">Copyright DMCA</button></li>
                <li><a href="https://www.missingkids.org/gethelpnow/cybertipline" target="_blank" rel="noopener noreferrer" className="hover:text-[#e0358d]">Report CSAM</a></li>
              </ul>
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <p className="text-[10px] text-zinc-600 mb-1">Parental Controls:</p>
                <div className="flex flex-wrap gap-1">
                  {["CyberSitter", "NetNanny", "K9"].map((t) => (<span key={t} className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-zinc-600 text-[10px]">{"Copyright " + YEAR + " FapXX. All rights reserved."}</p>
            <p className="text-zinc-700 text-[10px] text-right max-w-sm">All models are 18+. Zero-tolerance policy against illegal content.</p>
          </div>
        </div>
      </footer>
      {modal !== null && data !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setModal(null)}>
          <div className="bg-[#111114] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-bold text-sm">{data.title}</h2>
              <button type="button" onClick={() => setModal(null)} className="text-zinc-400 hover:text-white w-7 h-7 flex items-center justify-center font-bold rounded-full hover:bg-white/10">X</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">{data.body}</p>
            </div>
            <div className="px-5 py-3 border-t border-white/10">
              <button type="button" onClick={() => setModal(null)} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-2.5 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};