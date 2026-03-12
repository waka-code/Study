# AWS Kinesis

## Definición

AWS Kinesis es una familia de servicios de streaming de datos que permite recolectar, procesar y analizar datos en tiempo real a gran escala. Proporciona capacidades para ingestión de datos masivos, procesamiento de streams en tiempo real y análisis de datos continuos, siendo fundamental para aplicaciones que requieren procesamiento de flujos de datos como IoT, analytics y machine learning.

## Componentes de Kinesis

### **1. Kinesis Data Streams**
- Streaming de datos en tiempo real
- Escalabilidad automática
- Persistencia de datos
- Múltiples consumidores

### **2. Kinesis Data Firehose**
- Ingestión simplificada
- Transformación automática
- Entrega a múltiples destinos
- Serverless y fully managed

### **3. Kinesis Data Analytics**
- Procesamiento SQL en tiempo real
- Transformación de streams
- Análisis continuo
- Integración con ML

### **4. Kinesis Video Streams**
- Streaming de video
- Procesamiento de video
- Almacenamiento y análisis
- Aplicaciones de video en vivo

## Kinesis Data Streams

### **Creación de Stream**
```bash
# Crear stream básico
aws kinesis create-stream \
  --stream-name my-data-stream \
  --shard-count 2

# Crear stream con enhanced fan-out
aws kinesis create-stream \
  --stream-name my-enhanced-stream \
  --shard-count 2 \
  --stream-mode-details StreamMode=ON_DEMAND

# Verificar estado del stream
aws kinesis describe-stream \
  --stream-name my-data-stream

# Listar streams
aws kinesis list-streams
```

### **Productor de Datos**
```python
import boto3
import json
import time
from datetime import datetime

class KinesisProducer:
    def __init__(self, stream_name):
        self.kinesis = boto3.client('kinesis')
        self.stream_name = stream_name
    
    def put_record(self, data, partition_key=None):
        """Enviar un registro al stream"""
        
        try:
            if partition_key is None:
                partition_key = str(time.time())
            
            response = self.kinesis.put_record(
                StreamName=self.stream_name,
                Data=json.dumps(data),
                PartitionKey=partition_key
            )
            
            return {
                'success': True,
                'sequence_number': response['SequenceNumber'],
                'shard_id': response['ShardId']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_records(self, records):
        """Enviar múltiples registros en batch"""
        
        records_batch = []
        
        for record in records:
            records_batch.append({
                'Data': json.dumps(record['data']),
                'PartitionKey': record.get('partition_key', str(time.time()))
            })
        
        try:
            response = self.kinesis.put_records(
                StreamName=self.stream_name,
                Records=records_batch
            )
            
            return {
                'success': True,
                'failed_count': response['FailedRecordCount'],
                'records': response['Records']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_sensor_data(self, sensor_id, measurements):
        """Enviar datos de sensores"""
        
        data = {
            'sensor_id': sensor_id,
            'timestamp': datetime.utcnow().isoformat(),
            'measurements': measurements,
            'source': 'iot-sensor'
        }
        
        return self.put_record(data, sensor_id)
    
    def send_log_data(self, application, log_level, message):
        """Enviar logs de aplicación"""
        
        data = {
            'application': application,
            'log_level': log_level,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'application-log'
        }
        
        return self.put_record(data, application)
    
    def send_metric_data(self, service, metric_name, value, unit):
        """Enviar métricas"""
        
        data = {
            'service': service,
            'metric_name': metric_name,
            'value': value,
            'unit': unit,
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'metric'
        }
        
        return self.put_record(data, f"{service}-{metric_name}")
```

