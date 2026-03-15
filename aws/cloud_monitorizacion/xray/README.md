# AWS X-Ray

## Definición

AWS X-Ray es un servicio de distributed tracing que ayuda a los desarrolladores a analizar y debuggear aplicaciones distribuidas en producción. Proporciona una visión completa de cómo las aplicaciones se comportan, permitiendo identificar problemas de performance, detectar cuellos de botella y entender las dependencias entre servicios en arquitecturas microservicios y serverless.

## Características Principales

### 1. **Distributed Tracing**
- End-to-end tracing
- Service maps
- Request flow visualization
- Latency analysis

### 2. **Performance Analysis**
- Response time metrics
- Error rate tracking
- Throughput monitoring
- Performance insights

### 3. **Service Dependency Mapping**
- Automatic service discovery
- Dependency graphs
- Impact analysis
- Root cause identification

### 4. **Integration Ecosystem**
- Multiple SDK support
- Framework integration
- Service integration
- Custom instrumentation

## Componentes Clave

### **Segments**
- Unidades fundamentales de trabajo
- Metadata del servicio
- Timing information
- Annotations y metadata

### **Subsegments**
- Operaciones anidadas
- Database calls
- HTTP requests
- Custom operations

### **Trace**
- Colección de segments
- Request journey
- Service interactions
- Complete workflow

### **Service Map**
- Visual representation
- Service connections
- Health indicators
- Performance metrics

## Instrumentación

