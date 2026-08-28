import React, { useState } from 'react';

const CURRENT_YEAR = new Date().getFullYear();
const SITE_NAME = 'FapnXX';
const SITE_DOMAIN = 'fapnxx.com';

const LEGAL_LINKS = [
  { label: 'Privacy Policy', key: 'privacy' },
  { label: 'Terms of Service', key: 'terms' },
  { label: 'DMCA', key: 'dmca' },
  { label: '2257 Statement', key: '2257' },
  { label: 'Cookie Policy', key: 'cookies' },
  { label: 'Content Removal', key: 'removal' },
];

const MODAL_CONTENT: Record<string, { title: string; body: string }> = {
  privacy: {
    title: 'Privacy Policy',
    body: `Last updated: January 1, ${new Date().getFullYear()}

FapnXX is committed to protecting your privacy. We collect information you provide directly (account info) and automatically (IP, cookies, device info) to provide and improve our services.

COOKIES: We use cookies for site functionality and advertising. You may control cookies via browser settings.

THIRD-PARTY ADS: Our advertising partners may use cookies to serve personalized ads.

Contact: privacy@fapnxx.com`,
  },
  terms: {
    title: 'Terms of Service',
    body: `Effective Date: January 1, ${new Date().getFullYear()}

By accessing FapnXX, you confirm you are at least 18 years of age (or the legal age of majority in your jurisdiction) and agree to these Terms.

ACCEPTABLE USE: You agree not to upload or share content that is illegal, non-consensual, or depicts minors. Violations result in immediate termination and legal action.

CONTENT OWNERSHIP: User-submitted content remains property of the uploader. By uploading, you grant FapnXX a non-exclusive, royalty-free license to display such content.

DISCLAIMER: The service is provided "as is" without warranties of any kind.`,
  },
  dmca: {
    title: 'DMCA — Copyright Takedown Policy',
    body: `FapnXX respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA).

To file a DMCA notice, send a written notice containing:
• Identification of the copyrighted work claimed infringed
• URL(s) of the allegedly infringing content
• Your contact information (name, address, email, phone)
• A statement of good faith belief that use is not authorized
• A statement that information is accurate, under penalty of perjury
• Your physical or electronic signature

Send DMCA Notices to: dmca@fapnxx.com

Repeat infringers will have their accounts terminated.`,
  },
  '2257': {
    title: '18 U.S.C. § 2257 Compliance Statement',
    body: `FapnXX is a platform for user-generated content. We are not the primary or secondary producer of any visual content appearing on this website as defined by 18 U.S.C. § 2257.

All persons who appear in any visual depiction of actual or simulated sexually explicit conduct on this website were 18 years of age or older at the time of the creation of such depictions.

All records required to be maintained pursuant to 18 U.S.C. § 2257 are kept by the respective content producers and providers.

Custodian of Records:
FapnXX Legal Department
Email: legal@fapnxx.com`,
  },
  cookies: {
    title: 'Cookie Policy',
    body: `We use cookies to enhance your browsing experience, serve personalized content and ads, and analyze site traffic.

TYPES OF COOKIES:
• Essential: Required for core site functionality (age verification, sessions)
• Analytics: Help us understand how visitors use the site (anonymized)
• Advertising: Used by ad partners to serve relevant advertisements
• Preferences: Remember your settings

You can manage cookie preferences through your browser settings. Disabling certain cookies may affect site functionality.`,
  },
  removal: {
    title: 'Content Removal Request',
    body: `We take content removal requests seriously. If you appear in a video on our site and want it removed, or if you believe content is illegal or non-consensual, submit a removal request.

HOW TO SUBMIT:
• Email us with the exact URL(s) of the content
• Describe why the content should be removed
• Include your contact information
• Proof of identity may be required

We aim to process all legitimate removal requests within 72 hours.

Email: removal@fapnxx.com`,
  },
};