### **Consumidor de Datos**
```python
import boto3
import json
import time
from datetime import datetime

class KinesisConsumer:
    def __init__(self, stream_name):
        self.kinesis = boto3.client('kinesis')
        self.stream_name = stream_name
    
    def get_shard_iterator(self, shard_id, iterator_type='LATEST'):
        """Obtener iterator para shard"""
        
        try:
            response = self.kinesis.get_shard_iterator(
                StreamName=self.stream_name,
                ShardId=shard_id,
                ShardIteratorType=iterator_type
            )
            
            return response['ShardIterator']
            
        except Exception as e:
            print(f"Error getting shard iterator: {e}")
            return None
    
    def get_records(self, shard_iterator, limit=10):
        """Obtener registros del stream"""
        
        try:
            response = self.kinesis.get_records(
                ShardIterator=shard_iterator,
                Limit=limit
            )
            
            records = response['Records']
            next_iterator = response.get('NextShardIterator')
            
            return {
                'records': records,
                'next_iterator': next_iterator,
                'millis_behind_latest': response.get('MillisBehindLatest', 0)
            }
            
        except Exception as e:
            print(f"Error getting records: {e}")
            return {
                'records': [],
                'next_iterator': None,
                'millis_behind_latest': 0
            }
    
    def process_records(self, records):
        """Procesar registros recibidos"""
        
        processed_count = 0
        errors = 0
        
        for record in records:
            try:
                # Decodificar datos
                data = json.loads(record['Data'].decode('utf-8'))
                
                # Procesar según tipo de dato
                source = data.get('source', 'unknown')
                
                if source == 'iot-sensor':
                    result = self.process_sensor_data(data)
                elif source == 'application-log':
                    result = self.process_log_data(data)
                elif source == 'metric':
                    result = self.process_metric_data(data)
                else:
                    result = self.process_generic_data(data)
                
                if result['success']:
                    processed_count += 1
                else:
                    errors += 1
                    print(f"Error processing record: {result['error']}")
                
            except Exception as e:
                errors += 1
                print(f"Error decoding record: {e}")
        
        return {
            'processed': processed_count,
            'errors': errors,
            'total': len(records)
        }
    
    def process_sensor_data(self, data):
        """Procesar datos de sensores"""
        
        try:
            sensor_id = data['sensor_id']
            measurements = data['measurements']
            
            # Validar datos
            if not measurements:
                return {'success': False, 'error': 'No measurements found'}
            
            # Procesar mediciones
            processed_measurements = []
            for measurement in measurements:
                # Validar rango
                if 'temperature' in measurement:
                    temp = measurement['temperature']
                    if temp < -50 or temp > 100:
                        measurement['status'] = 'invalid_range'
                    else:
                        measurement['status'] = 'valid'
                
                processed_measurements.append(measurement)
            
            # Almacenar en base de datos (simulación)
            self.store_sensor_readings(sensor_id, processed_measurements)
            
            # Enviar alertas si es necesario
            self.check_sensor_alerts(sensor_id, processed_measurements)
            
            return {
                'success': True,
                'sensor_id': sensor_id,
                'processed_measurements': len(processed_measurements)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def process_log_data(self, data):
        """Procesar logs de aplicación"""
        
        try:
            application = data['application']
            log_level = data['log_level']
            message = data['message']
            
            # Parsear log (simulación)
            parsed_log = {
                'application': application,
                'level': log_level,
                'message': message,
                'timestamp': data['timestamp']
            }
            
            # Enviar a sistema de logging
            self.send_to_logging_system(parsed_log)
            
            # Alertar para logs de error
            if log_level in ['ERROR', 'CRITICAL']:
                self.send_log_alert(parsed_log)
            
            return {
                'success': True,
                'application': application,
                'level': log_level
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def process_metric_data(self, data):
        """Procesar métricas"""
        
        try:
            service = data['service']
            metric_name = data['metric_name']
            value = data['value']
            unit = data['unit']
            
            # Enviar a sistema de métricas
            self.send_to_metrics_system(data)
            
            # Verificar umbrales
            self.check_metric_thresholds(service, metric_name, value)
            
            return {
                'success': True,
                'service': service,
                'metric': metric_name,
                'value': value
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def start_consuming(self, shard_ids=None):
        """Iniciar consumo continuo"""
        
        if shard_ids is None:
            # Obtener shards del stream
            response = self.kinesis.describe_stream(StreamName=self.stream_name)
            shard_ids = [shard['ShardId'] for shard in response['StreamDescription']['Shards']]
        
        shard_iterators = {}
        
        # Inicializar iterators
        for shard_id in shard_ids:
            iterator = self.get_shard_iterator(shard_id)
            if iterator:
                shard_iterators[shard_id] = iterator
        
        print(f"Starting consumption from {len(shard_ids)} shards")
        
        while True:
            for shard_id, iterator in shard_iterators.items():
                if iterator is None:
                    # Reintentar obtener iterator
                    iterator = self.get_shard_iterator(shard_id)
                    shard_iterators[shard_id] = iterator
                    continue
                
                # Obtener registros
                result = self.get_records(iterator)
                
                if result['records']:
                    # Procesar registros
                    process_result = self.process_records(result['records'])
                    
                    print(f"Shard {shard_id}: {process_result}")
                
                # Actualizar iterator
                shard_iterators[shard_id] = result['next_iterator']
                
                # Pequeña pausa para evitar throttling
                time.sleep(0.1)
    
    def store_sensor_readings(self, sensor_id, measurements):
        """Almacenar lecturas de sensores"""
        # En producción, esto guardaría en base de datos
        print(f"Storing {len(measurements)} readings for sensor {sensor_id}")
    
    def check_sensor_alerts(self, sensor_id, measurements):
        """Verificar alertas de sensores"""
        for measurement in measurements:
            if measurement.get('status') == 'invalid_range':
                print(f"ALERT: Invalid range for sensor {sensor_id}")
    
    def send_to_logging_system(self, log_data):
        """Enviar a sistema de logging"""
        print(f"Log: {log_data['application']} - {log_data['level']}")
    
    def send_log_alert(self, log_data):
        """Enviar alerta de log"""
        print(f"LOG ALERT: {log_data['application']} - {log_data['message']}")
    
    def send_to_metrics_system(self, metric_data):
        """Enviar a sistema de métricas"""
        print(f"Metric: {metric_data['service']}.{metric_data['metric_name']} = {metric_data['value']}")
    
    def check_metric_thresholds(self, service, metric_name, value):
        """Verificar umbrales de métricas"""
        # Simulación de verificación de umbrales
        if metric_name == 'cpu_usage' and value > 90:
            print(f"METRIC ALERT: High CPU usage in {service}: {value}%")
```