### **Python SDK**
```python
import boto3
import json
import time
from datetime import datetime
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch
from aws_xray_sdk.core.models.segment
from aws_xray_sdk.core.models.subsegment

# Patch libraries for automatic tracing
patch(['boto3', 'requests', 'mysql', 'postgresql'])

class XRayInstrumentation:
    def __init__(self):
        self.xray = boto3.client('xray')
    
    def create_custom_segment(self, name, metadata=None, annotations=None):
        """Crear segment personalizado"""
        
        try:
            segment = xray_recorder.begin_segment(name)
            
            if metadata:
                for key, value in metadata.items():
                    segment.put_metadata(key, value)
            
            if annotations:
                for key, value in annotations.items():
                    segment.put_annotation(key, value)
            
            return {
                'success': True,
                'segment_name': name,
                'trace_id': segment.trace_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_subsegment(self, name, parent_segment=None, metadata=None, annotations=None):
        """Crear subsegment personalizado"""
        
        try:
            subsegment = xray_recorder.begin_subsegment(name)
            
            if metadata:
                for key, value in metadata.items():
                    subsegment.put_metadata(key, value)
            
            if annotations:
                for key, value in annotations.items():
                    subsegment.put_annotation(key, value)
            
            return {
                'success': True,
                'subsegment_name': name,
                'trace_id': subsegment.trace_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def trace_api_call(self, api_name, endpoint, method='GET', headers=None, params=None):
        """Trazar llamada API"""
        
        try:
            segment = xray_recorder.begin_segment(f"API-{api_name}")
            
            # Agregar annotations
            segment.put_annotation('api_name', api_name)
            segment.put_annotation('method', method)
            segment.put_annotation('endpoint', endpoint)
            
            # Agregar metadata
            segment.put_metadata('headers', headers or {})
            segment.put_metadata('params', params or {})
            
            # Simular llamada API
            start_time = time.time()
            
            # Aquí iría la llamada API real
            response = self.simulate_api_call(endpoint, method, headers, params)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Agregar métricas de performance
            segment.put_annotation('duration_ms', int(duration * 1000))
            segment.put_annotation('status_code', response.get('status_code', 200))
            
            xray_recorder.end_segment()
            
            return {
                'success': True,
                'api_name': api_name,
                'duration_ms': int(duration * 1000),
                'status_code': response.get('status_code', 200)
            }
            
        except Exception as e:
            if 'segment' in locals():
                xray_recorder.end_segment()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def trace_database_operation(self, operation, table_name, query=None):
        """Trazar operación de base de datos"""
        
        try:
            subsegment = xray_recorder.begin_subsegment(f"DB-{operation}")
            
            # Agregar annotations
            subsegment.put_annotation('operation', operation)
            subsegment.put_annotation('table', table_name)
            
            # Agregar metadata
            if query:
                subsegment.put_metadata('query', query)
            
            # Simular operación de base de datos
            start_time = time.time()
            
            # Aquí iría la operación real de base de datos
            result = self.simulate_database_operation(operation, table_name, query)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Agregar métricas de performance
            subsegment.put_annotation('duration_ms', int(duration * 1000))
            subsegment.put_annotation('rows_affected', result.get('rows_affected', 0))
            
            xray_recorder.end_subsegment()
            
            return {
                'success': True,
                'operation': operation,
                'table': table_name,
                'duration_ms': int(duration * 1000),
                'rows_affected': result.get('rows_affected', 0)
            }
            
        except Exception as e:
            if 'subsegment' in locals():
                xray_recorder.end_subsegment()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def trace_lambda_function(self, function_name, event_data):
        """Trazar ejecución de función Lambda"""
        
        try:
            segment = xray_recorder.begin_segment(f"Lambda-{function_name}")
            
            # Agregar annotations
            segment.put_annotation('function_name', function_name)
            segment.put_annotation('event_source', event_data.get('source', 'unknown'))
            
            # Agregar metadata
            segment.put_metadata('event_data', event_data)
            
            # Crear subsegment para procesamiento
            processing_subsegment = xray_recorder.begin_subsegment("Processing")
            
            start_time = time.time()
            
            # Simular procesamiento
            result = self.simulate_lambda_processing(event_data)
            
            processing_time = time.time() - start_time
            processing_subsegment.put_annotation('duration_ms', int(processing_time * 1000))
            
            xray_recorder.end_subsegment()
            
            total_time = time.time() - start_time
            segment.put_annotation('total_duration_ms', int(total_time * 1000))
            segment.put_annotation('success', result.get('success', False))
            
            xray_recorder.end_segment()
            
            return {
                'success': True,
                'function_name': function_name,
                'total_duration_ms': int(total_time * 1000),
                'processing_duration_ms': int(processing_time * 1000)
            }
            
        except Exception as e:
            if 'segment' in locals():
                xray_recorder.end_segment()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def trace_external_service_call(self, service_name, operation, parameters):
        """Trazar llamada a servicio externo"""
        
        try:
            subsegment = xray_recorder.begin_subsegment(f"External-{service_name}")
            
            # Agregar annotations
            subsegment.put_annotation('service', service_name)
            subsegment.put_annotation('operation', operation)
            
            # Agregar metadata
            subsegment.put_metadata('parameters', parameters)
            
            # Simular llamada externa
            start_time = time.time()
            
            # Aquí iría la llamada real al servicio externo
            result = self.simulate_external_call(service_name, operation, parameters)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Agregar métricas de performance
            subsegment.put_annotation('duration_ms', int(duration * 1000))
            subsegment.put_annotation('success', result.get('success', False))
            
            xray_recorder.end_subsegment()
            
            return {
                'success': True,
                'service_name': service_name,
                'operation': operation,
                'duration_ms': int(duration * 1000)
            }
            
        except Exception as e:
            if 'subsegment' in locals():
                xray_recorder.end_subsegment()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def simulate_api_call(self, endpoint, method, headers, params):
        """Simular llamada API"""
        time.sleep(0.1)  # Simular latencia
        return {'status_code': 200, 'data': 'success'}
    
    def simulate_database_operation(self, operation, table_name, query):
        """Simular operación de base de datos"""
        time.sleep(0.05)  # Simular latencia
        return {'rows_affected': 1, 'success': True}
    
    def simulate_lambda_processing(self, event_data):
        """Simular procesamiento Lambda"""
        time.sleep(0.2)  # Simular procesamiento
        return {'success': True, 'processed': True}
    
    def simulate_external_call(self, service_name, operation, parameters):
        """Simular llamada externa"""
        time.sleep(0.15)  # Simular latencia
        return {'success': True, 'data': 'external_response'}
```

