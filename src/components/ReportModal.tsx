import React, { useState, useEffect } from 'react';
import { DMCAReport, ReportReason, Video } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { videoService } from '../services/videoService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
  onSubmitReportSuccess: (report: DMCAReport) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  video,
  onSubmitReportSuccess,
}) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ReportReason>('copyright_dmca');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Automatically reset form state whenever ReportModal is opened or video changes
  useEffect(() => {
    if (isOpen) {
      setReason('copyright_dmca');
      setReporterName('');
      setReporterEmail('');
      setDetails('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, video?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setErrorMsg('Please enter detailed information explaining your claim or report.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const newReport: DMCAReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      videoId: video.id,
      videoTitle: video.title,
      reporterName: reporterName.trim() || 'Anonymous',
      reporterEmail: reporterEmail.trim() || 'anonymous@platform.com',
      reason,
      details: details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      // Save directly to Cloud Firestore via videoService
      await videoService.saveReport(newReport);
      onSubmitReportSuccess(newReport);
    } catch (err) {
      console.warn('[ReportModal] Firestore report save fallback:', err);
      onSubmitReportSuccess(newReport);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#121113] border border-[#2e2d30] rounded-2xl w-full max-w-xl p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 text-[#e5e1e4]">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-sm">flag</span>
              <span>DMCA & Content Moderation</span>
            </div>
            <h2 className="text-xl font-bold text-white">{t.reportTitle}</h2>
            <p className="text-xs text-[#a19fa6] mt-1">{t.reportSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Flagged Video Context */}
        <div className="flex items-center gap-3 bg-[#1a191c] p-3 rounded-xl border border-white/5 mb-6">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-16 h-10 object-cover rounded-lg border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{video.title}</div>
            <div className="text-[11px] text-[#a19fa6]">ID: {video.id} • {video.performerName}</div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#a19fa6] mb-2">
              Reason for Report
            </label>
            <div className="space-y-2">
              {[
                { id: 'copyright_dmca', label: t.reasonCopyright, icon: 'gavel' },
                { id: 'inappropriate_content', label: t.reasonInappropriate, icon: 'warning' },
                { id: 'spam_misleading', label: t.reasonSpam, icon: 'report' },
                { id: 'privacy_violation', label: t.reasonPrivacy, icon: 'lock' },
                { id: 'other', label: t.reasonOther, icon: 'help_outline' },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === item.id
                      ? 'bg-rose-500/10 border-rose-500/60 text-white'
                      : 'bg-[#18171a] border-white/5 text-[#a19fa6] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="reportReason"
                      value={item.id}
                      checked={reason === item.id}
                      onChange={() => setReason(item.id as ReportReason)}
                      className="accent-rose-500"
                    />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-sm opacity-60">{item.icon}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#a19fa6] mb-1.5">
                {t.reporterName}
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe / Legal Agent"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full bg-[#18171a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#a19fa6] mb-1.5">
                {t.reporterEmail}
              </label>
              <input
                type="email"
                placeholder="copyright@domain.com"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="w-full bg-[#18171a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#a19fa6] mb-1.5">
              Claim Details & Description *
            </label>
            <textarea
              rows={3}
              required
              placeholder={t.reportDetailsPlaceholder}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-[#18171a] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-rose-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#a19fa6] hover:text-white transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{t.submitReport}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
