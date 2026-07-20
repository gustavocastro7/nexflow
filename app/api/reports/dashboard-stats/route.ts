import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/jwt';
import { escapeRegex } from '@/lib/utils/db';
import Invoice from '@/lib/models/Invoice';
import RawInvoice from '@/lib/models/RawInvoice';
import CostCenter from '@/lib/models/CostCenter';
import PhoneLine from '@/lib/models/PhoneLine';
import Collaborator from '@/lib/models/Collaborator';
import UserWorkspace from '@/lib/models/UserWorkspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return verifyToken(token) as { id: string; email: string; profile: string };
}

function fieldContains(field: string, pattern: string) {
  return { $regexMatch: { input: { $ifNull: [`$${field}`, ''] }, regex: pattern, options: 'i' } };
}

const durationMinutesExpr = {
  $cond: [
    { $regexMatch: { input: { $ifNull: ['$duration', ''] }, regex: '^[0-9]+:[0-9]+:[0-9]+$' } },
    {
      $divide: [
        {
          $let: {
            vars: { parts: { $split: ['$duration', ':'] } },
            in: {
              $add: [
                { $multiply: [{ $toInt: { $arrayElemAt: ['$$parts', 0] } }, 3600] },
                { $multiply: [{ $toInt: { $arrayElemAt: ['$$parts', 1] } }, 60] },
                { $toInt: { $arrayElemAt: ['$$parts', 2] } },
              ],
            },
          },
        },
        60,
      ],
    },
    { $ifNull: ['$quantity', 0] },
  ],
};