### **Decorators para Instrumentación**
```python
from functools import wraps
from aws_xray_sdk.core import xray_recorder

def trace_method(service_name=None):
    """Decorator para tracear métodos"""
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            method_name = service_name or f"{func.__module__}.{func.__name__}"
            
            subsegment = xray_recorder.begin_subsegment(method_name)
            
            try:
                # Agregar metadata sobre los argumentos
                subsegment.put_metadata('args', str(args)[:500])  # Limitar tamaño
                subsegment.put_metadata('kwargs', str(kwargs)[:500])
                
                start_time = time.time()
                result = func(*args, **kwargs)
                end_time = time.time()
                
                # Agregar métricas
                duration = end_time - start_time
                subsegment.put_annotation('duration_ms', int(duration * 1000))
                subsegment.put_annotation('success', True)
                
                return result
                
            except Exception as e:
                subsegment.put_annotation('success', False)
                subsegment.put_annotation('error', str(e))
                raise
            finally:
                xray_recorder.end_subsegment()
        
        return wrapper
    return decorator

def trace_api_call(endpoint=None, method='GET'):
    """Decorator para tracear llamadas API"""
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            api_name = endpoint or f"API-{func.__name__}"
            
            subsegment = xray_recorder.begin_subsegment(f"API-{api_name}")
            
            try:
                subsegment.put_annotation('method', method)
                subsegment.put_annotation('endpoint', endpoint or 'unknown')
                
                start_time = time.time()
                result = func(*args, **kwargs)
                end_time = time.time()
                
                duration = end_time - start_time
                subsegment.put_annotation('duration_ms', int(duration * 1000))
                subsegment.put_annotation('status_code', getattr(result, 'status_code', 200))
                
                return result
                
            except Exception as e:
                subsegment.put_annotation('success', False)
                subsegment.put_annotation('error', str(e))
                raise
            finally:
                xray_recorder.end_subsegment()
        
        return wrapper
    return decorator

def trace_database_operation(table_name=None, operation=None):
    """Decorator para tracear operaciones de base de datos"""
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            db_operation = operation or func.__name__
            db_table = table_name or 'unknown'
            
            subsegment = xray_recorder.begin_subsegment(f"DB-{db_operation}")
            
            try:
                subsegment.put_annotation('operation', db_operation)
                subsegment.put_annotation('table', db_table)
                
                start_time = time.time()
                result = func(*args, **kwargs)
                end_time = time.time()
                
                duration = end_time - start_time
                subsegment.put_annotation('duration_ms', int(duration * 1000))
                
                # Si el resultado contiene información de rows afectados
                if isinstance(result, dict) and 'rows_affected' in result:
                    subsegment.put_annotation('rows_affected', result['rows_affected'])
                
                return result
                
            except Exception as e:
                subsegment.put_annotation('success', False)
                subsegment.put_annotation('error', str(e))
                raise
            finally:
                xray_recorder.end_subsegment()
        
        return wrapper
    return decorator

# Ejemplos de uso
class TracedUserService:
    @trace_method('UserService')
    def get_user(self, user_id):
        """Obtener usuario con tracing"""
        # Lógica de negocio
        return {'user_id': user_id, 'name': 'John Doe'}
    
    @trace_method('UserService')
    def create_user(self, user_data):
        """Crear usuario con tracing"""
        # Lógica de negocio
        return {'user_id': '123', 'created': True}
    
    @trace_database_operation('users', 'select')
    def get_user_from_db(self, user_id):
        """Obtener usuario de base de datos con tracing"""
        # Lógica de base de datos
        return {'user_id': user_id, 'rows_affected': 1}
    
    @trace_api_call('/api/users', 'POST')
    def create_user_api(self, user_data):
        """API endpoint con tracing"""
        # Lógica de API
        response = type('Response', (), {'status_code': 201})()
        return response
```