## Kinesis Data Firehose

### **Creación de Delivery Stream**
```bash
# Crear delivery stream para S3
aws firehose create-delivery-stream \
  --delivery-stream-name my-firehose-stream \
  --s3-destination-configuration file://s3-config.json

# s3-config.json
{
  "RoleARN": "arn:aws:iam::123456789012:role/firehose-delivery-role",
  "BucketARN": "arn:aws:s3:::my-firehose-bucket",
  "Prefix": "data/",
  "BufferingHints": {
    "SizeInMBs": 5,
    "IntervalInSeconds": 300
  },
  "CompressionFormat": "GZIP",
  "CloudWatchLoggingOptions": {
    "Enabled": true,
    "LogGroupName": "/aws/kinesisfirehose/my-stream",
    "LogStreamName": "delivery"
  }
}

# Crear delivery stream para Redshift
aws firehose create-delivery-stream \
  --delivery-stream-name my-redshift-stream \
  --redshift-destination-configuration file://redshift-config.json
```

### **Configuración Avanzada**
```python
import boto3
import json

class FirehoseManager:
    def __init__(self):
        self.firehose = boto3.client('firehose')
    
    def create_s3_stream(self, stream_name, bucket_config, processing_config=None):
        """Crear delivery stream para S3"""
        
        config = {
            'DeliveryStreamName': stream_name,
            'S3DestinationConfiguration': {
                'RoleARN': bucket_config['role_arn'],
                'BucketARN': f"arn:aws:s3:::{bucket_config['bucket_name']}",
                'Prefix': bucket_config.get('prefix', ''),
                'ErrorOutputPrefix': bucket_config.get('error_prefix', 'errors/'),
                'BufferingHints': {
                    'SizeInMBs': bucket_config.get('buffer_size_mb', 5),
                    'IntervalInSeconds': bucket_config.get('buffer_interval_seconds', 300)
                },
                'CompressionFormat': bucket_config.get('compression', 'UNCOMPRESSED'),
                'CloudWatchLoggingOptions': {
                    'Enabled': True,
                    'LogGroupName': f"/aws/kinesisfirehose/{stream_name}",
                    'LogStreamName': 'delivery'
                }
            }
        }
        
        # Añadir configuración de procesamiento si se especifica
        if processing_config:
            config['S3DestinationConfiguration']['ProcessingConfiguration'] = processing_config
        
        try:
            response = self.firehose.create_delivery_stream(**config)
            return {
                'success': True,
                'stream_arn': response['DeliveryStreamARN']
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_lambda_processor(self, lambda_config):
        """Crear configuración de procesamiento Lambda"""
        
        return {
            'Enabled': True,
            'ProcessorType': 'Lambda',
            'Parameters': {
                'LambdaArn': lambda_config['function_arn'],
                'NumberOfRetries': lambda_config.get('retries', 3),
                'BufferIntervalInSeconds': lambda_config.get('buffer_interval', 5),
                'BufferSizeInMBs': lambda_config.get('buffer_size', 3)
            }
        }
    
    def put_record(self, stream_name, record):
        """Enviar registro a Firehose"""
        
        try:
            response = self.firehose.put_record(
                DeliveryStreamName=stream_name,
                Record={'Data': json.dumps(record)}
            )
            
            return {
                'success': True,
                'record_id': response['RecordId']
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_record_batch(self, stream_name, records):
        """Enviar múltiples registros"""
        
        records_batch = []
        
        for record in records:
            records_batch.append({'Data': json.dumps(record)})
        
        try:
            response = self.firehose.put_record_batch(
                DeliveryStreamName=stream_name,
                Records=records_batch
            )
            
            return {
                'success': True,
                'failed_count': response['FailedPutCount'],
                'request_responses': response['RequestResponses']
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Kinesis Data Analytics

### **Creación de Application**
```bash
# Crear aplicación de analytics
aws kinesisanalytics create-application \
  --name my-analytics-app \
  --runtime SQL-1.0 \
  --inputs file://input-config.json

