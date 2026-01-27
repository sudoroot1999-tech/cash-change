export interface TradingVolumeMetric {
  time: Date;
  trading_pair: string;
  user_level?: string;
  buy_volume: number;
  sell_volume: number;
  total_volume: number;
  trade_count: number;
  unique_users: number;
  avg_trade_size: number;
}

export interface UserActivityMetric {
  time: Date;
  metric_type: 'DAU' | 'WAU' | 'MAU';
  total_users: number;
  new_users: number;
  active_traders: number;
  verified_users: number;
}

export interface RevenueMetric {
  time: Date;
  revenue_type: 'trading_fee' | 'withdrawal_fee' | 'deposit_fee' | 'subscription' | 'other';
  amount: number;
  currency: string;
  transaction_count: number;
}

export interface LiquidityMetric {
  time: Date;
  trading_pair: string;
  bid_volume: number;
  ask_volume: number;
  spread: number;
  depth_10: number;
  depth_20: number;
  order_count: number;
}

export interface UserCohort {
  cohort_id?: number;
  cohort_date: Date;
  cohort_name?: string;
  total_users: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
  retention_day_90: number;
  avg_lifetime_value: number;
  created_at?: Date;
}

export interface ChurnPrediction {
  prediction_id?: number;
  user_id: string;
  churn_probability: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: Record<string, any>;
  predicted_at?: Date;
  status: 'active' | 'churned' | 'retained';
}

export interface FinancialSnapshot {
  snapshot_id?: number;
  snapshot_date: Date;
  snapshot_type: 'daily' | 'weekly' | 'monthly';
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  reserve_ratio: number;
  snapshot_data?: Record<string, any>;
  created_at?: Date;
}

export interface RiskExposure {
  exposure_id?: number;
  measured_at: Date;
  asset: string;
  total_exposure: number;
  long_exposure: number;
  short_exposure: number;
  concentration_ratio: number;
  var_95: number;
  var_99: number;
}

export interface LiquidationEvent {
  event_id?: number;
  occurred_at: Date;
  user_id: string;
  position_id?: string;
  asset: string;
  amount: number;
  liquidation_price: number;
  loss_amount: number;
  event_data?: Record<string, any>;
}

export interface FraudAlert {
  alert_id?: number;
  detected_at: Date;
  user_id?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  alert_data?: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assigned_to?: string;
  resolved_at?: Date;
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  start_date: Date;
  end_date?: Date;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cac: number;
  roi: number;
  campaign_data?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConversionFunnel {
  funnel_id?: number;
  funnel_name: string;
  measured_date: Date;
  step_1_count: number;
  step_2_count: number;
  step_3_count: number;
  step_4_count: number;
  step_5_count: number;
  conversion_rate: number;
  drop_off_data?: Record<string, any>;
}

export interface PriceMovement {
  time: Date;
  trading_pair: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  volatility: number;
  price_change: number;
}

export interface DashboardOverview {
  timestamp: Date;
  total_users: number;
  active_users_24h: number;
  total_volume_24h: number;
  total_trades_24h: number;
  total_revenue_24h: number;
  top_trading_pairs: Array<{
    pair: string;
    volume: number;
    change_24h: number;
  }>;
  user_growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface ExecutiveDashboard {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    total: number;
    trend: Array<{ date: Date; amount: number }>;
    breakdown: Record<string, number>;
  };
  users: {
    total: number;
    new: number;
    active: number;
    growth_rate: number;
  };
  trading: {
    volume: number;
    trades: number;
    avg_trade_size: number;
  };
  market_share: Record<string, number>;
  key_metrics: {
    revenue_per_user: number;
    avg_ltv: number;
    churn_rate: number;
    retention_rate: number;
  };
}

export interface TradingAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  volume_by_pair: Array<{
    pair: string;
    volume: number;
    trades: number;
    unique_users: number;
  }>;
  price_movements: Record<string, PriceMovement[]>;
  liquidity: Array<{
    pair: string;
    bid_volume: number;
    ask_volume: number;
    spread: number;
  }>;
  maker_taker_ratio: {
    maker_volume: number;
    taker_volume: number;
    ratio: number;
  };
  slippage_analysis: Array<{
    pair: string;
    avg_slippage: number;
    max_slippage: number;
  }>;
}

export interface UserAnalytics {
  cohort_analysis: UserCohort[];
  behavior_patterns: Record<string, any>;
  churn_predictions: ChurnPrediction[];
  lifetime_value: {
    avg: number;
    median: number;
    distribution: Record<string, number>;
  };
  segmentation: Array<{
    segment: string;
    user_count: number;
    avg_volume: number;
    avg_revenue: number;
  }>;
}

export interface ReportRequest {
  report_type: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  period: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  email_recipients?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

export interface QueryCache {
  key: string;
  data: any;
  ttl: number;
  created_at: Date;
}