## Service Maps y Visualización

### **Service Map Management**
```python
class XRayServiceMap:
    def __init__(self):
        self.xray = boto3.client('xray')
    
    def get_service_map(self, time_range=None):
        """Obtener mapa de servicios"""
        
        try:
            params = {}
            
            if time_range:
                params['TimeRange'] = time_range
            
            response = self.xray.get_service_graph(**params)
            
            service_graph = response['Services']
            
            # Procesar información de servicios
            services_info = []
            for service in service_graph:
                service_info = {
                    'name': service['Name'],
                    'arn': service.get('ARN'),
                    'type': service.get('Type', 'Unknown'),
                    'edges': [],
                    'summary': service.get('Summary', {})
                }
                
                # Procesar edges (conexiones)
                if 'Edges' in service:
                    for edge in service['Edges']:
                        edge_info = {
                            'reference_id': edge['ReferenceId'],
                            'start_time': edge.get('StartTime'),
                            'end_time': edge.get('EndTime'),
                            'summary': edge.get('Summary', {}),
                            'edge_type': edge.get('EdgeType', 'Unknown')
                        }
                        service_info['edges'].append(edge_info)
                
                services_info.append(service_info)
            
            return {
                'success': True,
                'services': services_info,
                'service_count': len(services_info),
                'start_time': response.get('StartTime'),
                'end_time': response.get('EndTime')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_trace_summary(self, trace_ids):
        """Obtener resumen de traces"""
        
        try:
            response = self.xray.batch_get_traces(
                TraceIds=trace_ids,
                NextToken=None
            )
            
            traces = []
            for trace in response['Traces']:
                trace_info = {
                    'id': trace['Id'],
                    'duration': trace.get('Duration'),
                    'limit_exceeded': trace.get('LimitExceeded', False),
                    'segments': []
                }
                
                # Procesar segments
                for segment in trace.get('Segments', []):
                    segment_data = json.loads(segment['Document'])
                    segment_info = {
                        'id': segment_data.get('id'),
                        'name': segment_data.get('name'),
                        'start_time': segment_data.get('start_time'),
                        'end_time': segment_data.get('end_time'),
                        'parent_id': segment_data.get('parent_id'),
                        'trace_id': segment_data.get('trace_id'),
                        'origin': segment_data.get('origin'),
                        'metadata': segment_data.get('metadata', {}),
                        'annotations': segment_data.get('annotations', {}),
                        'subsegments': segment_data.get('subsegments', [])
                    }
                    trace_info['segments'].append(segment_info)
                
                traces.append(trace_info)
            
            return {
                'success': True,
                'traces': traces,
                'trace_count': len(traces),
                'next_token': response.get('NextToken')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_trace_graph(self, time_range=None):
        """Obtener grafo de traces"""
        
        try:
            params = {}
            
            if time_range:
                params['TimeRange'] = time_range
            
            response = self.xray.get_trace_graph(**params)
            
            trace_graph = response.get('Services', [])
            
            return {
                'success': True,
                'trace_graph': trace_graph,
                'service_count': len(trace_graph)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_service_dependencies(self, time_range=None):
        """Analizar dependencias de servicios"""
        
        service_map = self.get_service_map(time_range)
        
        if not service_map['success']:
            return service_map
        
        dependencies = {}
        
        for service in service_map['services']:
            service_name = service['name']
            dependencies[service_name] = {
                'dependencies': [],
                'dependents': [],
                'total_requests': 0,
                'error_rate': 0,
                'avg_latency': 0
            }
            
            # Analizar edges para encontrar dependencias
            for edge in service['edges']:
                edge_summary = edge.get('summary', {})
                
                if 'Http' in edge_summary:
                    http_summary = edge_summary['Http']
                    dependencies[service_name]['total_requests'] += http_summary.get('RequestCount', 0)
                    dependencies[service_name]['error_rate'] += http_summary.get('ErrorRate', 0)
                    dependencies[service_name]['avg_latency'] += http_summary.get('Latency', 0)
        
        return {
            'success': True,
            'dependencies': dependencies,
            'analysis_period': time_range or 'default'
        }
```

