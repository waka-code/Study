# AWS CloudWatch

## Definición

AWS CloudWatch es un servicio de monitoring y observabilidad que proporciona datos y actionable insights para monitorizar aplicaciones, responder a cambios de rendimiento, optimizar el uso de recursos y mantener la salud operativa de la infraestructura en AWS. Ofrece una visión unificada de los recursos y aplicaciones, permitiendo recolectar, acceder y analizar datos operativos en tiempo real.

## Características Principales

### 1. **Métricas y Monitoring**
- Métricas personalizadas y estándar
- Monitoring en tiempo real
- Alarms automáticas
- Dashboards personalizables

### 2. **Logs y Log Analysis**
- CloudWatch Logs
- Log Insights
- Log aggregation
- Log filtering y searching

### 3. **Events y Automation**
- CloudWatch Events
- EventBridge integration
- Automated responses
- Rule-based triggers

### 4. **Application Performance**
- Distributed tracing
- Application monitoring
- Performance insights
- Service maps

## Componentes Clave

### **CloudWatch Metrics**
- Métricas estándar de AWS
- Métricas personalizadas
- Dimensiones
- Statistics y percentiles

### **CloudWatch Alarms**
- Threshold-based alarms
- Anomaly detection
- Auto scaling triggers
- Notification actions

### **CloudWatch Logs**
- Log collection
- Log aggregation
- Log retention
- Log analysis

### **CloudWatch Dashboards**
- Visualizaciones personalizadas
- Widgets múltiples
- Real-time updates
- Shared dashboards

## Métricas y Monitoring