# input-config.json
{
  "NamePrefix": "SOURCE_SQL_STREAM",
  "InputSchema": {
    "RecordFormat": {
      "RecordFormatType": "JSON",
      "MappingParameters": {
        "JSONMappingParameters": {
          "RecordRowPath": "$"
        }
      }
    },
    "RecordEncoding": "UTF-8"
  },
  "KinesisStreamsInput": {
    "ResourceARN": "arn:aws:kinesis:us-east-1:123456789012:stream/my-data-stream",
    "RoleARN": "arn:aws:iam::123456789012:role/kinesis-analytics-role"
  }
}

# Añir SQL a la aplicación
aws kinesisanalytics add-application-sql \
  --application-name my-analytics-app \
  --application-sql-configuration file://sql-config.json

# sql-config.json
{
  "SQL": "CREATE OR REPLACE STREAM \"DESTINATION_SQL_STREAM\" (sensor_id VARCHAR, temperature REAL, humidity REAL, timestamp TIMESTAMP); INSERT INTO \"DESTINATION_SQL_STREAM\" SELECT sensor_id, CAST(measurements[0].temperature AS REAL) as temperature, CAST(measurements[0].humidity AS REAL) as humidity, timestamp FROM SOURCE_SQL_STREAM WHERE source = 'iot-sensor';"
}
```

### **Procesamiento SQL en Tiempo Real**
```python
class KinesisAnalytics:
    def __init__(self):
        self.analytics = boto3.client('kinesisanalytics')
    
    def create_real_time_aggregation_app(self, app_name, stream_arn):
        """Crear aplicación para agregación en tiempo real"""
        
        # Crear aplicación
        response = self.analytics.create_application(
            Name=app_name,
            Runtime='SQL-1.0',
            Inputs={
                'NamePrefix': 'SOURCE_STREAM',
                'InputSchema': {
                    'RecordFormat': {
                        'RecordFormatType': 'JSON',
                        'MappingParameters': {
                            'JSONMappingParameters': {
                                'RecordRowPath': '$'
                            }
                        }
                    },
                    'RecordEncoding': 'UTF-8'
                },
                'KinesisStreamsInput': {
                    'ResourceARN': stream_arn,
                    'RoleARN': 'arn:aws:iam::123456789012:role/kinesis-analytics-role'
                }
            }
        )
        
        # Configurar SQL para agregación
        sql_query = """
        CREATE OR REPLACE STREAM "AGGREGATED_STREAM" (
            sensor_id VARCHAR,
            avg_temperature REAL,
            max_temperature REAL,
            min_temperature REAL,
            count_readings INTEGER,
            window_start TIMESTAMP,
            window_end TIMESTAMP
        );
        
        INSERT INTO "AGGREGATED_STREAM"
        SELECT 
            sensor_id,
            AVG(CAST(measurements[0].temperature AS REAL)) as avg_temperature,
            MAX(CAST(measurements[0].temperature AS REAL)) as max_temperature,
            MIN(CAST(measurements[0].temperature AS REAL)) as min_temperature,
            COUNT(*) as count_readings,
            MIN("ROWTIME") as window_start,
            MAX("ROWTIME") as window_end
        FROM "SOURCE_STREAM"
        WHERE source = 'iot-sensor'
        GROUP BY sensor_id, FLOOR("ROWTIME" TO MINUTE);
        """
        
        self.analytics.add_application_sql(
            ApplicationName=app_name,
            ApplicationSQLConfiguration={
                'SQL': sql_query
            }
        )
        
        # Configurar output
        self.analytics.add_application_output(
            ApplicationName=app_name,
            CurrentApplicationVersionId=1,
            Output={
                'Name': 'AGGREGATED_OUTPUT',
                'KinesisStreamsOutput': {
                    'ResourceARN': 'arn:aws:kinesis:us-east-1:123456789012:stream/aggregated-data',
                    'RoleARN': 'arn:aws:iam::123456789012:role/kinesis-analytics-role'
                },
                'DestinationSchema': {
                    'RecordFormatType': 'JSON'
                }
            }
        )
        
        return response['ApplicationSummary']['ApplicationARN']
    
    def start_application(self, app_name):
        """Iniciar aplicación de analytics"""
        
        try:
            response = self.analytics.start_application(
                ApplicationName=app_name,
                InputConfigurations=[
                    {
                        'Id': '1.1',
                        'InputStartingPositionConfiguration': {
                            'InputStartingPosition': 'NOW'
                        }
                    }
                ]
            )
            
            return {
                'success': True,
                'application_name': app_name
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_application(self, app_name):
        """Detener aplicación de analytics"""
        
        try:
            self.analytics.stop_application(ApplicationName=app_name)
            
            return {
                'success': True,
                'application_name': app_name
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Kinesis Video Streams

### **Creación de Video Stream**
```bash
# Crear stream de video
aws kinesisvideo create-stream \
  --stream-name my-video-stream \
  --data-retention-in-hours 24

# Obtener endpoint para streaming
aws kinesisvideo get-data-endpoint \
  --stream-name my-video-stream \
  --api-name PUT_MEDIA

# Listar streams
aws kinesisvideo list-streams
```

### **Productor de Video**
```python
import boto3
import json
import time

class KinesisVideoProducer:
    def __init__(self, stream_name):
        self.kinesisvideo = boto3.client('kinesisvideo')
        self.stream_name = stream_name
    
    def get_stream_endpoint(self, api_name='PUT_MEDIA'):
        """Obtener endpoint para el stream"""
        
        try:
            response = self.kinesisvideo.get_data_endpoint(
                StreamName=self.stream_name,
                ApiName=api_name
            )
            
            return response['DataEndpoint']
        
        except Exception as e:
            print(f"Error getting endpoint: {e}")
            return None
    
    def start_video_streaming(self, video_source):
        """Iniciar streaming de video"""
        
        endpoint = self.get_stream_endpoint()
        if not endpoint:
            return {'success': False, 'error': 'Could not get endpoint'}
        
        # Crear cliente para el endpoint
        kinesis_video = boto3.client(
            'kinesisvideo',
            endpoint_url=endpoint
        )
        
        try:
            # Simular streaming de video
            print(f"Starting video streaming to {self.stream_name}")
            
            # En producción, aquí se enviarían frames de video
            for i in range(100):
                frame_data = self.generate_frame_data(i)
                
                # Enviar frame (simulación)
                kinesis_video.put_media(
                    StreamName=self.stream_name,
                    Payload=frame_data
                )
                
                time.sleep(0.1)  # 10 FPS
            
            return {
                'success': True,
                'frames_sent': 100
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_frame_data(self, frame_number):
        """Generar datos de frame (simulación)"""
        
        # En producción, esto sería datos de video reales
        frame_data = {
            'frame_number': frame_number,
            'timestamp': time.time(),
            'data': f"frame_{frame_number}_data"
        }
        
        return json.dumps(frame_data).encode('utf-8')
```

## Casos de Uso

### **1. IoT Data Pipeline**
```python
class IoTDataPipeline:
    def __init__(self):
        self.producer = KinesisProducer('iot-data-stream')
        self.consumer = KinesisConsumer('iot-data-stream')
        self.firehose = FirehoseManager()
    
    def setup_pipeline(self):
        """Configurar pipeline completo de IoT"""
        
        # Crear stream principal
        stream_response = self.create_iot_stream()
        
        # Crear stream procesado
        processed_stream = self.create_processed_stream()
        
        # Configurar Firehose para almacenamiento
        firehose_response = self.firehose.create_s3_stream(
            'iot-firehose-stream',
            {
                'bucket_name': 'iot-data-lake',
                'prefix': 'raw-data/',
                'role_arn': 'arn:aws:iam::123456789012:role/firehose-role'
            }
        )
        
        # Crear aplicación de analytics
        analytics_response = self.create_analytics_app(stream_response['stream_arn'])
        
        return {
            'stream': stream_response,
            'processed_stream': processed_stream,
            'firehose': firehose_response,
            'analytics': analytics_response
        }
    
    def create_iot_stream(self):
        """Crear stream para datos IoT"""
        
        try:
            client = boto3.client('kinesis')
            response = client.create_stream(
                StreamName='iot-data-stream',
                ShardCount=2
            )
            
            return {
                'success': True,
                'stream_arn': f"arn:aws:kinesis:us-east-1:123456789012:stream/iot-data-stream"
            }
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_processed_stream(self):
        """Crear stream para datos procesados"""
        
        try:
            client = boto3.client('kinesis')
            response = client.create_stream(
                StreamName='processed-iot-stream',
                ShardCount=1
            )
            
            return {
                'success': True,
                'stream_arn': f"arn:aws:kinesis:us-east-1:123456789012:stream/processed-iot-stream"
            }
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def create_analytics_app(self, stream_arn):
        """Crear aplicación de analytics"""
        
        analytics = KinesisAnalytics()
        return analytics.create_real_time_aggregation_app(
            'iot-analytics-app',
            stream_arn
        )
    
    def process_iot_data(self, sensor_data):
        """Procesar datos de IoT"""
        
        # Enviar datos crudos
        raw_result = self.producer.send_sensor_data(
            sensor_data['sensor_id'],
            sensor_data['measurements']
        )
        
        # Procesamiento adicional
        processed_data = self.enrich_sensor_data(sensor_data)
        
        # Enviar datos procesados
        processed_producer = KinesisProducer('processed-iot-stream')
        processed_result = processed_producer.put_record(
            processed_data,
            sensor_data['sensor_id']
        )
        
        return {
            'raw_result': raw_result,
            'processed_result': processed_result
        }
    
    def enrich_sensor_data(self, sensor_data):
        """ Enriquecer datos de sensores"""
        
        enriched = sensor_data.copy()
        
        # Añadir metadata
        enriched['processed_at'] = datetime.utcnow().isoformat()
        enriched['location'] = self.get_sensor_location(sensor_data['sensor_id'])
        enriched['device_type'] = self.get_device_type(sensor_data['sensor_id'])
        
        # Calcular métricas derivadas
        if 'temperature' in sensor_data['measurements'][0]:
            temp = sensor_data['measurements'][0]['temperature']
            enriched['temperature_status'] = self.classify_temperature(temp)
        
        return enriched
    
    def get_sensor_location(self, sensor_id):
        """Obtener ubicación del sensor"""
        # Simulación de lookup
        locations = {
            'sensor_001': 'warehouse_a',
            'sensor_002': 'warehouse_b',
            'sensor_003': 'office_floor_1'
        }
        return locations.get(sensor_id, 'unknown')
    
    def get_device_type(self, sensor_id):
        """Obtener tipo de dispositivo"""
        # Simulación de lookup
        types = {
            'sensor_001': 'temperature_humidity',
            'sensor_002': 'temperature_humidity',
            'sensor_003': 'air_quality'
        }
        return types.get(sensor_id, 'unknown')
    
    def classify_temperature(self, temperature):
        """Clasificar temperatura"""
        if temperature < 0:
            return 'freezing'
        elif temperature < 15:
            return 'cold'
        elif temperature < 25:
            return 'normal'
        elif temperature < 35:
            return 'warm'
        else:
            return 'hot'
```

### **2. Real-time Analytics Dashboard**
```python
class RealTimeAnalytics:
    def __init__(self):
        self.producer = KinesisProducer('analytics-events')
        self.consumer = KinesisConsumer('analytics-events')
        self.analytics = KinesisAnalytics()
    
    def setup_analytics_pipeline(self):
        """Configurar pipeline de analytics en tiempo real"""
        
        # Crear stream de eventos
        self.create_event_stream()
        
        # Crear aplicación de analytics
        app_arn = self.analytics.create_real_time_aggregation_app(
            'realtime-analytics',
            'arn:aws:kinesis:us-east-1:123456789012:stream/analytics-events'
        )
        
        # Configurar dashboard
        self.setup_dashboard()
        
        return app_arn
    
    def create_event_stream(self):
        """Crear stream de eventos"""
        
        try:
            client = boto3.client('kinesis')
            client.create_stream(
                StreamName='analytics-events',
                ShardCount=3
            )
            
            return True
        
        except Exception as e:
            print(f"Error creating event stream: {e}")
            return False
    
    def track_user_event(self, user_id, event_type, event_data):
        """Rastrear evento de usuario"""
        
        event = {
            'user_id': user_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': datetime.utcnow().isoformat(),
            'session_id': event_data.get('session_id'),
            'ip_address': event_data.get('ip_address'),
            'user_agent': event_data.get('user_agent')
        }
        
        return self.producer.put_record(event, user_id)
    
    def track_metric_event(self, service, metric_name, value, dimensions=None):
        """Rastrear métrica"""
        
        event = {
            'service': service,
            'metric_name': metric_name,
            'value': value,
            'dimensions': dimensions or {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return self.producer.put_record(event, f"{service}-{metric_name}")
    
    def setup_dashboard(self):
        """Configurar dashboard de métricas"""
        
        # En producción, esto configuraría CloudWatch dashboards
        print("Setting up real-time dashboard...")
        
        # Métricas a trackear
        metrics = [
            'user_sessions',
            'page_views',
            'api_requests',
            'error_rate',
            'response_time'
        ]
        
        for metric in metrics:
            print(f"Dashboard metric configured: {metric}")
```

## Monitoring y Métricas

### **CloudWatch Metrics para Kinesis**
```python
class KinesisMonitoring:
    def __init__(self, stream_name):
        self.cloudwatch = boto3.client('cloudwatch')
        self.stream_name = stream_name
    
    def get_stream_metrics(self):
        """Obtener métricas del stream"""
        
        metrics = [
            'IncomingBytes',
            'IncomingRecords',
            'ReadProvisionedThroughputExceeded',
            'WriteProvisionedThroughputExceeded',
            'IteratorAgeMilliseconds',
            'GetRecords.Latency'
        ]
        
        results = {}
        
        for metric in metrics:
            try:
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/Kinesis',
                    MetricName=metric,
                    Dimensions=[
                        {
                            'Name': 'StreamName',
                            'Value': self.stream_name
                        }
                    ],
                    StartTime=datetime.utcnow() - timedelta(hours=1),
                    EndTime=datetime.utcnow(),
                    Period=300,
                    Statistics=['Average', 'Sum', 'Maximum']
                )
                
                if response['Datapoints']:
                    results[metric] = response['Datapoints'][-1]
                
            except Exception as e:
                print(f"Error getting metric {metric}: {e}")
        
        return results
    
    def setup_stream_alarms(self):
        """Configurar alarmas para el stream"""
        
        alarms = [
            {
                'name': f'{self.stream_name}-HighLatency',
                'metric': 'IteratorAgeMilliseconds',
                'threshold': 300000,  # 5 minutes
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'{self.stream_name}-ReadThrottling',
                'metric': 'ReadProvisionedThroughputExceeded',
                'threshold': 1,
                'comparison': 'GreaterThanThreshold'
            },
            {
                'name': f'{self.stream_name}-WriteThrottling',
                'metric': 'WriteProvisionedThroughputExceeded',
                'threshold': 1,
                'comparison': 'GreaterThanThreshold'
            }
        ]
        
        for alarm in alarms:
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm['name'],
                AlarmDescription=f'Alarm for {self.stream_name}',
                MetricName=alarm['metric'],
                Namespace='AWS/Kinesis',
                Dimensions=[
                    {
                        'Name': 'StreamName',
                        'Value': self.stream_name
                    }
                ],
                Statistic='Average',
                Period=300,
                EvaluationPeriods=2,
                Threshold=alarm['threshold'],
                ComparisonOperator=alarm['comparison'],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:kinesis-alerts'
                ]
            )
```

## Best Practices

### **1. Diseño de Streams**
- Elegir número apropiado de shards
- Usar partition keys efectivas
- Configurar retención apropiada
- Considerar enhanced fan-out para múltiples consumidores

### **2. Procesamiento de Datos**
- Implementar retry con backoff
- Manejar errores gracefully
- Procesar en batches cuando sea posible
- Monitorizar lag del consumidor

### **3. Security**
- Usar IAM roles específicos
- Encriptar datos sensibles
- Usar VPC endpoints cuando sea necesario
- Implementar logging y auditoría

### **4. Performance**
- Optimizar tamaño de registros
- Usar put_records para batch operations
- Configurar apropiado buffering en Firehose
- Monitorizar métricas clave

## Cost Management

### **Pricing Components**
- **Data Streams**: Shard hours + PUT payload units
- **Firehose**: Volume-based pricing
- **Data Analytics**: Application hours + KPU hours
- **Video Streams**: Storage hours + ingest hours

### **Cost Optimization**
```python
def calculate_kinesis_costs(shard_count, hours_per_month, put_units_gb, firehose_gb):
    """Calcular costos de Kinesis"""
    
    # Data Streams cost
    shard_cost = shard_count * hours_per_month * 0.015  # $0.015 per shard hour
    put_cost = put_units_gb * 0.014  # $0.014 per million PUT units
    
    # Firehose cost
    firehose_cost = firehose_gb * 0.015  # $0.015 per GB
    
    total_cost = shard_cost + put_cost + firehose_cost
    
    return {
        'shard_cost': shard_cost,
        'put_cost': put_cost,
        'firehose_cost': firehose_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS Kinesis es fundamental para aplicaciones que requieren procesamiento de datos en tiempo real a gran escala. Proporciona una suite completa de servicios para ingestión, procesamiento y análisis de streams de datos, siendo ideal para IoT, analytics, machine learning y aplicaciones que necesitan procesar flujos de datos continuos con baja latencia y alta escalabilidad.