## Casos de Uso

### **1. Microservices Performance Monitoring**
```python
class MicroservicesMonitor:
    def __init__(self):
        self.xray_instrumentation = XRayInstrumentation()
        self.service_map = XRayServiceMap()
    
    def setup_microservices_tracing(self, services_config):
        """Configurar tracing para microservicios"""
        
        tracing_configs = []
        
        for service in services_config:
            config = {
                'service_name': service['name'],
                'service_type': service['type'],
                'tracing_enabled': True,
                'sampling_rate': service.get('sampling_rate', 0.1),
                'annotations': {
                    'version': service.get('version', '1.0.0'),
                    'environment': service.get('environment', 'production')
                }
            }
            
            tracing_configs.append(config)
        
        return {
            'success': True,
            'tracing_configs': tracing_configs,
            'services_configured': len(tracing_configs)
        }
    
    def trace_service_request(self, service_name, request_data):
        """Trazar request a microservicio"""
        
        # Crear segment principal
        segment_result = self.xray_instrumentation.create_custom_segment(
            f"Service-{service_name}",
            metadata={'request_data': request_data},
            annotations={'service_name': service_name}
        )
        
        if not segment_result['success']:
            return segment_result
        
        # Trazar diferentes componentes del request
        traces = []
        
        # Authentication
        auth_trace = self.xray_instrumentation.trace_external_service_call(
            'AuthService',
            'authenticate',
            {'token': request_data.get('token')}
        )
        traces.append(auth_trace)
        
        # Database lookup
        db_trace = self.xray_instrumentation.trace_database_operation(
            'users',
            'select',
            f"SELECT * FROM users WHERE id = {request_data.get('user_id')}"
        )
        traces.append(db_trace)
        
        # External API call
        if request_data.get('external_api_call'):
            api_trace = self.xray_instrumentation.trace_api_call(
                'ExternalAPI',
                request_data['external_endpoint'],
                request_data.get('method', 'GET')
            )
            traces.append(api_trace)
        
        return {
            'success': True,
            'service_name': service_name,
            'trace_id': segment_result['trace_id'],
            'component_traces': traces
        }
    
    def analyze_service_performance(self, service_name, hours=1):
        """Analizar performance de servicio"""
        
        time_range = {
            'StartTime': datetime.utcnow() - timedelta(hours=hours),
            'EndTime': datetime.utcnow()
        }
        
        # Obtener mapa de servicios
        service_map = self.service_map.get_service_map(time_range)
        
        if not service_map['success']:
            return service_map
        
        # Filtrar por servicio específico
        service_info = None
        for service in service_map['services']:
            if service['name'] == service_name:
                service_info = service
                break
        
        if not service_info:
            return {
                'success': False,
                'error': f'Service {service_name} not found'
            }
        
        # Analizar métricas
        performance_metrics = {
            'total_requests': 0,
            'error_rate': 0,
            'avg_latency': 0,
            'dependencies': [],
            'throughput': 0
        }
        
        for edge in service_info['edges']:
            edge_summary = edge.get('summary', {})
            
            if 'Http' in edge_summary:
                http_summary = edge_summary['Http']
                performance_metrics['total_requests'] += http_summary.get('RequestCount', 0)
                performance_metrics['error_rate'] += http_summary.get('ErrorRate', 0)
                performance_metrics['avg_latency'] += http_summary.get('Latency', 0)
        
        # Calcular throughput
        if hours > 0:
            performance_metrics['throughput'] = performance_metrics['total_requests'] / (hours * 3600)
        
        return {
            'success': True,
            'service_name': service_name,
            'analysis_period': f"{hours} hours",
            'performance_metrics': performance_metrics
        }
    
    def detect_performance_issues(self, service_name, threshold_latency=1000, threshold_error_rate=0.05):
        """Detectar problemas de performance"""
        
        performance_result = self.analyze_service_performance(service_name)
        
        if not performance_result['success']:
            return performance_result
        
        metrics = performance_result['performance_metrics']
        issues = []
        
        # Detectar alta latencia
        if metrics['avg_latency'] > threshold_latency:
            issues.append({
                'type': 'high_latency',
                'severity': 'high',
                'description': f"Average latency {metrics['avg_latency']}ms exceeds threshold {threshold_latency}ms",
                'value': metrics['avg_latency'],
                'threshold': threshold_latency
            })
        
        # Detectar alta tasa de error
        if metrics['error_rate'] > threshold_error_rate:
            issues.append({
                'type': 'high_error_rate',
                'severity': 'critical',
                'description': f"Error rate {metrics['error_rate']:.2%} exceeds threshold {threshold_error_rate:.2%}",
                'value': metrics['error_rate'],
                'threshold': threshold_error_rate
            })
        
        # Detectar bajo throughput
        if metrics['throughput'] < 1:  # Menos de 1 request por segundo
            issues.append({
                'type': 'low_throughput',
                'severity': 'medium',
                'description': f"Low throughput {metrics['throughput']:.2f} requests/second",
                'value': metrics['throughput']
            })
        
        return {
            'success': True,
            'service_name': service_name,
            'issues': issues,
            'issue_count': len(issues),
            'performance_metrics': metrics
        }
```

