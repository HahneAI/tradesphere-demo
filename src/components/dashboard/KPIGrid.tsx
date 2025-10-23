/**
 * KPI Grid Component
 *
 * Responsive grid wrapper for KPI cards.
 * Automatically calculates and displays key metrics from dashboard data.
 *
 * @module KPIGrid
 */

import React, { useMemo } from 'react';
import { DashboardMetrics } from '../../types/crm';
import { KPICard } from './KPICard';

interface KPIGridProps {
  metrics: DashboardMetrics;
  onKPIClick: (filterType: string) => void;
  visualConfig: any;
  theme: 'light' | 'dark';
}

/**
 * KPI Grid component with responsive layout
 */
export const KPIGrid: React.FC<KPIGridProps> = ({
  metrics,
  onKPIClick,
  visualConfig,
  theme
}) => {

  /**
   * Calculate KPI values from metrics
   */
  const kpiData = useMemo(() => {
    // Calculate total active jobs
    const activeJobs = metrics.job_metrics_by_status
      .filter(m => ['scheduled', 'in_progress', 'approved'].includes(m.status))
      .reduce((sum, m) => sum + m.job_count, 0);

    // Get quote/approved pipeline value
    const pipelineValue = metrics.revenue.quoted_value + metrics.revenue.approved_value;

    // Revenue growth
    const revenueGrowth = metrics.revenue.revenue_growth_percentage;
    const revenueTrend: 'up' | 'down' | 'neutral' =
      revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'neutral';

    // Crew utilization
    const utilizationPercent = metrics.crew_utilization.total_crews > 0
      ? Math.round((metrics.crew_utilization.crews_at_capacity / metrics.crew_utilization.total_crews) * 100)
      : 0;

    return [
      {
        id: 'active_jobs',
        title: 'Active Jobs',
        value: activeJobs,
        subtitle: `${metrics.crew_utilization.assignments_in_progress} in progress`,
        icon: 'Briefcase' as const,
        color: visualConfig.colors.primary,
        onClick: () => onKPIClick('active')
      },
      {
        id: 'revenue',
        title: 'Monthly Revenue',
        value: `$${Math.round(metrics.revenue.current_period_revenue).toLocaleString()}`,
        subtitle: `${metrics.revenue.current_period_jobs} jobs completed`,
        trend: revenueTrend,
        trendValue: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
        icon: 'DollarSign' as const,
        color: '#22C55E',
        onClick: () => onKPIClick('revenue')
      },
      {
        id: 'pipeline',
        title: 'Pipeline Value',
        value: `$${Math.round(pipelineValue).toLocaleString()}`,
        subtitle: `${metrics.job_metrics_by_status.find(m => m.status === 'quote')?.job_count || 0} quotes pending`,
        icon: 'TrendingUp' as const,
        color: '#3B82F6',
        onClick: () => onKPIClick('pipeline')
      },
      {
        id: 'crew_utilization',
        title: 'Crew Utilization',
        value: `${utilizationPercent}%`,
        subtitle: `${metrics.crew_utilization.crews_available} crews available`,
        icon: 'Users' as const,
        color: '#F59E0B',
        onClick: () => onKPIClick('crews')
      }
    ];
  }, [metrics, visualConfig, onKPIClick]);

  return (
    <section aria-label="Key Performance Indicators">
      <h2 className="sr-only">Dashboard Metrics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiData.map((kpi) => (
          <KPICard
            key={kpi.id}
            {...kpi}
            visualConfig={visualConfig}
            theme={theme}
          />
        ))}
      </div>
    </section>
  );
};

export default KPIGrid;
