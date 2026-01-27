"""
Trading Data ETL DAG
Runs hourly to process trading events, calculate metrics, and update data warehouse
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.http.operators.http import SimpleHttpOperator
import pandas as pd
import json
import logging

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'analytics',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(minutes=30),
}

dag = DAG(
    'trading_etl',
    default_args=default_args,
    description='Extract, transform, and load trading data',
    schedule_interval='0 * * * *',  # Every hour
    catchup=False,
    tags=['etl', 'trading', 'hourly'],
)


def extract_trading_events(**context):
    """Extract trading events from operational database"""
    execution_date = context['execution_date']
    start_time = execution_date
    end_time = execution_date + timedelta(hours=1)
    
    logger.info(f"Extracting trading events from {start_time} to {end_time}")
    
    # Connect to operational database
    hook = PostgresHook(postgres_conn_id='trading_db')
    
    query = """
        SELECT 
            o.id as order_id,
            o.user_id,
            o.trading_pair,
            o.order_type,
            o.side,
            o.amount,
            o.price,
            o.filled_amount,
            o.status,
            o.created_at,
            o.updated_at,
            o.fee_amount,
            o.fee_currency,
            t.id as trade_id,
            t.executed_at,
            t.executed_price,
            t.executed_amount
        FROM orders o
        LEFT JOIN trades t ON t.order_id = o.id
        WHERE o.created_at >= %s AND o.created_at < %s
        ORDER BY o.created_at
    """
    
    df = hook.get_pandas_df(query, parameters=(start_time, end_time))
    
    # Save to XCom for next task
    output_path = f"/tmp/trading_events_{execution_date.strftime('%Y%m%d%H')}.parquet"
    df.to_parquet(output_path, index=False)
    
    logger.info(f"Extracted {len(df)} trading events")
    return output_path


def transform_trading_data(**context):
    """Transform and enrich trading data"""
    ti = context['ti']
    input_path = ti.xcom_pull(task_ids='extract_trading_events')
    execution_date = context['execution_date']
    
    logger.info(f"Transforming trading data from {input_path}")
    
    # Load data
    df = pd.read_parquet(input_path)
    
    # Data cleaning
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['executed_at'] = pd.to_datetime(df['executed_at'])
    
    # Feature engineering
    df['hour'] = df['created_at'].dt.hour
    df['day_of_week'] = df['created_at'].dt.dayofweek
    df['is_maker'] = df['order_type'] == 'limit'
    df['fill_rate'] = df['filled_amount'] / df['amount']
    
    # Calculate slippage for market orders
    df['slippage'] = 0.0
    market_orders = df['order_type'] == 'market'
    df.loc[market_orders, 'slippage'] = (
        (df.loc[market_orders, 'executed_price'] - df.loc[market_orders, 'price']) / 
        df.loc[market_orders, 'price']
    ).abs()
    
    # Aggregate metrics by trading pair and hour
    hourly_metrics = df.groupby(['trading_pair', 'hour']).agg({
        'order_id': 'count',
        'amount': 'sum',
        'executed_amount': 'sum',
        'fee_amount': 'sum',
        'slippage': 'mean',
        'fill_rate': 'mean',
    }).reset_index()
    
    hourly_metrics.columns = [
        'trading_pair', 'hour', 'order_count', 'total_amount',
        'total_executed', 'total_fees', 'avg_slippage', 'avg_fill_rate'
    ]
    hourly_metrics['date'] = execution_date.date()
    hourly_metrics['timestamp'] = execution_date
    
    # Calculate maker/taker ratios
    maker_taker = df.groupby('trading_pair').agg({
        'is_maker': lambda x: x.sum() / len(x),
    }).reset_index()
    maker_taker.columns = ['trading_pair', 'maker_ratio']
    maker_taker['taker_ratio'] = 1 - maker_taker['maker_ratio']
    maker_taker['date'] = execution_date.date()
    
    # Save transformed data
    output_path = f"/tmp/trading_metrics_{execution_date.strftime('%Y%m%d%H')}.parquet"
    hourly_metrics.to_parquet(output_path, index=False)
    
    maker_taker_path = f"/tmp/maker_taker_{execution_date.strftime('%Y%m%d%H')}.parquet"
    maker_taker.to_parquet(maker_taker_path, index=False)
    
    logger.info(f"Transformed {len(hourly_metrics)} hourly metrics")
    
    return {
        'metrics_path': output_path,
        'maker_taker_path': maker_taker_path,
    }


def load_to_clickhouse(**context):
    """Load transformed data into ClickHouse"""
    from clickhouse_driver import Client
    
    ti = context['ti']
    paths = ti.xcom_pull(task_ids='transform_trading_data')
    
    logger.info("Loading data to ClickHouse")
    
    # Connect to ClickHouse
    client = Client(
        host=context['var']['value'].get('CLICKHOUSE_HOST', 'localhost'),
        port=9000,
        database='analytics'
    )
    
    # Load hourly metrics
    df_metrics = pd.read_parquet(paths['metrics_path'])
    client.execute(
        'INSERT INTO trading_volume_hourly VALUES',
        df_metrics.to_dict('records')
    )
    
    # Load maker/taker ratios
    df_maker_taker = pd.read_parquet(paths['maker_taker_path'])
    client.execute(
        'INSERT INTO maker_taker_ratios VALUES',
        df_maker_taker.to_dict('records')
    )
    
    logger.info(f"Loaded {len(df_metrics)} records to ClickHouse")
    
    return True


def load_to_timescale(**context):
    """Load aggregated data to TimescaleDB for fast queries"""
    ti = context['ti']
    paths = ti.xcom_pull(task_ids='transform_trading_data')
    
    logger.info("Loading data to TimescaleDB")
    
    hook = PostgresHook(postgres_conn_id='analytics_db')
    
    # Load hourly metrics
    df_metrics = pd.read_parquet(paths['metrics_path'])
    
    # Convert to list of tuples for insertion
    records = [tuple(x) for x in df_metrics.to_numpy()]
    
    insert_query = """
        INSERT INTO trading_metrics_hourly 
        (trading_pair, hour, order_count, total_amount, total_executed, 
         total_fees, avg_slippage, avg_fill_rate, date, timestamp)
        VALUES %s
        ON CONFLICT (trading_pair, timestamp) DO UPDATE SET
            order_count = EXCLUDED.order_count,
            total_amount = EXCLUDED.total_amount,
            total_executed = EXCLUDED.total_executed,
            total_fees = EXCLUDED.total_fees,
            avg_slippage = EXCLUDED.avg_slippage,
            avg_fill_rate = EXCLUDED.avg_fill_rate
    """
    
    hook.insert_rows(
        table='trading_metrics_hourly',
        rows=records,
        target_fields=df_metrics.columns.tolist(),
        commit_every=1000
    )
    
    logger.info(f"Loaded {len(df_metrics)} records to TimescaleDB")
    
    return True


def upload_to_s3(**context):
    """Upload raw data to S3 data lake"""
    import boto3
    from botocore.exceptions import ClientError
    
    ti = context['ti']
    execution_date = context['execution_date']
    input_path = ti.xcom_pull(task_ids='extract_trading_events')
    
    logger.info("Uploading data to S3")
    
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        endpoint_url=context['var']['value'].get('S3_ENDPOINT'),
        aws_access_key_id=context['var']['value'].get('S3_ACCESS_KEY'),
        aws_secret_access_key=context['var']['value'].get('S3_SECRET_KEY'),
    )
    
    bucket = context['var']['value'].get('S3_BUCKET', 'analytics-data-lake')
    s3_key = f"raw/trading_events/year={execution_date.year}/month={execution_date.month:02d}/day={execution_date.day:02d}/hour={execution_date.hour:02d}/data.parquet"
    
    try:
        s3_client.upload_file(input_path, bucket, s3_key)
        logger.info(f"Uploaded to s3://{bucket}/{s3_key}")
    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise
    
    return s3_key


def calculate_derived_metrics(**context):
    """Calculate derived metrics and KPIs"""
    execution_date = context['execution_date']
    
    logger.info("Calculating derived metrics")
    
    hook = PostgresHook(postgres_conn_id='analytics_db')
    
    # Calculate volume-weighted average price (VWAP)
    vwap_query = """
        INSERT INTO trading_pair_metrics (trading_pair, date, vwap, total_volume)
        SELECT 
            trading_pair,
            date,
            SUM(total_executed * avg_price) / SUM(total_executed) as vwap,
            SUM(total_executed) as total_volume
        FROM trading_metrics_hourly
        WHERE date = %s
        GROUP BY trading_pair, date
        ON CONFLICT (trading_pair, date) DO UPDATE SET
            vwap = EXCLUDED.vwap,
            total_volume = EXCLUDED.total_volume
    """
    
    hook.run(vwap_query, parameters=(execution_date.date(),))
    
    # Calculate price volatility
    volatility_query = """
        INSERT INTO price_volatility (trading_pair, date, volatility, price_range)
        SELECT 
            trading_pair,
            date,
            STDDEV(avg_price) as volatility,
            MAX(avg_price) - MIN(avg_price) as price_range
        FROM trading_metrics_hourly
        WHERE date = %s
        GROUP BY trading_pair, date
        ON CONFLICT (trading_pair, date) DO UPDATE SET
            volatility = EXCLUDED.volatility,
            price_range = EXCLUDED.price_range
    """
    
    hook.run(volatility_query, parameters=(execution_date.date(),))
    
    logger.info("Derived metrics calculated")
    
    return True


def data_quality_check(**context):
    """Validate data quality"""
    ti = context['ti']
    paths = ti.xcom_pull(task_ids='transform_trading_data')
    
    logger.info("Running data quality checks")
    
    df = pd.read_parquet(paths['metrics_path'])
    
    # Check for null values in critical columns
    null_checks = df[['trading_pair', 'order_count', 'total_amount']].isnull().sum()
    if null_checks.any():
        raise ValueError(f"Null values found: {null_checks[null_checks > 0]}")
    
    # Check for negative values
    if (df['total_amount'] < 0).any():
        raise ValueError("Negative amounts found")
    
    # Check for outliers in slippage
    if df['avg_slippage'].max() > 0.1:  # 10% slippage threshold
        logger.warning(f"High slippage detected: {df['avg_slippage'].max()}")
    
    logger.info("Data quality checks passed")
    
    return True


# Define tasks
extract_task = PythonOperator(
    task_id='extract_trading_events',
    python_callable=extract_trading_events,
    dag=dag,
)

transform_task = PythonOperator(
    task_id='transform_trading_data',
    python_callable=transform_trading_data,
    dag=dag,
)

quality_check_task = PythonOperator(
    task_id='data_quality_check',
    python_callable=data_quality_check,
    dag=dag,
)

load_clickhouse_task = PythonOperator(
    task_id='load_to_clickhouse',
    python_callable=load_to_clickhouse,
    dag=dag,
)

load_timescale_task = PythonOperator(
    task_id='load_to_timescale',
    python_callable=load_to_timescale,
    dag=dag,
)

upload_s3_task = PythonOperator(
    task_id='upload_to_s3',
    python_callable=upload_to_s3,
    dag=dag,
)

derived_metrics_task = PythonOperator(
    task_id='calculate_derived_metrics',
    python_callable=calculate_derived_metrics,
    dag=dag,
)

# Define task dependencies
extract_task >> transform_task >> quality_check_task
quality_check_task >> [load_clickhouse_task, load_timescale_task, upload_s3_task]
[load_clickhouse_task, load_timescale_task] >> derived_metrics_task