### **2. Lambda Function Tracing**
```python
class LambdaTracing:
    def __init__(self):
        self.xray_instrumentation = XRayInstrumentation()
    
    def setup_lambda_tracing(self, lambda_config):
        """Configurar tracing para funciones Lambda"""
        
        # Habilitar X-Ray tracing para la función Lambda
        lambda_client = boto3.client('lambda')
        
        try:
            response = lambda_client.update_function_configuration(
                FunctionName=lambda_config['function_name'],
                TracingConfig={
                    'Mode': 'Active'
                }
            )
            
            return {
                'success': True,
                'function_name': lambda_config['function_name'],
                'tracing_enabled': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def trace_lambda_execution(self, function_name, event_data):
        """Trazar ejecución de Lambda"""
        
        return self.xray_instrumentation.trace_lambda_function(function_name, event_data)
    
    def analyze_lambda_performance(self, function_name, hours=1):
        """Analizar performance de función Lambda"""
        
        # Obtener traces de la función Lambda
        time_range = {
            'StartTime': datetime.utcnow() - timedelta(hours=hours),
            'EndTime': datetime.utcnow()
        }
        
        service_map = XRayServiceMap()
        service_result = service_map.get_service_map(time_range)
        
        if not service_result['success']:
            return service_result
        
        # Buscar la función Lambda en el mapa de servicios
        lambda_info = None
        for service in service_result['services']:
            if function_name in service['name'] and 'AWS::Lambda' in service.get('arn', ''):
                lambda_info = service
                break
        
        if not lambda_info:
            return {
                'success': False,
                'error': f'Lambda function {function_name} not found in traces'
            }
        
        # Analizar métricas
        performance_metrics = {
            'invocations': 0,
            'errors': 0,
            'avg_duration': 0,
            'max_duration': 0,
            'min_duration': float('inf'),
            'cold_starts': 0
        }
        
        for edge in lambda_info['edges']:
            edge_summary = edge.get('summary', {})
            
            if 'Lambda' in edge_summary:
                lambda_summary = edge_summary['Lambda']
                performance_metrics['invocations'] += lambda_summary.get('Invocations', 0)
                performance_metrics['errors'] += lambda_summary.get('Errors', 0)
                performance_metrics['avg_duration'] += lambda_summary.get('Duration', 0)
                performance_metrics['max_duration'] = max(performance_metrics['max_duration'], lambda_summary.get('Duration', 0))
                performance_metrics['min_duration'] = min(performance_metrics['min_duration'], lambda_summary.get('Duration', float('inf')))
                
                # Detectar cold starts (primeras invocaciones)
                if lambda_summary.get('ColdStart', False):
                    performance_metrics['cold_starts'] += 1
        
        # Calcular promedio de duración
        if performance_metrics['invocations'] > 0:
            performance_metrics['avg_duration'] /= performance_metrics['invocations']
        
        # Resetear min_duration si no se encontró
        if performance_metrics['min_duration'] == float('inf'):
            performance_metrics['min_duration'] = 0
        
        return {
            'success': True,
            'function_name': function_name,
            'analysis_period': f"{hours} hours",
            'performance_metrics': performance_metrics
        }
```

