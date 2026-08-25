import React, { useState, useEffect } from 'react';
import { AdCampaign } from '../types';
import { videoService } from '../services/videoService';

interface AdManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdManagementModal: React.FC<AdManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [brandName, setBrandName] = useState('');
  const [title, setTitle] = useState('');
  const [cpmRate, setCpmRate] = useState('$12.00');
  const [position, setPosition] = useState<'banner_top' | 'card_inline' | 'pre_roll'>('banner_top');
  const [targetUrl, setTargetUrl] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    videoService.fetchAdCampaigns().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setCampaigns(fetched);
      }
    });
  }, [isOpen]);

  const toggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, isActive: !c.isActive };
          videoService.saveAdCampaign(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !title) return;

    const newCampaign: AdCampaign = {
      id: `ad-${Date.now()}`,
      brandName,
      title,
      bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
      targetUrl: targetUrl || '#sponsor',
      cpmRate,
      impressions: 0,
      clicks: 0,
      isActive: true,
      position,
    };

    videoService.saveAdCampaign(newCampaign);
    setCampaigns([newCampaign, ...campaigns]);
    setBrandName('');
    setTitle('');
    setTargetUrl('');
    setShowNewForm(false);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#121113] w-full max-w-3xl rounded-2xl p-6 md:p-8 border border-zinc-200 dark:border-[#353437] my-8 relative shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-[#e5e1e4] transition-all">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-[#e5e1e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">campaign</span>
              Ad & Sponsorship Management
            </h2>
            <p className="text-xs text-zinc-600 dark:text-[#debec8] mt-0.5">
              Control video pre-rolls, inline banner campaigns, and CPM monetization settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-[#2a2a2c] dark:hover:bg-white/10 text-zinc-600 dark:text-[#debec8] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Analytics Summary Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-[#1e1d21] border border-zinc-200 dark:border-[#353437] text-center">
            <span className="text-xs text-zinc-600 dark:text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Total Impressions
            </span>
            <span className="text-xl font-extrabold text-zinc-900 dark:text-white">
              {campaigns.reduce((acc, c) => acc + c.impressions, 0).toLocaleString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-[#1e1d21] border border-zinc-200 dark:border-[#353437] text-center">
            <span className="text-xs text-zinc-600 dark:text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Total Clicks
            </span>
            <span className="text-xl font-extrabold text-[#ec4899]">
              {campaigns.reduce((acc, c) => acc + c.clicks, 0).toLocaleString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-[#1e1d21] border border-zinc-200 dark:border-[#353437] text-center">
            <span className="text-xs text-zinc-600 dark:text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Avg. CTR
            </span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-[#eab308]">
              {(() => {
                const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
                const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
                return totalImpressions > 0
                  ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%'
                  : '0.00%';
              })()}
            </span>
          </div>
        </div>

        {/* Toggle New Campaign Form */}
        {!showNewForm ? (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full py-3 mb-6 rounded-xl border border-dashed border-amber-500 hover:bg-amber-500/10 text-amber-700 dark:text-[#eab308] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Launch New Ad Campaign</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateCampaign}
            className="mb-6 p-5 bg-zinc-50 dark:bg-[#18181b] rounded-xl border border-amber-500/40 space-y-4"
          >
            <h3 className="text-sm font-bold text-amber-700 dark:text-[#eab308] uppercase tracking-wider flex items-center justify-between">
              <span>New Sponsorship Details</span>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="text-xs text-zinc-500 dark:text-[#debec8] hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-[#debec8] uppercase mb-1">
                  Brand / Advertiser Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. FapnXX Luxe Cosmetics"
                  className="w-full bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg p-2.5 text-xs text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-[#debec8] uppercase mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exclusive Midnight Collection"
                  className="w-full bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg p-2.5 text-xs text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-[#debec8] uppercase mb-1">
                  Ad Placement Position
                </label>
                <select
                  value={position}
                  onChange={(e) =>
                    setPosition(e.target.value as 'banner_top' | 'card_inline' | 'pre_roll')
                  }
                  className="w-full bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg p-2.5 text-xs text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-amber-500"
                >
                  <option value="banner_top">Top Showcase Banner</option>
                  <option value="card_inline">Inline Video Grid Card</option>
                  <option value="pre_roll">Video Pre-Roll Sponsor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-[#debec8] uppercase mb-1">
                  Target Destination URL
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://sponsorbrand.com/promo"
                  className="w-full bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg p-2.5 text-xs text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-amber-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-amber-600 transition-all cursor-pointer"
            >
              Activate Campaign
            </button>
          </form>
        )}

        {/* Campaign List */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          <h3 className="text-xs font-bold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider">
            Active Sponsorship Campaigns ({campaigns.length})
          </h3>

          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                c.isActive
                  ? 'bg-zinc-50 dark:bg-[#1a1a1c] border-zinc-200 dark:border-[#353437]'
                  : 'bg-zinc-100 dark:bg-[#141415]/50 border-zinc-200 dark:border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-600 dark:text-[#eab308] uppercase">
                      {c.brandName}
                    </span>
                    <span className="text-[10px] bg-zinc-200 dark:bg-[#2a2a2c] text-zinc-700 dark:text-[#debec8] px-2 py-0.5 rounded uppercase">
                      {c.position.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{c.title}</h4>
                  <div className="flex gap-3 text-[11px] text-zinc-500 dark:text-[#debec8] mt-1">
                    <span>{c.impressions.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{c.clicks.toLocaleString()} clicks</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-[#eab308] font-bold">{c.cpmRate} CPM</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleCampaign(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                  c.isActive
                    ? 'bg-zinc-200 hover:bg-zinc-300 dark:bg-[#353437] text-zinc-800 dark:text-white hover:text-rose-600'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {c.isActive ? 'Pause' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
