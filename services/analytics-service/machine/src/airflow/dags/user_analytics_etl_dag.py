"""
User Analytics ETL DAG
Runs every 4 hours to process user behavior, calculate engagement metrics, and update cohorts
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'analytics',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'user_analytics_etl',
    default_args=default_args,
    description='Process user behavior and engagement metrics',
    schedule_interval='0 */4 * * *',  # Every 4 hours
    catchup=False,
    tags=['etl', 'user', 'engagement'],
)


def extract_user_events(**context):
    """Extract user events from ClickHouse"""
    from clickhouse_driver import Client
    
    execution_date = context['execution_date']
    start_time = execution_date - timedelta(hours=4)
    end_time = execution_date
    
    logger.info(f"Extracting user events from {start_time} to {end_time}")
    
    client = Client(host=context['var']['value'].get('CLICKHOUSE_HOST', 'localhost'))
    
    query = """
        SELECT 
            event_id,
            user_id,
            event_type,
            event_category,
            properties,
            timestamp,
            session_id,
            device_type,
            page_url
        FROM user_events
        WHERE timestamp >= %(start_time)s AND timestamp < %(end_time)s
        ORDER BY timestamp
    """
    
    df = pd.DataFrame(
        client.execute(query, {'start_time': start_time, 'end_time': end_time}),
        columns=['event_id', 'user_id', 'event_type', 'event_category', 'properties',
                'timestamp', 'session_id', 'device_type', 'page_url']
    )
    
    output_path = f"/tmp/user_events_{execution_date.strftime('%Y%m%d%H')}.parquet"
    df.to_parquet(output_path, index=False)
    
    logger.info(f"Extracted {len(df)} user events")
    return output_path


def calculate_user_metrics(**context):
    """Calculate user engagement metrics"""
    ti = context['ti']
    input_path = ti.xcom_pull(task_ids='extract_user_events')
    execution_date = context['execution_date']
    
    logger.info("Calculating user metrics")
    
    df = pd.read_parquet(input_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['date'] = df['timestamp'].dt.date
    df['hour'] = df['timestamp'].dt.hour
    
    # Calculate per-user metrics
    user_metrics = df.groupby('user_id').agg({
        'event_id': 'count',  # Total events
        'session_id': 'nunique',  # Number of sessions
        'date': 'nunique',  # Active days
        'device_type': lambda x: x.mode()[0] if len(x) > 0 else None,  # Primary device
    }).reset_index()
    
    user_metrics.columns = ['user_id', 'event_count', 'session_count', 'active_days', 'primary_device']
    
    # Calculate session duration (simplified)
    session_durations = df.groupby(['user_id', 'session_id']).agg({
        'timestamp': ['min', 'max']
    }).reset_index()
    session_durations['duration'] = (
        session_durations[('timestamp', 'max')] - session_durations[('timestamp', 'min')]
    ).dt.total_seconds() / 60  # in minutes
    
    avg_session_duration = session_durations.groupby('user_id')['duration'].mean().reset_index()
    avg_session_duration.columns = ['user_id', 'avg_session_duration']
    
    # Merge metrics
    user_metrics = user_metrics.merge(avg_session_duration, on='user_id', how='left')
    user_metrics['avg_session_duration'] = user_metrics['avg_session_duration'].fillna(0)
    user_metrics['timestamp'] = execution_date
    
    # Calculate engagement score (0-100)
    user_metrics['engagement_score'] = (
        (user_metrics['event_count'].clip(0, 100) * 0.4) +
        (user_metrics['session_count'].clip(0, 20) * 5 * 0.3) +
        (user_metrics['active_days'].clip(0, 7) * 14.3 * 0.3)
    ).round(2)
    
    output_path = f"/tmp/user_metrics_{execution_date.strftime('%Y%m%d%H')}.parquet"
    user_metrics.to_parquet(output_path, index=False)
    
    logger.info(f"Calculated metrics for {len(user_metrics)} users")
    return output_path


def calculate_cohort_retention(**context):
    """Calculate cohort retention rates"""
    execution_date = context['execution_date']
    
    logger.info("Calculating cohort retention")
    
    hook = PostgresHook(postgres_conn_id='analytics_db')
    
    # Get user first activity dates
    query = """
        WITH user_first_activity AS (
            SELECT 
                user_id,
                MIN(DATE(created_at)) as cohort_date
            FROM users
            GROUP BY user_id
        ),
        user_activity AS (
            SELECT DISTINCT
                user_id,
                DATE(timestamp) as activity_date
            FROM user_events
            WHERE timestamp >= NOW() - INTERVAL '90 days'
        )
        SELECT 
            ufa.cohort_date,
            ua.activity_date,
            COUNT(DISTINCT ua.user_id) as active_users,
            EXTRACT(DAY FROM ua.activity_date - ufa.cohort_date) as days_since_signup
        FROM user_first_activity ufa
        INNER JOIN user_activity ua ON ufa.user_id = ua.user_id
        WHERE ufa.cohort_date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY ufa.cohort_date, ua.activity_date
        ORDER BY ufa.cohort_date, ua.activity_date
    """
    
    df = hook.get_pandas_df(query)
    
    # Calculate retention rates
    cohort_sizes = df.groupby('cohort_date')['active_users'].first().to_dict()
    df['cohort_size'] = df['cohort_date'].map(cohort_sizes)
    df['retention_rate'] = (df['active_users'] / df['cohort_size'] * 100).round(2)
    
    output_path = f"/tmp/cohort_retention_{execution_date.strftime('%Y%m%d%H')}.parquet"
    df.to_parquet(output_path, index=False)
    
    logger.info(f"Calculated retention for {len(df)} cohort-day combinations")
    return output_path


def identify_at_risk_users(**context):
    """Identify users at risk of churning"""
    ti = context['ti']
    metrics_path = ti.xcom_pull(task_ids='calculate_user_metrics')
    execution_date = context['execution_date']
    
    logger.info("Identifying at-risk users")
    
    df = pd.read_parquet(metrics_path)
    
    # Simple churn risk scoring (will be replaced by ML model)
    # Risk factors: low engagement, decreasing activity, long since last activity
    df['churn_risk_score'] = 0
    
    # Low engagement (< 20/100)
    df.loc[df['engagement_score'] < 20, 'churn_risk_score'] += 30
    
    # Few sessions (< 2)
    df.loc[df['session_count'] < 2, 'churn_risk_score'] += 25
    
    # Low event count (< 10)
    df.loc[df['event_count'] < 10, 'churn_risk_score'] += 25
    
    # Only active 1 day
    df.loc[df['active_days'] <= 1, 'churn_risk_score'] += 20
    
    # Identify high-risk users (score >= 60)
    at_risk_users = df[df['churn_risk_score'] >= 60][['user_id', 'churn_risk_score', 'engagement_score']].copy()
    at_risk_users['identified_at'] = execution_date
    at_risk_users['action_taken'] = False
    
    if len(at_risk_users) > 0:
        # Save to database for retention campaigns
        hook = PostgresHook(postgres_conn_id='analytics_db')
        hook.insert_rows(
            table='at_risk_users',
            rows=at_risk_users.to_records(index=False),
            target_fields=['user_id', 'churn_risk_score', 'engagement_score', 'identified_at', 'action_taken'],
            replace=True,
            replace_index=['user_id']
        )
        
        logger.info(f"Identified {len(at_risk_users)} at-risk users")
    else:
        logger.info("No at-risk users identified")
    
    return len(at_risk_users)


def calculate_conversion_funnels(**context):
    """Calculate conversion funnel metrics"""
    ti = context['ti']
    input_path = ti.xcom_pull(task_ids='extract_user_events')
    execution_date = context['execution_date']
    
    logger.info("Calculating conversion funnels")
    
    df = pd.read_parquet(input_path)
    
    # Define funnel steps
    funnels = {
        'registration_to_kyc': ['user_registered', 'kyc_started', 'kyc_completed'],
        'kyc_to_deposit': ['kyc_completed', 'deposit_initiated', 'deposit_completed'],
        'deposit_to_trade': ['deposit_completed', 'trade_initiated', 'trade_executed'],
        'registration_to_trade': ['user_registered', 'kyc_completed', 'deposit_completed', 'trade_executed'],
    }
    
    funnel_results = []
    
    for funnel_name, steps in funnels.items():
        # Get users who completed each step
        step_users = {}
        for step in steps:
            step_users[step] = set(df[df['event_type'] == step]['user_id'].unique())
        
        # Calculate drop-offs
        funnel_data = {'funnel_name': funnel_name, 'date': execution_date.date()}
        
        for i, step in enumerate(steps):
            funnel_data[f'step_{i+1}_users'] = len(step_users[step])
            if i > 0:
                prev_users = step_users[steps[i-1]]
                curr_users = step_users[step]
                conversion = len(curr_users) / len(prev_users) * 100 if len(prev_users) > 0 else 0
                funnel_data[f'step_{i}_to_{i+1}_conversion'] = round(conversion, 2)
        
        funnel_results.append(funnel_data)
    
    # Save funnel data
    hook = PostgresHook(postgres_conn_id='analytics_db')
    for funnel in funnel_results:
        # Construct insert query dynamically based on funnel data
        columns = ', '.join(funnel.keys())
        placeholders = ', '.join(['%s'] * len(funnel))
        values = tuple(funnel.values())
        
        query = f"""
            INSERT INTO conversion_funnels ({columns})
            VALUES ({placeholders})
            ON CONFLICT (funnel_name, date) DO UPDATE SET
                {', '.join([f'{k} = EXCLUDED.{k}' for k in funnel.keys() if k not in ['funnel_name', 'date']])}
        """
        hook.run(query, parameters=values)
    
    logger.info(f"Calculated {len(funnel_results)} conversion funnels")
    return funnel_results


def load_user_metrics(**context):
    """Load user metrics to TimescaleDB"""
    ti = context['ti']
    metrics_path = ti.xcom_pull(task_ids='calculate_user_metrics')
    
    logger.info("Loading user metrics to TimescaleDB")
    
    df = pd.read_parquet(metrics_path)
    hook = PostgresHook(postgres_conn_id='analytics_db')
    
    # Insert or update user metrics
    for _, row in df.iterrows():
        query = """
            INSERT INTO user_engagement_metrics 
            (user_id, event_count, session_count, active_days, primary_device, 
             avg_session_duration, engagement_score, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, DATE(timestamp)) DO UPDATE SET
                event_count = EXCLUDED.event_count,
                session_count = EXCLUDED.session_count,
                active_days = EXCLUDED.active_days,
                avg_session_duration = EXCLUDED.avg_session_duration,
                engagement_score = EXCLUDED.engagement_score
        """
        hook.run(query, parameters=tuple(row))
    
    logger.info(f"Loaded {len(df)} user metrics")
    return True


# Define tasks
extract_task = PythonOperator(
    task_id='extract_user_events',
    python_callable=extract_user_events,
    dag=dag,
)

metrics_task = PythonOperator(
    task_id='calculate_user_metrics',
    python_callable=calculate_user_metrics,
    dag=dag,
)

cohort_task = PythonOperator(
    task_id='calculate_cohort_retention',
    python_callable=calculate_cohort_retention,
    dag=dag,
)

at_risk_task = PythonOperator(
    task_id='identify_at_risk_users',
    python_callable=identify_at_risk_users,
    dag=dag,
)

funnel_task = PythonOperator(
    task_id='calculate_conversion_funnels',
    python_callable=calculate_conversion_funnels,
    dag=dag,
)

load_task = PythonOperator(
    task_id='load_user_metrics',
    python_callable=load_user_metrics,
    dag=dag,
)

# Define dependencies
extract_task >> [metrics_task, cohort_task, funnel_task]
metrics_task >> [at_risk_task, load_task]