### **3. Database Performance Analysis**
```python
class DatabaseTracing:
    def __init__(self):
        self.xray_instrumentation = XRayInstrumentation()
    
    def trace_database_operations(self, operations):
        """Trazar operaciones de base de datos"""
        
        traces = []
        
        for operation in operations:
            trace_result = self.xray_instrumentation.trace_database_operation(
                operation['type'],
                operation['table'],
                operation.get('query')
            )
            traces.append(trace_result)
        
        return {
            'success': True,
            'operations_traced': len(traces),
            'traces': traces
        }
    
    def analyze_database_performance(self, table_name, hours=1):
        """Analizar performance de base de datos"""
        
        time_range = {
            'StartTime': datetime.utcnow() - timedelta(hours=hours),
            'EndTime': datetime.utcnow()
        }
        
        service_map = XRayServiceMap()
        service_result = service_map.get_service_map(time_range)
        
        if not service_result['success']:
            return service_result
        
        # Buscar operaciones de base de datos
        db_operations = []
        
        for service in service_result['services']:
            if 'RDS' in service.get('arn', '') or 'Database' in service.get('name', ''):
                for edge in service['edges']:
                    edge_summary = edge.get('summary', {})
                    
                    if 'Database' in edge_summary:
                        db_summary = edge_summary['Database']
                        
                        operation_info = {
                            'table': table_name,
                            'operation_count': db_summary.get('Operations', 0),
                            'avg_latency': db_summary.get('Latency', 0),
                            'error_rate': db_summary.get('ErrorRate', 0)
                        }
                        db_operations.append(operation_info)
        
        return {
            'success': True,
            'table_name': table_name,
            'analysis_period': f"{hours} hours",
            'operations': db_operations
        }
```

## Integration con otros servicios

