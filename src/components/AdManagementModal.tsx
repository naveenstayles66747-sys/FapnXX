import React, { useState, useEffect } from 'react';
import { AdCampaign } from '../types';
import { videoService } from '../services/videoService';

interface AdManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'ad-1',
    brandName: 'FapnXX VIP Pass',
    title: 'Unlock Unlimited 4K Streaming & Original Content',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    targetUrl: '#vip-upgrade',
    cpmRate: '$14.50',
    impressions: 142500,
    clicks: 8420,
    isActive: true,
    position: 'banner_top',
  },
  {
    id: 'ad-2',
    brandName: 'Luxury Silk Apparel',
    title: 'Exclusive Midnight Collection - 25% Off VIPs',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvu8sGdltZki91ehu4_TciVh4ojFc2rkzEbjdpwT0f5CLnFmvQzwYrEOQxEFJ_5nuaxrYR5ciK2iYmRsy2xBkg_ftrLdEVMKzs0Mo7wZJj8dGjATtrpcrXvwKvJX9cojHQ3HXSmrDB9oyFdG_EbNoZ_IyKVxNxSzjWcNqxV9DZCb9emwKm10HSw50UmQCf-2beum05L1bV6fTQBVtTvEbXbkY0kh99hiKCxl2v-kLPTgTtkEfqFhfeYQ',
    targetUrl: '#silk-collection',
    cpmRate: '$18.00',
    impressions: 89100,
    clicks: 5310,
    isActive: true,
    position: 'card_inline',
  },
];

export const AdManagementModal: React.FC<AdManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(INITIAL_CAMPAIGNS);
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
      } else {
        // Seed initial campaigns
        INITIAL_CAMPAIGNS.forEach((c) => videoService.saveAdCampaign(c));
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
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 md:p-8 border border-[#353437] my-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-extrabold text-[#e5e1e4] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#eab308]">campaign</span>
              Ad & Sponsorship Management
            </h2>
            <p className="text-xs text-[#debec8] mt-0.5">
              Control video pre-rolls, inline banner campaigns, and CPM monetization settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#2a2a2c] hover:bg-white/10 text-[#debec8] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Analytics Summary Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-[#1e1d21] border border-[#353437] text-center">
            <span className="text-xs text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Total Impressions
            </span>
            <span className="text-xl font-extrabold text-white">
              {campaigns.reduce((acc, c) => acc + c.impressions, 0).toLocaleString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#1e1d21] border border-[#353437] text-center">
            <span className="text-xs text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Total Clicks
            </span>
            <span className="text-xl font-extrabold text-[#ec4899]">
              {campaigns.reduce((acc, c) => acc + c.clicks, 0).toLocaleString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#1e1d21] border border-[#353437] text-center">
            <span className="text-xs text-[#debec8] font-bold uppercase tracking-wider block mb-1">
              Avg. CTR
            </span>
            <span className="text-xl font-extrabold text-[#eab308]">
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
            className="w-full py-3 mb-6 rounded-xl border border-dashed border-[#eab308] hover:bg-[#eab308]/10 text-[#eab308] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Launch New Ad Campaign</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateCampaign}
            className="mb-6 p-5 bg-[#18181b] rounded-xl border border-[#eab308]/40 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#eab308] uppercase tracking-wider flex items-center justify-between">
              <span>New Sponsorship Details</span>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="text-xs text-[#debec8] hover:text-white"
              >
                Cancel
              </button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#debec8] uppercase mb-1">
                  Brand / Advertiser Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. FapnXX Luxe Cosmetics"
                  className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg p-2.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#eab308]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#debec8] uppercase mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exclusive Midnight Collection"
                  className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg p-2.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#eab308]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#debec8] uppercase mb-1">
                  Ad Placement Position
                </label>
                <select
                  value={position}
                  onChange={(e) =>
                    setPosition(e.target.value as 'banner_top' | 'card_inline' | 'pre_roll')
                  }
                  className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg p-2.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#eab308]"
                >
                  <option value="banner_top">Top Showcase Banner</option>
                  <option value="card_inline">Inline Video Grid Card</option>
                  <option value="pre_roll">Video Pre-Roll Sponsor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#debec8] uppercase mb-1">
                  Target Destination URL
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://sponsorbrand.com/promo"
                  className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg p-2.5 text-xs text-[#e5e1e4] focus:outline-none focus:border-[#eab308]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#eab308] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#facc15] transition-all cursor-pointer"
            >
              Activate Campaign
            </button>
          </form>
        )}

        {/* Campaign List */}
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          <h3 className="text-xs font-bold text-[#debec8] uppercase tracking-wider">
            Active Sponsorship Campaigns ({campaigns.length})
          </h3>

          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                c.isActive
                  ? 'bg-[#1a1a1c] border-[#353437]'
                  : 'bg-[#141415]/50 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#eab308] uppercase">
                      {c.brandName}
                    </span>
                    <span className="text-[10px] bg-[#2a2a2c] text-[#debec8] px-2 py-0.5 rounded uppercase">
                      {c.position.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{c.title}</h4>
                  <div className="flex gap-3 text-[11px] text-[#debec8] mt-1">
                    <span>{c.impressions.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{c.clicks.toLocaleString()} clicks</span>
                    <span>•</span>
                    <span className="text-[#eab308] font-bold">{c.cpmRate} CPM</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleCampaign(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer ${
                  c.isActive
                    ? 'bg-[#353437] text-white hover:bg-red-900/40'
                    : 'bg-[#eab308] text-black'
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
