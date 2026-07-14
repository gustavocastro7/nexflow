import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSequelize } from '@/lib/config/database';
import Invoice from '@/lib/models/Invoice';
import CostCenter from '@/lib/models/CostCenter';
import PhoneLine from '@/lib/models/PhoneLine';
import Collaborator from '@/lib/models/Collaborator';
import UserWorkspace from '@/lib/models/UserWorkspace';

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) throw new Error('Token not provided');
  const [, token] = authHeader.split(' ');
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key') as { id: string; email: string; profile: string };
}

function buildLikeConditions(patterns: string[], column: string, paramPrefix: string, replacements: Record<string, string>) {
  return patterns.map((p, i) => {
    const key = `${paramPrefix}_${i}`;
    replacements[key] = p.replace(/%/g, '');
    return `${column} LIKE :${key}`;
  }).join(' OR ');
}

export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });

    const sequelize = getSequelize();

    const [costCentersCount, claroCount, vivoCount, claroTxtCount, totalSpentResult, usersCount, collaboratorsCount] =
      await Promise.all([
        CostCenter.count({ where: { workspace_id: workspaceId } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'claro' } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'vivo' } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'claro_txt' } }),
        Invoice.sum('charged_value', { where: { workspace_id: workspaceId } }),
        UserWorkspace.count({ where: { workspace_id: workspaceId } }),
        Collaborator.count({ where: { workspace_id: workspaceId } }),
      ]);

    const totalSpent = parseFloat(totalSpentResult as any) || 0;

    const [[phoneStats]] = await sequelize.query(`
      SELECT COUNT(*) AS phone_lines_count,
        SUM(CASE WHEN pl.cost_center_id IS NULL THEN 1 ELSE 0 END) AS phone_lines_without_cc
      FROM (SELECT DISTINCT source_phone, workspace_id FROM invoices WHERE workspace_id = :workspaceId AND source_phone IS NOT NULL AND source_phone != ''
        UNION SELECT DISTINCT phone_number as source_phone, workspace_id FROM phone_lines WHERE workspace_id = :workspaceId) AS unique_phones
      LEFT JOIN phone_lines pl ON pl.phone_number = unique_phones.source_phone AND pl.workspace_id = unique_phones.workspace_id
    `, { replacements: { workspaceId } });

    const [costsByCC] = await sequelize.query(`
      SELECT COALESCE(cc.name, 'Unallocated') as name, SUM(i.charged_value) as total
      FROM invoices i LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
      LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
      WHERE i.workspace_id = :workspaceId GROUP BY cc.name ORDER BY total DESC LIMIT 5
    `, { replacements: { workspaceId } });

    const [monthlyTrends] = await sequelize.query(`
      SELECT DATE_FORMAT(item_date, '%Y-%m') as month,
        SUM(CASE WHEN section LIKE '%DADOS%' OR sub_section LIKE '%DADOS%' OR description LIKE '%DADOS%' OR description LIKE '%INTERNET%' THEN quantity ELSE 0 END) as data_gb,
        SUM(CASE WHEN section LIKE '%VOZ%' OR sub_section LIKE '%VOZ%' OR description LIKE '%VOZ%' OR description LIKE '%LIGACAO%' THEN
          CASE WHEN duration REGEXP '^[0-9]+:[0-9]+:[0-9]+$' THEN (TIME_TO_SEC(duration) / 60) ELSE quantity END
        ELSE 0 END) as voice_min,
        SUM(CASE WHEN section LIKE '%SMS%' OR sub_section LIKE '%SMS%' OR description LIKE '%SMS%' OR description LIKE '%MENSAGEM%' THEN quantity ELSE 0 END) as sms_count,
        SUM(charged_value) as total_spent
      FROM invoices WHERE workspace_id = :workspaceId AND item_date IS NOT NULL
      GROUP BY month ORDER BY month DESC LIMIT 6
    `, { replacements: { workspaceId } });

    const [expensiveLines] = await sequelize.query(`
      SELECT source_phone as phone, SUM(charged_value) as total
      FROM invoices WHERE workspace_id = :workspaceId AND source_phone IS NOT NULL AND source_phone != ''
      GROUP BY source_phone ORDER BY total DESC LIMIT 5
    `, { replacements: { workspaceId } });

    let topDataLines: any[] = [];
    try {
      const [result] = await sequelize.query(`
        SELECT i.source_phone as phone, COALESCE(coll.name, pl.responsible_name, i.original_user, '') as responsible,
          SUM(CAST(REGEXP_REPLACE(i.quantity, '[^0-9.]', '') AS DECIMAL(10,2))) / 1024 as total_gb
        FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id
        LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
        LEFT JOIN collaborators coll ON coll.id = pl.collaborator_id
        WHERE i.workspace_id = :workspaceId AND (i.section LIKE '%INTERNET (MB)%' OR i.sub_section LIKE '%INTERNET (MB)%' OR i.description LIKE '%INTERNET (MB)%')
          AND ri.due_date = (SELECT MAX(due_date) FROM raw_invoices WHERE workspace_id = :workspaceId)
        GROUP BY i.source_phone, coll.name, pl.responsible_name, i.original_user ORDER BY total_gb DESC LIMIT 5
      `, { replacements: { workspaceId } });
      topDataLines = result[0] || [];
    } catch { topDataLines = []; }

    const [idleLines] = await sequelize.query(`
      SELECT source_phone FROM invoices WHERE workspace_id = :workspaceId
      GROUP BY source_phone HAVING SUM(charged_value) > 0 AND COUNT(*) < 5 LIMIT 3
    `, { replacements: { workspaceId } });

    const auditKeywords = {
      errors: ['DUPLICATED', 'ERROR', 'FINE', 'INTEREST', 'NOT CONTRACTED', 'PENALTY', 'UNDUE CHARGE', 'WITHHELD VALUE'],
      excess: ['EXCESS', 'ADDITIONAL', 'EXTRA', 'AVULSO', 'OUT OF PACKAGE', 'USAGE PAYMENT'],
    };

    const errReplacements: Record<string, string> = { workspaceId };
    const errorLikes = buildLikeConditions(auditKeywords.errors, 'description', 'ek', errReplacements);
    const excessLikes = buildLikeConditions(auditKeywords.excess, 'description', 'xk', errReplacements);

    const [detectedErrors] = await sequelize.query(`
      SELECT
        SUM(CASE WHEN ${errorLikes} THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN ${errorLikes} THEN charged_value ELSE 0 END) as error_value,
        SUM(CASE WHEN ${excessLikes} THEN 1 ELSE 0 END) as excess_count,
        SUM(CASE WHEN ${excessLikes} THEN charged_value ELSE 0 END) as excess_value
      FROM invoices WHERE workspace_id = :workspaceId AND item_date >= (CURRENT_DATE - INTERVAL 90 DAY)
    `, { replacements: errReplacements });

    const alertsData: any = detectedErrors[0] || {};

    let errorList: any[] = [];
    try {
      const replacements: Record<string, string> = { workspaceId };
      const likes = buildLikeConditions(auditKeywords.errors, 'description', 'ek', replacements);
      const [result] = await sequelize.query(`
        SELECT description, COUNT(*) as count, SUM(charged_value) as total_value
        FROM invoices WHERE workspace_id = :workspaceId AND (${likes})
          AND item_date >= (CURRENT_DATE - INTERVAL 90 DAY)
        GROUP BY description ORDER BY total_value DESC LIMIT 5
      `, { replacements });
      errorList = result[0] || [];
    } catch { errorList = []; }

    const currentMonth: any = monthlyTrends[0] || {};
    const previousMonth: any = monthlyTrends[1] || {};
    const trend = previousMonth.total_spent > 0 ? ((currentMonth.total_spent - previousMonth.total_spent) / previousMonth.total_spent) * 100 : 0;

    let total_data_gb = 0;
    try {
      const [[{ total_data_gb: result }]] = await sequelize.query(`
        SELECT COALESCE(SUM(CAST(REGEXP_REPLACE(i.quantity, '[^0-9.]', '') AS DECIMAL(10,2)) / 1024), 0) as total_data_gb
        FROM invoices i JOIN raw_invoices ri ON ri.id = i.raw_invoice_id
        WHERE i.workspace_id = :workspaceId AND (i.section LIKE '%INTERNET (MB)%' OR i.sub_section LIKE '%INTERNET (MB)%' OR i.description LIKE '%INTERNET (MB)%')
          AND ri.due_date = (SELECT MAX(due_date) FROM raw_invoices WHERE workspace_id = :workspaceId)
      `, { replacements: { workspaceId } });
      total_data_gb = result || 0;
    } catch { total_data_gb = 0; }

    return NextResponse.json({
      summary: { totalSpent, trend: parseFloat(trend.toFixed(2)), dataUsage: Number(total_data_gb || 0), voiceUsage: currentMonth.voice_min || 0, smsUsage: currentMonth.sms_count || 0 },
      alerts: {
        hasExcessConsumption: (alertsData.excess_count || 0) > 0, excessValue: alertsData.excess_value || 0, excessCount: alertsData.excess_count || 0,
        hasBillingErrors: (alertsData.error_count || 0) > 0, errorValue: alertsData.error_value || 0, errorCount: alertsData.error_count || 0,
      },
      counts: {
        costCenters: costCentersCount, invoices: (claroCount || 0) + (claroTxtCount || 0) + (vivoCount || 0),
        phoneLines: (phoneStats as any)?.phone_lines_count || 0, phoneLinesWithoutCC: (phoneStats as any)?.phone_lines_without_cc || 0,
        users: usersCount || 0, collaborators: collaboratorsCount || 0,
      },
      charts: {
        costsByDepartment: costsByCC, monthlyTrends: (monthlyTrends || []).reverse(),
        expensiveLines, topDataLines: topDataLines.map((l: any) => ({ phone: l.phone, responsible: l.responsible, total_gb: parseFloat(l.total_gb || 0) })),
      },
      opportunities: [
        { type: 'idle_lines', description: 'Low usage lines detected', impact: (idleLines as any[]).length * 50 },
        { type: 'plan_optimization', description: 'Suggested plan migration', impact: totalSpent * 0.05 },
      ],
      errors: (errorList as any[]).map((e: any) => ({ type: 'billing_error', description: e.description, count: parseInt(e.count) })),
    });
  } catch (error: any) {
    if (error.message === 'Token not provided' || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error fetching dashboard statistics' }, { status: 500 });
  }
}
