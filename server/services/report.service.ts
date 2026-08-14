import { ReportStatus } from '../config/constants';
import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

export interface DMCAReportRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  reporterName?: string;
  reporterEmail?: string;
  reason: 'copyright_dmca' | 'inappropriate_content' | 'spam_misleading' | 'privacy_violation' | 'other';
  details: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  clientIp?: string;
}

const reports = new Map<string, DMCAReportRecord>();
let isFirestoreReportsInitialized = false;

async function initFirestoreReportsSync() {
  if (isFirestoreReportsInitialized) return;
  try {
    const snapshot = await adminDb.collection('reports').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as DMCAReportRecord;
        reports.set(doc.id, { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore ReportService] Loaded ${snapshot.size} reports from Firestore.`);
    }
    isFirestoreReportsInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore ReportService] Sync fallback:', err.message);
  }
}

initFirestoreReportsSync();

export const reportService = {
  listReports: (options?: { status?: ReportStatus }): DMCAReportRecord[] => {
    let list = Array.from(reports.values());
    if (options?.status) {
      list = list.filter((r) => r.status === options.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  findById: (id: string): DMCAReportRecord | undefined => {
    return reports.get(id);
  },

  create: async (data: Omit<DMCAReportRecord, 'id' | 'createdAt' | 'status'>): Promise<DMCAReportRecord> => {
    const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newReport: DMCAReportRecord = {
      ...data,
      id,
      status: ReportStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    reports.set(id, newReport);

    // Save to Firestore DB
    try {
      await adminDb.collection('reports').doc(id).set(newReport);
    } catch (err: any) {
      console.warn(`[Firestore Report] Save error for doc ${id}:`, err.message);
    }

    return newReport;
  },

  updateStatus: async (
    id: string,
    status: ReportStatus,
    actorId: string,
    actorEmail: string,
    actorRole: string
  ): Promise<DMCAReportRecord> => {
    const report = reports.get(id);
    if (!report) {
      throw new Error(`Report with ID ${id} not found.`);
    }

    report.status = status;
    if (status === ReportStatus.RESOLVED || status === ReportStatus.TAKEDOWN || status === ReportStatus.DISMISSED) {
      report.resolvedAt = new Date().toISOString();
      report.resolvedBy = actorEmail;
    }

    reports.set(id, report);

    // Update in Firestore DB
    try {
      await adminDb.collection('reports').doc(id).set(report, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Report] Update error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: `report.status_change`,
      targetType: 'dmca_report',
      targetId: id,
      metadata: { videoId: report.videoId, newStatus: status },
    });

    return report;
  },
};