### **CloudWatch Integration**
```python
class XRayCloudWatchIntegration:
    def __init__(self):
        self.xray = boto3.client('xray')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def create_xray_metrics(self, service_name):
        """Crear métricas personalizadas de X-Ray en CloudWatch"""
        
        try:
            # Métricas de latencia
            self.cloudwatch.put_metric_data(
                Namespace='AWS/X-Ray',
                MetricData=[
                    {
                        'MetricName': 'Latency',
                        'Value': 0,
                        'Unit': 'Milliseconds',
                        'Timestamp': datetime.utcnow(),
                        'Dimensions': [
                            {
                                'Name': 'ServiceName',
                                'Value': service_name
                            }
                        ]
                    }
                ]
            )
            
            # Métricas de error rate
            self.cloudwatch.put_metric_data(
                Namespace='AWS/X-Ray',
                MetricData=[
                    {
                        'MetricName': 'ErrorRate',
                        'Value': 0,
                        'Unit': 'Percent',
                        'Timestamp': datetime.utcnow(),
                        'Dimensions': [
                            {
                                'Name': 'ServiceName',
                                'Value': service_name
                            }
                        ]
                    }
                ]
            )
            
            # Métricas de throughput
            self.cloudwatch.put_metric_data(
                Namespace='AWS/X-Ray',
                MetricData=[
                    {
                        'MetricName': 'Throughput',
                        'Value': 0,
                        'Unit': 'Count/Second',
                        'Timestamp': datetime.utcnow(),
                        'Dimensions': [
                            {
                                'Name': 'ServiceName',
                                'Value': service_name
                            }
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'service_name': service_name,
                'metrics_created': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_xray_alarms(self, service_name, latency_threshold=1000, error_threshold=0.05):
        """Configurar alarmas basadas en X-Ray"""
        
        alarms = []
        
        # Alarm de alta latencia
        latency_alarm = self.cloudwatch.put_metric_alarm(
            AlarmName=f'XRay-HighLatency-{service_name}',
            AlarmDescription=f'High latency detected for {service_name}',
            MetricName='Latency',
            Namespace='AWS/X-Ray',
            Statistic='Average',
            Period=300,
            EvaluationPeriods=2,
            Threshold=latency_threshold,
            ComparisonOperator='GreaterThanThreshold',
            Dimensions=[
                {
                    'Name': 'ServiceName',
                    'Value': service_name
                }
            ],
            AlarmActions=[
                'arn:aws:sns:us-east-1:123456789012:xray-alerts'
            ]
        )
        alarms.append(latency_alarm)
        
        # Alarm de alta tasa de error
        error_alarm = self.cloudwatch.put_metric_alarm(
            AlarmName=f'XRay-HighErrorRate-{service_name}',
            AlarmDescription=f'High error rate detected for {service_name}',
            MetricName='ErrorRate',
            Namespace='AWS/X-Ray',
            Statistic='Average',
            Period=300,
            EvaluationPeriods=2,
            Threshold=error_threshold,
            ComparisonOperator='GreaterThanThreshold',
            Dimensions=[
                {
                    'Name': 'ServiceName',
                    'Value': service_name
                }
            ],
            AlarmActions=[
                'arn:aws:sns:us-east-1:123456789012:xray-alerts'
            ]
        )
        alarms.append(error_alarm)
        
        return {
            'success': True,
            'service_name': service_name,
            'alarms_configured': len(alarms)
        }
```

## Best Practices

### **1. Instrumentación**
- Usar sampling strategies apropiadas
- Agregar metadata relevante
- Implementar custom annotations
- Evitar overhead excesivo

### **2. Performance**
- Configurar sampling rates óptimos
- Monitorear overhead de tracing
- Usar subsegments para operaciones específicas
- Implementar filtering de traces

### **3. Security**
- Evitar datos sensibles en traces
- Implementar filtering de metadata
- Usar IAM permissions apropiadas
- Configurar retention policies

### **4. Monitoring**
- Configurar alarmas de performance
- Monitorear error rates
- Analizar patrones de uso
- Implementar dashboards

## Cost Management

### **Pricing Components**
- **X-Ray**: Gratis para el primer millón de traces por mes
- **Additional traces**: $5.00 por millón de traces
- **Data storage**: $0.50 por GB-month
- **Data retrieval**: $0.20 por GB

### **Cost Optimization**
```python
def calculate_xray_costs(traces_per_month, storage_gb, retrieval_gb):
    """Calcular costos de X-Ray"""
    
    # Traces cost (primer millón gratis)
    additional_traces = max(0, traces_per_month - 1000000)
    traces_cost = (additional_traces / 1000000) * 5.00
    
    # Storage cost
    storage_cost = storage_gb * 0.50
    
    # Retrieval cost
    retrieval_cost = retrieval_gb * 0.20
    
    total_cost = traces_cost + storage_cost + retrieval_cost
    
    return {
        'traces_cost': traces_cost,
        'storage_cost': storage_cost,
        'retrieval_cost': retrieval_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS X-Ray es fundamental para entender y optimizar aplicaciones distribuidas en AWS, proporcionando visibilidad completa sobre el performance y comportamiento de microservicios y aplicaciones serverless. Es esencial para debugging, optimización de performance, monitoreo de dependencias y asegurar una experiencia de usuario óptima en arquitecturas complejas.