const phoneLineLookupStage = {
  $lookup: {
    from: 'phonelines',
    let: { phone: '$source_phone', ws: '$workspace_id' },
    pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$phone_number', '$$phone'] }, { $eq: ['$workspace_id', '$$ws'] }] } } }],
    as: 'pl',
  },
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const [costCentersCount, claroCount, vivoCount, claroTxtCount, totalSpentAgg, usersCount, collaboratorsCount] =
      await Promise.all([
        CostCenter.countDocuments({ workspace_id: workspaceId }),
        Invoice.countDocuments({ workspace_id: workspaceId, operator: 'claro' }),
        Invoice.countDocuments({ workspace_id: workspaceId, operator: 'vivo' }),
        Invoice.countDocuments({ workspace_id: workspaceId, operator: 'claro_txt' }),
        Invoice.aggregate([{ $match: { workspace_id: workspaceId } }, { $group: { _id: null, total: { $sum: '$charged_value' } } }]),
        UserWorkspace.countDocuments({ workspace_id: workspaceId }),
        Collaborator.countDocuments({ workspace_id: workspaceId }),
      ]);

    const totalSpent = totalSpentAgg[0]?.total || 0;

    // --- phone line stats (union of invoice source_phone + phone_lines.phone_number) ---
    const [invoicePhones, phoneLinePhones] = await Promise.all([
      Invoice.distinct('source_phone', { workspace_id: workspaceId, source_phone: { $nin: [null, ''] } }),
      PhoneLine.distinct('phone_number', { workspace_id: workspaceId }),
    ]);
    const uniquePhones = [...new Set([...invoicePhones, ...phoneLinePhones])];
    const plForCount: any[] = await PhoneLine.find({ workspace_id: workspaceId, phone_number: { $in: uniquePhones } }).select('phone_number cost_center_id').lean();
    const plCountMap = new Map(plForCount.map((p) => [p.phone_number, p]));
    const phone_lines_count = uniquePhones.length;
    const phone_lines_without_cc = uniquePhones.filter((phone) => {
      const pl: any = plCountMap.get(phone);
      return !pl || !pl.cost_center_id;
    }).length;

    // --- costs by cost center (top 5) ---
    const costsByCCRaw = await Invoice.aggregate([
      { $match: { workspace_id: workspaceId } },
      phoneLineLookupStage,
      { $unwind: { path: '$pl', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'costcenters', localField: 'pl.cost_center_id', foreignField: '_id', as: 'cc' } },
      { $unwind: { path: '$cc', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$cc.name', 'Unallocated'] }, total: { $sum: '$charged_value' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);
    const costsByCC = costsByCCRaw.map((r: any) => ({ name: r._id, total: r.total || 0 }));

    // --- monthly trends (last 6 months) ---
    const monthlyTrendsRaw = await Invoice.aggregate([
      { $match: { workspace_id: workspaceId, item_date: { $ne: null } } },
      { $addFields: { month: { $substrCP: ['$item_date', 0, 7] } } },
      { $group: {
          _id: '$month',
          data_gb: { $sum: { $cond: [{ $or: [fieldContains('section', 'DADOS'), fieldContains('sub_section', 'DADOS'), fieldContains('description', 'DADOS'), fieldContains('description', 'INTERNET')] }, { $ifNull: ['$quantity', 0] }, 0] } },
          voice_min: { $sum: { $cond: [{ $or: [fieldContains('section', 'VOZ'), fieldContains('sub_section', 'VOZ'), fieldContains('description', 'VOZ'), fieldContains('description', 'LIGACAO')] }, durationMinutesExpr, 0] } },
          sms_count: { $sum: { $cond: [{ $or: [fieldContains('section', 'SMS'), fieldContains('sub_section', 'SMS'), fieldContains('description', 'SMS'), fieldContains('description', 'MENSAGEM')] }, { $ifNull: ['$quantity', 0] }, 0] } },
          total_spent: { $sum: '$charged_value' },
        } },
      { $sort: { _id: -1 } },
      { $limit: 6 },
    ]);
    const monthlyTrends = monthlyTrendsRaw.map((r: any) => ({
      month: r._id, data_gb: r.data_gb || 0, voice_min: r.voice_min || 0, sms_count: r.sms_count || 0, total_spent: r.total_spent || 0,
    }));

    // --- expensive lines (top 5) ---
    const expensiveLinesRaw = await Invoice.aggregate([
      { $match: { workspace_id: workspaceId, source_phone: { $nin: [null, ''] } } },
      { $group: { _id: '$source_phone', total: { $sum: '$charged_value' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);
    const expensiveLines = expensiveLinesRaw.map((r: any) => ({ phone: r._id, total: r.total || 0 }));

    // --- top data lines for the most recent due_date ---
    const maxDueDateRows = await RawInvoice.find({ workspace_id: workspaceId, due_date: { $ne: null } })
      .sort({ due_date: -1 }).limit(1).select('due_date').lean();
    const maxDueDate = (maxDueDateRows[0] as any)?.due_date || null;

    let topDataLines: any[] = [];
    let total_data_gb = 0;
    if (maxDueDate) {
      const rawIdsAtMaxDate = (await RawInvoice.find({ workspace_id: workspaceId, due_date: maxDueDate }).select('_id')).map((r: any) => r.id);
      const internetRegex = new RegExp(escapeRegex('INTERNET (MB)'), 'i');
      const internetMatch = { $or: [{ section: internetRegex }, { sub_section: internetRegex }, { description: internetRegex }] };

      try {
        const topDataLinesRaw = await Invoice.aggregate([
          { $match: { workspace_id: workspaceId, raw_invoice_id: { $in: rawIdsAtMaxDate }, ...internetMatch } },
          phoneLineLookupStage,
          { $unwind: { path: '$pl', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'collaborators', localField: 'pl.collaborator_id', foreignField: '_id', as: 'coll' } },
          { $unwind: { path: '$coll', preserveNullAndEmptyArrays: true } },
          { $addFields: { resolvedResponsible: { $ifNull: ['$coll.name', { $ifNull: ['$pl.responsible_name', { $ifNull: ['$original_user', ''] }] }] } } },
          { $group: { _id: { phone: '$source_phone', responsible: '$resolvedResponsible' }, total_gb: { $sum: { $divide: [{ $ifNull: ['$quantity', 0] }, 1024] } } } },
          { $sort: { total_gb: -1 } },
          { $limit: 5 },
        ]);
        topDataLines = topDataLinesRaw.map((r: any) => ({ phone: r._id.phone, responsible: r._id.responsible, total_gb: r.total_gb || 0 }));
      } catch { topDataLines = []; }

      try {
        const totalGbAgg = await Invoice.aggregate([
          { $match: { workspace_id: workspaceId, raw_invoice_id: { $in: rawIdsAtMaxDate }, ...internetMatch } },
          { $group: { _id: null, total: { $sum: { $divide: [{ $ifNull: ['$quantity', 0] }, 1024] } } } },
        ]);
        total_data_gb = totalGbAgg[0]?.total || 0;
      } catch { total_data_gb = 0; }
    }

    // --- idle lines (low usage, non-zero spend) ---
    const idleLines = await Invoice.aggregate([
      { $match: { workspace_id: workspaceId } },
      { $group: { _id: '$source_phone', total: { $sum: '$charged_value' }, count: { $sum: 1 } } },
      { $match: { total: { $gt: 0 }, count: { $lt: 5 } } },
      { $limit: 3 },
    ]);

    // --- billing error / excess detection (last 90 days) ---
    const auditKeywords = {
      errors: ['DUPLICATED', 'ERROR', 'FINE', 'INTEREST', 'NOT CONTRACTED', 'PENALTY', 'UNDUE CHARGE', 'WITHHELD VALUE'],
      excess: ['EXCESS', 'ADDITIONAL', 'EXTRA', 'AVULSO', 'OUT OF PACKAGE', 'USAGE PAYMENT'],
    };
    const errorPattern = auditKeywords.errors.map(escapeRegex).join('|');
    const excessPattern = auditKeywords.excess.map(escapeRegex).join('|');
    const errorRegex = new RegExp(errorPattern, 'i');
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const detectedErrorsAgg = await Invoice.aggregate([
      { $match: { workspace_id: workspaceId, item_date: { $gte: cutoffDate } } },
      { $group: {
          _id: null,
          error_count: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: errorPattern, options: 'i' } }, 1, 0] } },
          error_value: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: errorPattern, options: 'i' } }, '$charged_value', 0] } },
          excess_count: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: excessPattern, options: 'i' } }, 1, 0] } },
          excess_value: { $sum: { $cond: [{ $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: excessPattern, options: 'i' } }, '$charged_value', 0] } },
        } },
    ]);
    const alertsData: any = detectedErrorsAgg[0] || {};

    let errorList: any[] = [];
    try {
      const errorListRaw = await Invoice.aggregate([
        { $match: { workspace_id: workspaceId, item_date: { $gte: cutoffDate }, description: errorRegex } },
        { $group: { _id: '$description', count: { $sum: 1 }, total_value: { $sum: '$charged_value' } } },
        { $sort: { total_value: -1 } },
        { $limit: 5 },
      ]);
      errorList = errorListRaw;
    } catch { errorList = []; }

    const currentMonth: any = monthlyTrends[0] || {};
    const previousMonth: any = monthlyTrends[1] || {};
    const trend = previousMonth.total_spent > 0 ? ((currentMonth.total_spent - previousMonth.total_spent) / previousMonth.total_spent) * 100 : 0;

    return NextResponse.json({
      summary: { totalSpent, trend: parseFloat(trend.toFixed(2)), dataUsage: Number(total_data_gb || 0), voiceUsage: currentMonth.voice_min || 0, smsUsage: currentMonth.sms_count || 0 },
      alerts: {
        hasExcessConsumption: (alertsData.excess_count || 0) > 0, excessValue: alertsData.excess_value || 0, excessCount: alertsData.excess_count || 0,
        hasBillingErrors: (alertsData.error_count || 0) > 0, errorValue: alertsData.error_value || 0, errorCount: alertsData.error_count || 0,
      },
      counts: {
        costCenters: costCentersCount, invoices: (claroCount || 0) + (claroTxtCount || 0) + (vivoCount || 0),
        phoneLines: phone_lines_count || 0, phoneLinesWithoutCC: phone_lines_without_cc || 0,
        users: usersCount || 0, collaborators: collaboratorsCount || 0,
      },
      charts: {
        costsByDepartment: costsByCC, monthlyTrends: [...monthlyTrends].reverse(),
        expensiveLines, topDataLines: topDataLines.map((l: any) => ({ phone: l.phone, responsible: l.responsible, total_gb: parseFloat(l.total_gb || 0) })),
      },
      opportunities: [
        { type: 'idle_lines', description: 'Low usage lines detected', impact: idleLines.length * 50 },
        { type: 'plan_optimization', description: 'Suggested plan migration', impact: totalSpent * 0.05 },
      ],
      errors: errorList.map((e: any) => ({ type: 'billing_error', description: e._id, count: e.count })),
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching dashboard statistics' }, { status: 500 });
  }
}