export const SiteFooter: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const modal = activeModal ? MODAL_CONTENT[activeModal] : null;

  return (
    <>
      <footer className="w-full bg-[#0a0a0d] border-t border-white/[0.06] mt-auto">
        {/* 18+ Warning Banner */}
        <div className="w-full bg-rose-950/40 border-b border-rose-900/30 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-center">
            <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-md tracking-widest uppercase shadow">
              🔞 18+
            </span>
            <p className="text-zinc-400 text-[10px] sm:text-xs leading-snug">
              This website contains adult content intended only for persons aged 18 or older. By continuing to use this site, you confirm you meet the legal age requirement in your jurisdiction.
            </p>
          </div>
        </div>

        {/* Main Footer Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

            {/* Brand Column */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white">Fapn<span className="text-rose-500">XX</span></span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                The best free adult video platform. Stream HD videos across all your devices. All performers are 18+.
              </p>
              {/* RTA Label */}
              <div className="flex items-center gap-2">
                <a href="https://www.rtalabel.org/" target="_blank" rel="noopener noreferrer" title="Restricted to Adults" className="opacity-80 hover:opacity-100 transition-opacity">
                  <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] font-mono font-bold text-zinc-300 tracking-widest">RTA</div>
                </a>
                <span className="text-zinc-600 text-[10px]">Restricted to Adults</span>
              </div>
              {/* DMCA Badge */}
              <button
                type="button"
                onClick={() => setActiveModal('dmca')}
                className="inline-flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 hover:bg-zinc-700/60 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-rose-400 text-base">verified_user</span>
                <span className="text-[10px] font-bold text-zinc-300">DMCA PROTECTED</span>
              </button>
            </div>

            {/* Legal Links */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.key}>
                    <button
                      type="button"
                      onClick={() => setActiveModal(link.key)}
                      className="text-zinc-500 hover:text-rose-400 text-xs transition-colors text-left cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Company</h4>
              <ul className="space-y-2 text-xs text-zinc-500">
                {[
                  { label: 'About Us', href: `mailto:hello@${SITE_DOMAIN}` },
                  { label: 'Contact', href: `mailto:contact@${SITE_DOMAIN}` },
                  { label: 'Advertise', href: `mailto:ads@${SITE_DOMAIN}` },
                  { label: 'Report Abuse', href: `mailto:abuse@${SITE_DOMAIN}` },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="hover:text-rose-400 transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-widest">Safety</h4>
              <ul className="space-y-2 text-xs text-zinc-500">
                <li>
                  <button type="button" onClick={() => setActiveModal('removal')} className="hover:text-rose-400 transition-colors cursor-pointer text-left">
                    Remove My Content
                  </button>
                </li>
                <li><a href={`mailto:abuse@${SITE_DOMAIN}`} className="hover:text-rose-400 transition-colors">Report Abuse</a></li>
                <li>
                  <button type="button" onClick={() => setActiveModal('dmca')} className="hover:text-rose-400 transition-colors cursor-pointer text-left">
                    Copyright (DMCA)
                  </button>
                </li>
                <li><a href="https://www.missingkids.org/gethelpnow/cybertipline" target="_blank" rel="noopener noreferrer" className="hover:text-rose-400 transition-colors">Report CSAM</a></li>
              </ul>
              <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-1.5">
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  <strong className="text-zinc-500">Parental Controls:</strong> Use filtering software to block adult content.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['CyberSitter', 'NetNanny', 'K9'].map((tool) => (
                    <span key={tool} className="text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-500 px-2 py-0.5 rounded">{tool}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/[0.06] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-[10px] text-center sm:text-left">
              © {CURRENT_YEAR} {SITE_NAME} · All rights reserved · {SITE_DOMAIN}
            </p>
            <p className="text-zinc-700 text-[10px] text-center sm:text-right max-w-md leading-relaxed">
              All models appearing on this website are 18 years or older. {SITE_NAME} has a zero-tolerance policy against illegal pornography.
            </p>
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      {activeModal && modal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[#111114] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-white font-extrabold text-base">{modal.title}</h2>
              <button type="button" onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 overscroll-contain">
              <pre className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">{modal.body}</pre>
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex-shrink-0">
              <button type="button" onClick={() => setActiveModal(null)} className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-sm py-2.5 rounded-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