### **Métricas Estándar**
```python
import boto3
import time
from datetime import datetime, timedelta

class CloudWatchMetrics:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
    
    def put_custom_metric(self, namespace, metric_name, value, dimensions=None, unit='Count'):
        """Enviar métrica personalizada"""
        
        try:
            metric_data = {
                'Namespace': namespace,
                'MetricData': [
                    {
                        'MetricName': metric_name,
                        'Value': value,
                        'Unit': unit,
                        'Timestamp': datetime.utcnow()
                    }
                ]
            }
            
            if dimensions:
                metric_data['MetricData'][0]['Dimensions'] = dimensions
            
            response = self.cloudwatch.put_metric_data(**metric_data)
            
            return {
                'success': True,
                'metric': f"{namespace}/{metric_name}",
                'value': value
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_batch_metrics(self, namespace, metrics):
        """Enviar múltiples métricas en batch"""
        
        try:
            metric_data = {
                'Namespace': namespace,
                'MetricData': []
            }
            
            for metric in metrics:
                metric_entry = {
                    'MetricName': metric['name'],
                    'Value': metric['value'],
                    'Unit': metric.get('unit', 'Count'),
                    'Timestamp': datetime.utcnow()
                }
                
                if metric.get('dimensions'):
                    metric_entry['Dimensions'] = metric['dimensions']
                
                metric_data['MetricData'].append(metric_entry)
            
            response = self.cloudwatch.put_metric_data(**metric_data)
            
            return {
                'success': True,
                'metrics_sent': len(metrics),
                'namespace': namespace
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_metric_statistics(self, namespace, metric_name, dimensions=None, 
                           start_time=None, end_time=None, period=300, 
                           statistics=['Average', 'Sum', 'Maximum']):
        """Obtener estadísticas de métrica"""
        
        try:
            if start_time is None:
                start_time = datetime.utcnow() - timedelta(hours=24)
            
            if end_time is None:
                end_time = datetime.utcnow()
            
            params = {
                'Namespace': namespace,
                'MetricName': metric_name,
                'StartTime': start_time,
                'EndTime': end_time,
                'Period': period,
                'Statistics': statistics
            }
            
            if dimensions:
                params['Dimensions'] = dimensions
            
            response = self.cloudwatch.get_metric_statistics(**params)
            
            return {
                'success': True,
                'datapoints': response['Datapoints'],
                'label': response['Label']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_instance_metrics(self, instance_id, hours=1):
        """Obtener métricas de instancia EC2"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)
            
            metrics = {
                'CPUUtilization': {},
                'NetworkIn': {},
                'NetworkOut': {},
                'DiskReadOps': {},
                'DiskWriteOps': {}
            }
            
            dimensions = [
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ]
            
            for metric_name in metrics.keys():
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/EC2',
                    MetricName=metric_name,
                    Dimensions=dimensions,
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Average', 'Maximum']
                )
                
                metrics[metric_name] = response['Datapoints']
            
            return {
                'success': True,
                'instance_id': instance_id,
                'metrics': metrics,
                'time_range': f"Last {hours} hours"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_lambda_metrics(self, function_name, hours=1):
        """Obtener métricas de función Lambda"""
        
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)
            
            metrics = {
                'Invocations': {},
                'Errors': {},
                'Duration': {},
                'Throttles': {},
                'IteratorAge': {}
            }
            
            dimensions = [
                {
                    'Name': 'FunctionName',
                    'Value': function_name
                }
            ]
            
            for metric_name in metrics.keys():
                response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/Lambda',
                    MetricName=metric_name,
                    Dimensions=dimensions,
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Sum', 'Average', 'Maximum']
                )
                
                metrics[metric_name] = response['Datapoints']
            
            return {
                'success': True,
                'function_name': function_name,
                'metrics': metrics,
                'time_range': f"Last {hours} hours"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **Application Performance Monitoring**
```python
class ApplicationMonitoring:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.xray = boto3.client('xray')
    
    def track_application_metrics(self, app_name, metrics_data):
        """Rastrear métricas de aplicación"""
        
        namespace = f'Application/{app_name}'
        
        # Métricas de performance
        performance_metrics = [
            {
                'name': 'ResponseTime',
                'value': metrics_data['response_time'],
                'unit': 'Milliseconds',
                'dimensions': [
                    {'Name': 'Application', 'Value': app_name},
                    {'Name': 'Endpoint', 'Value': metrics_data['endpoint']}
                ]
            },
            {
                'name': 'RequestCount',
                'value': metrics_data['request_count'],
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Application', 'Value': app_name},
                    {'Name': 'Endpoint', 'Value': metrics_data['endpoint']}
                ]
            },
            {
                'name': 'ErrorRate',
                'value': metrics_data['error_rate'],
                'unit': 'Percent',
                'dimensions': [
                    {'Name': 'Application', 'Value': app_name},
                    {'Name': 'Endpoint', 'Value': metrics_data['endpoint']}
                ]
            }
        ]
        
        # Métricas de negocio
        business_metrics = [
            {
                'name': 'ActiveUsers',
                'value': metrics_data['active_users'],
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Application', 'Value': app_name}
                ]
            },
            {
                'name': 'TransactionsPerSecond',
                'value': metrics_data['tps'],
                'unit': 'Count/Second',
                'dimensions': [
                    {'Name': 'Application', 'Value': app_name}
                ]
            }
        ]
        
        # Enviar métricas de performance
        performance_result = self.cloudwatch.put_metric_data(
            Namespace=namespace,
            MetricData=performance_metrics
        )
        
        # Enviar métricas de negocio
        business_result = self.cloudwatch.put_metric_data(
            Namespace=namespace,
            MetricData=business_metrics
        )
        
        return {
            'success': True,
            'application': app_name,
            'performance_metrics': len(performance_metrics),
            'business_metrics': len(business_metrics)
        }
    
    def track_database_performance(self, db_identifier, performance_data):
        """Rastrear performance de base de datos"""
        
        namespace = 'AWS/RDS'
        
        db_metrics = [
            {
                'name': 'DatabaseConnections',
                'value': performance_data['connections'],
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'DBInstanceIdentifier', 'Value': db_identifier}
                ]
            },
            {
                'name': 'CPUUtilization',
                'value': performance_data['cpu_utilization'],
                'unit': 'Percent',
                'dimensions': [
                    {'Name': 'DBInstanceIdentifier', 'Value': db_identifier}
                ]
            },
            {
                'name': 'ReadLatency',
                'value': performance_data['read_latency'],
                'unit': 'Milliseconds',
                'dimensions': [
                    {'Name': 'DBInstanceIdentifier', 'Value': db_identifier}
                ]
            },
            {
                'name': 'WriteLatency',
                'value': performance_data['write_latency'],
                'unit': 'Milliseconds',
                'dimensions': [
                    {'Name': 'DBInstanceIdentifier', 'Value': db_identifier}
                ]
            }
        ]
        
        return self.cloudwatch.put_metric_data(
            Namespace=namespace,
            MetricData=db_metrics
        )
    
    def create_custom_metric(self, namespace, metric_name, unit='Count'):
        """Crear métrica personalizada"""
        
        # Enviar valor inicial para crear la métrica
        return self.cloudwatch.put_metric_data(
            Namespace=namespace,
            MetricData=[
                {
                    'MetricName': metric_name,
                    'Value': 0,
                    'Unit': unit,
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
```

## Alarms y Alerting

### **Configuración de Alarms**
```python
class CloudWatchAlarms:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.sns = boto3.client('sns')
    
    def create_cpu_alarm(self, instance_id, threshold=80, notification_topic=None):
        """Crear alarm de CPU para instancia EC2"""
        
        try:
            alarm_name = f"CPU-High-{instance_id}"
            
            params = {
                'AlarmName': alarm_name,
                'AlarmDescription': f'CPU utilization exceeds {threshold}% for instance {instance_id}',
                'MetricName': 'CPUUtilization',
                'Namespace': 'AWS/EC2',
                'Statistic': 'Average',
                'Period': 300,
                'EvaluationPeriods': 2,
                'Threshold': threshold,
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {
                        'Name': 'InstanceId',
                        'Value': instance_id
                    }
                ]
            }
            
            if notification_topic:
                params['AlarmActions'] = [notification_topic]
            
            response = self.cloudwatch.put_metric_alarm(**params)
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'instance_id': instance_id,
                'threshold': threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_memory_alarm(self, instance_id, threshold=90, notification_topic=None):
        """Crear alarm de memoria para instancia EC2"""
        
        try:
            alarm_name = f"Memory-High-{instance_id}"
            
            params = {
                'AlarmName': alarm_name,
                'AlarmDescription': f'Memory utilization exceeds {threshold}% for instance {instance_id}',
                'MetricName': 'MemoryUtilization',
                'Namespace': 'System/Linux',
                'Statistic': 'Average',
                'Period': 300,
                'EvaluationPeriods': 2,
                'Threshold': threshold,
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {
                        'Name': 'InstanceId',
                        'Value': instance_id
                    }
                ]
            }
            
            if notification_topic:
                params['AlarmActions'] = [notification_topic]
            
            response = self.cloudwatch.put_metric_alarm(**params)
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'instance_id': instance_id,
                'threshold': threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_lambda_error_alarm(self, function_name, threshold=5, notification_topic=None):
        """Crear alarm de errores para función Lambda"""
        
        try:
            alarm_name = f"Lambda-Errors-{function_name}"
            
            params = {
                'AlarmName': alarm_name,
                'AlarmDescription': f'Error count exceeds {threshold} for Lambda function {function_name}',
                'MetricName': 'Errors',
                'Namespace': 'AWS/Lambda',
                'Statistic': 'Sum',
                'Period': 300,
                'EvaluationPeriods': 2,
                'Threshold': threshold,
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {
                        'Name': 'FunctionName',
                        'Value': function_name
                    }
                ]
            }
            
            if notification_topic:
                params['AlarmActions'] = [notification_topic]
            
            response = self.cloudwatch.put_metric_alarm(**params)
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'function_name': function_name,
                'threshold': threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_anomaly_detection_alarm(self, namespace, metric_name, dimensions, notification_topic=None):
        """Crear alarm con detección de anomalías"""
        
        try:
            alarm_name = f"Anomaly-{namespace}-{metric_name}"
            
            params = {
                'AlarmName': alarm_name,
                'AlarmDescription': f'Anomaly detected for {metric_name} in {namespace}',
                'MetricName': metric_name,
                'Namespace': namespace,
                'Stat': 'Average',
                'Period': 300,
                'EvaluationPeriods': 2,
                'ComparisonOperator': 'LessThanLowerOrGreaterThanUpperThreshold',
                'TreatMissingData': 'breaching',
                'Metrics': [
                    {
                        'Id': 'm1',
                        'ReturnData': True,
                        'MetricStat': {
                            'Metric': {
                                'Namespace': namespace,
                                'MetricName': metric_name,
                                'Dimensions': dimensions
                            },
                            'Period': 300,
                            'Stat': 'Average'
                        }
                    },
                    {
                        'Id': 'ad1',
                        'ReturnData': True,
                        'Expression': 'ANOMALY_DETECTION_BAND(m1, 2)'
                    }
                ]
            }
            
            if notification_topic:
                params['AlarmActions'] = [notification_topic]
            
            response = self.cloudwatch.put_metric_alarm(**params)
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'namespace': namespace,
                'metric': metric_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_composite_alarm(self, alarm_name, alarm_rules, notification_topic=None):
        """Crear alarm compuesta"""
        
        try:
            params = {
                'AlarmName': alarm_name,
                'AlarmDescription': 'Composite alarm with multiple conditions',
                'AlarmRule': alarm_rules,
                'ActionsEnabled': True
            }
            
            if notification_topic:
                params['AlarmActions'] = [notification_topic]
            
            response = self.cloudwatch.put_metric_alarm(**params)
            
            return {
                'success': True,
                'alarm_name': alarm_name,
                'alarm_rule': alarm_rules
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_alarms(self, alarm_prefix=None, state_value=None):
        """Listar alarms"""
        
        try:
            params = {}
            
            if alarm_prefix:
                params['AlarmNamePrefix'] = alarm_prefix
            
            if state_value:
                params['StateValue'] = state_value
            
            response = self.cloudwatch.describe_alarms(**params)
            
            alarms = []
            for alarm in response['MetricAlarms']:
                alarm_info = {
                    'name': alarm['AlarmName'],
                    'description': alarm['AlarmDescription'],
                    'state': alarm['StateValue'],
                    'state_reason': alarm.get('StateReason', ''),
                    'metric': alarm['MetricName'],
                    'namespace': alarm['Namespace'],
                    'threshold': alarm['Threshold'],
                    'comparison': alarm['ComparisonOperator'],
                    'dimensions': alarm.get('Dimensions', [])
                }
                alarms.append(alarm_info)
            
            return {
                'success': True,
                'alarms': alarms,
                'count': len(alarms)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_alarm(self, alarm_name):
        """Deshabilitar alarm"""
        
        try:
            self.cloudwatch.disable_alarm_actions(AlarmNames=[alarm_name])
            
            return {
                'success': True,
                'alarm_name': alarm_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def enable_alarm(self, alarm_name):
        """Habilitar alarm"""
        
        try:
            self.cloudwatch.enable_alarm_actions(AlarmNames=[alarm_name])
            
            return {
                'success': True,
                'alarm_name': alarm_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## CloudWatch Logs

### **Log Management**
```python
class CloudWatchLogs:
    def __init__(self):
        self.logs = boto3.client('logs')
    
    def create_log_group(self, log_group_name, retention_days=None):
        """Crear log group"""
        
        try:
            params = {'logGroupName': log_group_name}
            
            if retention_days:
                params['retentionInDays'] = retention_days
            
            self.logs.create_log_group(**params)
            
            return {
                'success': True,
                'log_group_name': log_group_name,
                'retention_days': retention_days
            }
            
        except self.logs.exceptions.ResourceAlreadyExistsException:
            return {
                'success': True,
                'log_group_name': log_group_name,
                'message': 'Log group already exists'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_log_stream(self, log_group_name, log_stream_name):
        """Crear log stream"""
        
        try:
            self.logs.create_log_stream(
                logGroupName=log_group_name,
                logStreamName=log_stream_name
            )
            
            return {
                'success': True,
                'log_group_name': log_group_name,
                'log_stream_name': log_stream_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_log_events(self, log_group_name, log_stream_name, messages):
        """Enviar eventos de log"""
        
        try:
            log_events = []
            
            for message in messages:
                log_event = {
                    'timestamp': int(time.time() * 1000),
                    'message': message
                }
                log_events.append(log_event)
            
            response = self.logs.put_log_events(
                logGroupName=log_group_name,
                logStreamName=log_stream_name,
                logEvents=log_events
            )
            
            return {
                'success': True,
                'next_sequence_token': response['nextSequenceToken'],
                'events_sent': len(log_events)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def put_log_message(self, log_group_name, log_stream_name, message, level='INFO'):
        """Enviar un mensaje de log"""
        
        try:
            formatted_message = f"{datetime.utcnow().isoformat()} [{level}] {message}"
            
            response = self.logs.put_log_events(
                logGroupName=log_group_name,
                logStreamName=log_stream_name,
                logEvents=[
                    {
                        'timestamp': int(time.time() * 1000),
                        'message': formatted_message
                    }
                ]
            )
            
            return {
                'success': True,
                'message': message,
                'level': level
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_log_events(self, log_group_name, log_stream_name, start_time=None, end_time=None):
        """Obtener eventos de log"""
        
        try:
            params = {
                'logGroupName': log_group_name,
                'logStreamName': log_stream_name
            }
            
            if start_time:
                params['startTime'] = start_time
            
            if end_time:
                params['endTime'] = end_time
            
            response = self.logs.get_log_events(**params)
            
            events = []
            for event in response['events']:
                event_info = {
                    'timestamp': event['timestamp'],
                    'message': event['message'],
                    'ingestion_time': event.get('ingestionTime')
                }
                events.append(event_info)
            
            return {
                'success': True,
                'events': events,
                'next_forward_token': response.get('nextForwardToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def filter_log_events(self, log_group_name, filter_pattern, start_time=None, end_time=None):
        """Filtrar eventos de log"""
        
        try:
            params = {
                'logGroupName': log_group_name,
                'filterPattern': filter_pattern
            }
            
            if start_time:
                params['startTime'] = start_time
            
            if end_time:
                params['endTime'] = end_time
            
            response = self.logs.filter_log_events(**params)
            
            events = []
            for event in response['events']:
                event_info = {
                    'timestamp': event['timestamp'],
                    'message': event['message'],
                    'log_stream_name': event['logStreamName']
                }
                events.append(event_info)
            
            return {
                'success': True,
                'events': events,
                'filter_pattern': filter_pattern,
                'count': len(events)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_metric_filter(self, log_group_name, filter_pattern, metric_namespace, 
                           metric_name, metric_value, default_value=0):
        """Crear filtro de métrica"""
        
        try:
            response = self.logs.put_metric_filter(
                logGroupName=log_group_name,
                filterName=f"{metric_name}-filter",
                filterPattern=filter_pattern,
                metricTransformations=[
                    {
                        'metricName': metric_name,
                        'metricNamespace': metric_namespace,
                        'metricValue': metric_value,
                        'defaultValue': default_value
                    }
                ]
            )
            
            return {
                'success': True,
                'filter_name': f"{metric_name}-filter",
                'metric_namespace': metric_namespace,
                'metric_name': metric_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

### **Log Insights**
```python
class CloudWatchLogInsights:
    def __init__(self):
        self.logs = boto3.client('logs')
    
    def query_logs(self, log_group_names, query_string, start_time=None, end_time=None):
        """Ejecutar query en logs"""
        
        try:
            if start_time is None:
                start_time = int((datetime.utcnow() - timedelta(hours=24)).timestamp())
            
            if end_time is None:
                end_time = int(datetime.utcnow().timestamp())
            
            response = self.logs.start_query(
                logGroupNames=log_group_names,
                startTime=start_time,
                endTime=end_time,
                queryString=query_string
            )
            
            query_id = response['queryId']
            
            # Esperar resultados
            results = self.get_query_results(query_id)
            
            return {
                'success': True,
                'query_id': query_id,
                'results': results
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_query_results(self, query_id, max_attempts=30):
        """Obtener resultados de query"""
        
        for attempt in range(max_attempts):
            try:
                response = self.logs.get_query_results(queryId=query_id)
                
                if response['status'] == 'Complete':
                    return response['results']
                elif response['status'] == 'Failed':
                    return []
                elif response['status'] in ['Running', 'Scheduled']:
                    time.sleep(1)
                    continue
                else:
                    return []
                    
            except Exception as e:
                print(f"Error getting query results: {e}")
                time.sleep(1)
                continue
        
        return []
    
    def count_error_logs(self, log_group_names, hours=24):
        """Contar logs de error"""
        
        start_time = int((datetime.utcnow() - timedelta(hours=hours)).timestamp())
        end_time = int(datetime.utcnow().timestamp())
        
        query = f"""
        fields @timestamp, @message
        | filter @message like /ERROR/
        | stats count() as error_count by bin(1h)
        | sort @timestamp desc
        """
        
        result = self.query_logs(log_group_names, query, start_time, end_time)
        
        return result
    
    def analyze_api_performance(self, log_group_names, hours=24):
        """Analizar performance de API"""
        
        start_time = int((datetime.utcnow() - timedelta(hours=hours)).timestamp())
        end_time = int(datetime.utcnow().timestamp())
        
        query = f"""
        fields @timestamp, @message
        | filter @message like /API/
        | parse @message "Response time: *" as response_time
        | stats avg(response_time) as avg_response, 
                max(response_time) as max_response,
                count(*) as request_count by bin(1h)
        | sort @timestamp desc
        """
        
        result = self.query_logs(log_group_names, query, start_time, end_time)
        
        return result
    
    def get_top_errors(self, log_group_names, hours=24, limit=10):
        """Obtener errores más frecuentes"""
        
        start_time = int((datetime.utcnow() - timedelta(hours=hours)).timestamp())
        end_time = int(datetime.utcnow().timestamp())
        
        query = f"""
        fields @timestamp, @message
        | filter @message like /ERROR/
        | parse @message "*: *" as error_type, error_message
        | stats count(*) as count by error_type
        | sort count desc
        | limit {limit}
        """
        
        result = self.query_logs(log_group_names, query, start_time, end_time)
        
        return result
```

## Dashboards y Visualización

### **Dashboard Management**
```python
class CloudWatchDashboards:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
    
    def create_application_dashboard(self, dashboard_name, app_config):
        """Crear dashboard para aplicación"""
        
        try:
            widgets = []
            
            # Widget de métricas de performance
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['Application/' + app_config['name'], 'ResponseTime', 'Endpoint', app_config['endpoint']],
                        ['.', 'RequestCount', '.', app_config['endpoint']],
                        ['.', 'ErrorRate', '.', app_config['endpoint']]
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': app_config['region'],
                    'title': 'Application Performance',
                    'period': 300
                }
            })
            
            # Widget de CPU de instancias
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/EC2', 'CPUUtilization', 'InstanceId', app_config['instance_id']]
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': app_config['region'],
                    'title': 'Instance CPU',
                    'period': 300
                }
            })
            
            # Widget de logs de error
            widgets.append({
                'type': 'log',
                'properties': {
                    'region': app_config['region'],
                    'title': 'Error Logs',
                    'logGroupNames': [f"/aws/{app_config['name']}/errors"],
                    'view': 'table',
                    'query': 'fields @timestamp, @message | filter @message like /ERROR/',
                    'timeRange': '1h'
                }
            })
            
            dashboard_body = {
                'widgets': widgets
            }
            
            response = self.cloudwatch.put_dashboard(
                DashboardName=dashboard_name,
                DashboardBody=json.dumps(dashboard_body)
            )
            
            return {
                'success': True,
                'dashboard_name': dashboard_name,
                'dashboard_arn': response['DashboardArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_infrastructure_dashboard(self, dashboard_name, infra_config):
        """Crear dashboard de infraestructura"""
        
        try:
            widgets = []
            
            # Widget de CPU de todas las instancias
            cpu_metrics = []
            for instance_id in infra_config['instances']:
                cpu_metrics.append(
                    ['AWS/EC2', 'CPUUtilization', 'InstanceId', instance_id, {'region': infra_config['region']}]
                )
            
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': cpu_metrics,
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': infra_config['region'],
                    'title': 'Instance CPU Utilization',
                    'period': 300
                }
            })
            
            # Widget de Network I/O
            network_metrics = []
            for instance_id in infra_config['instances']:
                network_metrics.extend([
                    ['AWS/EC2', 'NetworkIn', 'InstanceId', instance_id, {'region': infra_config['region']}],
                    ['AWS/EC2', 'NetworkOut', 'InstanceId', instance_id, {'region': infra_config['region']}]
                ])
            
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': network_metrics,
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': infra_config['region'],
                    'title': 'Network I/O',
                    'period': 300
                }
            })
            
            # Widget de alarms activas
            widgets.append({
                'type': 'alarm',
                'properties': {
                    'title': 'Active Alarms',
                    'alarms': infra_config['alarm_names']
                }
            })
            
            dashboard_body = {
                'widgets': widgets
            }
            
            response = self.cloudwatch.put_dashboard(
                DashboardName=dashboard_name,
                DashboardBody=json.dumps(dashboard_body)
            )
            
            return {
                'success': True,
                'dashboard_name': dashboard_name,
                'dashboard_arn': response['DashboardArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_dashboards(self):
        """Listar dashboards"""
        
        try:
            response = self.cloudwatch.list_dashboards()
            
            dashboards = []
            for dashboard in response['DashboardEntries']:
                dashboard_info = {
                    'name': dashboard['DashboardName'],
                    'arn': dashboard['DashboardArn'],
                    'last_modified': dashboard['LastModified'],
                    'size': dashboard['Size']
                }
                dashboards.append(dashboard_info)
            
            return {
                'success': True,
                'dashboards': dashboards,
                'count': len(dashboards)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_dashboard(self, dashboard_name):
        """Obtener dashboard"""
        
        try:
            response = self.cloudwatch.get_dashboard(DashboardName=dashboard_name)
            
            return {
                'success': True,
                'dashboard_name': dashboard_name,
                'dashboard_body': response['DashboardBody']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_dashboard(self, dashboard_name):
        """Eliminar dashboard"""
        
        try:
            self.cloudwatch.delete_dashboards(DashboardNames=[dashboard_name])
            
            return {
                'success': True,
                'dashboard_name': dashboard_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Monitoring de Aplicación Web**
```python
class WebApplicationMonitoring:
    def __init__(self):
        self.metrics = CloudWatchMetrics()
        self.alarms = CloudWatchAlarms()
        self.logs = CloudWatchLogs()
        self.dashboards = CloudWatchDashboards()
    
    def setup_monitoring(self, app_config):
        """Configurar monitoring completo"""
        
        # Crear log groups
        log_groups = [
            f"/aws/{app_config['name']}/application",
            f"/aws/{app_config['name']}/errors",
            f"/aws/{app_config['name']}/access"
        ]
        
        for log_group in log_groups:
            self.logs.create_log_group(log_group, retention_days=30)
        
        # Configurar alarmas
        alarms = []
        
        # Alarm de CPU
        cpu_alarm = self.alarms.create_cpu_alarm(
            app_config['instance_id'],
            threshold=80,
            notification_topic=app_config['notification_topic']
        )
        alarms.append(cpu_alarm)
        
        # Alarm de errores de aplicación
        error_alarm = self.alarms.create_custom_metric_alarm(
            f"Application/{app_config['name']}",
            'ErrorRate',
            threshold=5,
            notification_topic=app_config['notification_topic']
        )
        alarms.append(error_alarm)
        
        # Crear dashboard
        dashboard = self.dashboards.create_application_dashboard(
            f"{app_config['name']}-dashboard",
            app_config
        )
        
        return {
            'log_groups': log_groups,
            'alarms': alarms,
            'dashboard': dashboard
        }
    
    def track_request(self, request_data):
        """Rastrear request de aplicación"""
        
        # Enviar métricas de performance
        metrics = [
            {
                'name': 'ResponseTime',
                'value': request_data['response_time'],
                'unit': 'Milliseconds',
                'dimensions': [
                    {'Name': 'Application', 'Value': request_data['app_name']},
                    {'Name': 'Endpoint', 'Value': request_data['endpoint']}
                ]
            },
            {
                'name': 'RequestCount',
                'value': 1,
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Application', 'Value': request_data['app_name']},
                    {'Name': 'Endpoint', 'Value': request_data['endpoint']}
                ]
            }
        ]
        
        if request_data.get('error'):
            metrics.append({
                'name': 'ErrorCount',
                'value': 1,
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Application', 'Value': request_data['app_name']},
                    {'Name': 'ErrorType', 'Value': request_data['error_type']}
                ]
            })
        
        return self.metrics.put_batch_metrics(f"Application/{request_data['app_name']}", metrics)
    
    def log_request(self, request_data):
        """Registrar request en logs"""
        
        log_level = 'ERROR' if request_data.get('error') else 'INFO'
        log_message = f"{request_data['method']} {request_data['endpoint']} - {request_data['status_code']} - {request_data['response_time']}ms"
        
        if request_data.get('error'):
            log_message += f" - Error: {request_data['error']}"
        
        return self.logs.put_log_message(
            f"/aws/{request_data['app_name']}/access",
            f"stream-{datetime.now().strftime('%Y-%m-%d')}",
            log_message,
            log_level
        )
```

### **2. Monitoring de Microservicios**
```python
class MicroserviceMonitoring:
    def __init__(self):
        self.metrics = CloudWatchMetrics()
        self.alarms = CloudWatchAlarms()
        self.logs = CloudWatchLogs()
    
    def setup_microservice_monitoring(self, service_config):
        """Configurar monitoring para microservicio"""
        
        service_name = service_config['name']
        
        # Crear namespace para el servicio
        namespace = f"Microservice/{service_name}"
        
        # Configurar métricas personalizadas
        custom_metrics = [
            'RequestDuration',
            'RequestCount',
            'ErrorCount',
            'CircuitBreakerState',
            'CacheHitRate'
        ]
        
        for metric in custom_metrics:
            self.metrics.create_custom_metric(namespace, metric)
        
        # Configurar alarmas
        alarms = []
        
        # Alarm de latencia
        latency_alarm = self.alarms.create_custom_metric_alarm(
            namespace,
            'RequestDuration',
            threshold=1000,  # 1 segundo
            notification_topic=service_config.get('notification_topic')
        )
        alarms.append(latency_alarm)
        
        # Alarm de error rate
        error_alarm = self.alarms.create_custom_metric_alarm(
            namespace,
            'ErrorCount',
            threshold=10,  # 10 errores por minuto
            notification_topic=service_config.get('notification_topic')
        )
        alarms.append(error_alarm)
        
        return {
            'namespace': namespace,
            'metrics': custom_metrics,
            'alarms': alarms
        }
    
    def track_service_request(self, service_name, request_data):
        """Rastrear request de microservicio"""
        
        namespace = f"Microservice/{service_name}"
        
        metrics = [
            {
                'name': 'RequestDuration',
                'value': request_data['duration'],
                'unit': 'Milliseconds',
                'dimensions': [
                    {'Name': 'Service', 'Value': service_name},
                    {'Name': 'Operation', 'Value': request_data['operation']}
                ]
            },
            {
                'name': 'RequestCount',
                'value': 1,
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Service', 'Value': service_name},
                    {'Name': 'Operation', 'Value': request_data['operation']}
                ]
            }
        ]
        
        if request_data.get('error'):
            metrics.append({
                'name': 'ErrorCount',
                'value': 1,
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Service', 'Value': service_name},
                    {'Name': 'ErrorType', 'Value': request_data['error']}
                ]
            })
        
        if request_data.get('cache_hit'):
            metrics.append({
                'name': 'CacheHitRate',
                'value': 1,
                'unit': 'Count',
                'dimensions': [
                    {'Name': 'Service', 'Value': service_name},
                    {'Name': 'CacheType', 'Value': request_data['cache_type']}
                ]
            })
        
        return self.metrics.put_batch_metrics(namespace, metrics)
    
    def track_circuit_breaker_state(self, service_name, state):
        """Rastrear estado de circuit breaker"""
        
        namespace = f"Microservice/{service_name}"
        
        # Convertir estado a valor numérico
        state_values = {
            'CLOSED': 0,
            'OPEN': 1,
            'HALF_OPEN': 2
        }
        
        metric_value = state_values.get(state, 0)
        
        return self.metrics.put_custom_metric(
            namespace,
            'CircuitBreakerState',
            metric_value,
            dimensions=[
                {'Name': 'Service', 'Value': service_name}
            ],
            unit='None'
        )
```

## Security y Compliance

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:EnableAlarmActions",
        "cloudwatch:DisableAlarmActions"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/my-app/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutDashboard",
        "cloudwatch:GetDashboard",
        "cloudwatch:DeleteDashboards",
        "cloudwatch:ListDashboards"
      ],
      "Resource": "*"
    }
  ]
}
```

## Best Practices

### **1. Métricas**
- Usar namespaces consistentes
- Enviar métricas con dimensionalidad apropiada
- Configurar retention policies
- Monitorear costos de métricas

### **2. Alarms**
- Configurar umbrales apropiados
- Usar anomaly detection para métricas variables
- Implementar alarm actions automáticas
- Evitar alarm storms

### **3. Logs**
- Usar log groups estructurados
- Configurar retention policies apropiadas
- Implementar log filtering
- Usar metric filters para alerting

### **4. Dashboards**
- Crear dashboards específicos por rol
- Usar widgets apropiados para cada tipo de dato
- Configurar time ranges apropiados
- Compartir dashboards con equipos relevantes

## Cost Management

### **Pricing Components**
- **Métricas personalizadas**: $0.30 por métrica por mes
- **Alarms**: $0.10 por alarm por mes
- **Logs**: $0.50 por GB ingested
- **Dashboards**: $3.00 por dashboard por mes

### **Cost Optimization**
```python
def calculate_cloudwatch_costs(custom_metrics, alarms, logs_gb, dashboards):
    """Calcular costos de CloudWatch"""
    
    # Custom metrics cost
    metrics_cost = custom_metrics * 0.30
    
    # Alarms cost
    alarms_cost = alarms * 0.10
    
    # Logs cost
    logs_cost = logs_gb * 0.50
    
    # Dashboards cost
    dashboards_cost = dashboards * 3.00
    
    total_cost = metrics_cost + alarms_cost + logs_cost + dashboards_cost
    
    return {
        'metrics_cost': metrics_cost,
        'alarms_cost': alarms_cost,
        'logs_cost': logs_cost,
        'dashboards_cost': dashboards_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS CloudWatch es fundamental para el monitoring y observabilidad en AWS, proporcionando una solución unificada para recolectar, analizar y visualizar métricas, logs y eventos de toda la infraestructura y aplicaciones. Es esencial para mantener la salud operativa, optimizar performance y responder rápidamente a problemas en entornos cloud.
