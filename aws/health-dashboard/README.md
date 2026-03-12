# AWS Health Dashboard

## Definición

AWS Health Dashboard es un servicio que proporciona una visión centralizada del estado de los servicios y recursos de AWS. Ofrece información personalizada sobre eventos de servicio, cambios programados, y notificaciones de salud que afectan a los recursos de la cuenta, permitiendo a los equipos operativos responder rápidamente a problemas y planificar cambios de manera proactiva.

## Características Principales

### 1. **Service Health Monitoring**
- Estado de servicios AWS
- Eventos de servicio en tiempo real
- Impacto en recursos específicos
- Historical health data

### 2. **Personalized Notifications**
- Eventos relevantes a la cuenta
- Alertas personalizadas
- Event filtering
- Multi-channel delivery

### 3. **Change Management**
- Cambios programados
- Maintenance notifications
- Deprecation warnings
- Service updates

### 4. **Organizational View**
- Multi-account visibility
- Centralized monitoring
- Cross-account events
- Organizational health

## Componentes Clave

### **Health Events**
- Service issues
- Scheduled changes
- Account notifications
- Resource-specific events

### **Health Dashboard**
- Visual overview
- Service status
- Event timeline
- Impact assessment

### **Health API**
- Programmatic access
- Event queries
- Integration capabilities
- Automation support

### **Organizational Health**
- Multi-account view
- Centralized monitoring
- Aggregated events
- Management account access

## Tipos de Eventos de Salud

### **Service Health Events**
```bash
# Eventos de salud de servicios
aws health describe-events \
  --filter field=eventStatusCodes,values=["open","upcoming"] \
  --filter field=service,values=["EC2","RDS","Lambda"]

# Eventos específicos de cuenta
aws health describe-events-for-organization \
  --filter field=eventStatusCodes,values=["open","upcoming"] \
  --aws-account-id 123456789012
```

### **Scheduled Changes**
```bash
# Cambios programados
aws health describe-events \
  --filter field=eventTypeCategory,values=["scheduledChange"] \
  --filter field=service,values=["EC2"]

# Eventos de cuenta específicos
aws health describe-affected-entities-for-organization \
  --event-arn "arn:aws:health:us-east-1::event/EC2/EC2_ANNOUNCEMENT_2023"
```

## Health Dashboard Management

### **Configuración y Monitoring**
```python
import boto3
import json
import time
from datetime import datetime, timedelta

class AWSHealthDashboard:
    def __init__(self):
        self.health = boto3.client('health')
        self.sns = boto3.client('sns')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def get_service_health_status(self, region='us-east-1'):
        """Obtener estado de salud de servicios"""
        
        try:
            # Obtener eventos de salud
            response = self.health.describe_events(
                filter={
                    'eventStatusCodes': ['open', 'upcoming', 'closed'],
                    'eventTypeCategories': ['issue', 'accountNotification', 'scheduledChange']
                }
            )
            
            events = []
            for event in response['events']:
                event_info = {
                    'arn': event['arn'],
                    'service': event['service'],
                    'event_type_code': event['eventTypeCode'],
                    'event_type_category': event['eventTypeCategory'],
                    'region': event.get('region', 'GLOBAL'),
                    'start_time': event['startTime'],
                    'end_time': event.get('end_time'),
                    'status': event['eventStatus'],
                    'last_updated_time': event.get('lastUpdatedTime')
                }
                events.append(event_info)
            
            return {
                'success': True,
                'events': events,
                'total_events': len(events),
                'region': region
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_account_specific_events(self, account_id=None):
        """Obtener eventos específicos de la cuenta"""
        
        try:
            if account_id:
                response = self.health.describe_events_for_organization(
                    filter={
                        'eventStatusCodes': ['open', 'upcoming'],
                        'eventTypeCategories': ['issue', 'accountNotification', 'scheduledChange']
                    },
                    awsAccountId=account_id
                )
            else:
                response = self.health.describe_events(
                    filter={
                        'eventStatusCodes': ['open', 'upcoming'],
                        'eventTypeCategories': ['issue', 'accountNotification', 'scheduledChange']
                    }
                )
            
            events = []
            for event in response['events']:
                event_info = {
                    'arn': event['arn'],
                    'service': event['service'],
                    'event_type_code': event['eventTypeCode'],
                    'event_type_category': event['eventTypeCategory'],
                    'region': event.get('region', 'GLOBAL'),
                    'start_time': event['startTime'],
                    'end_time': event.get('end_time'),
                    'status': event['eventStatus']
                }
                events.append(event_info)
            
            return {
                'success': True,
                'events': events,
                'account_id': account_id or 'current'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_affected_entities(self, event_arn):
        """Obtener entidades afectadas por un evento"""
        
        try:
            response = self.health.describe_affected_entities(
                filter={
                    'eventArns': [event_arn]
                }
            )
            
            entities = []
            for entity in response['entities']:
                entity_info = {
                    'arn': entity['entityArn'],
                    'event_arn': entity['eventArn'],
                    'entity_value': entity['entityValue'],
                    'last_updated_time': entity.get('lastUpdatedTime')
                }
                entities.append(entity_info)
            
            return {
                'success': True,
                'event_arn': event_arn,
                'affected_entities': entities,
                'entity_count': len(entities)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_event_details(self, event_arns):
        """Obtener detalles de eventos específicos"""
        
        try:
            response = self.health.describe_event_details(
                eventArns=event_arns
            )
            
            event_details = []
            for detail in response['successfulSet']:
                detail_info = {
                    'arn': detail['event']['arn'],
                    'service': detail['event']['service'],
                    'event_type_code': detail['event']['eventTypeCode'],
                    'event_type_category': detail['event']['eventTypeCategory'],
                    'region': detail['event'].get('region', 'GLOBAL'),
                    'start_time': detail['event']['startTime'],
                    'end_time': detail['event'].get('end_time'),
                    'status': detail['event']['eventStatus'],
                    'event_description': detail.get('eventDescription', {})
                }
                event_details.append(detail_info)
            
            return {
                'success': True,
                'event_details': event_details,
                'details_count': len(event_details)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_organizational_health(self, organization_id=None):
        """Obtener salud organizacional"""
        
        try:
            response = self.health.describe_events_for_organization(
                filter={
                    'eventStatusCodes': ['open', 'upcoming'],
                    'eventTypeCategories': ['issue', 'accountNotification', 'scheduledChange']
                }
            )
            
            # Agrupar eventos por cuenta
            events_by_account = {}
            
            for event in response['events']:
                account_id = event.get('awsAccountId', 'unknown')
                
                if account_id not in events_by_account:
                    events_by_account[account_id] = {
                        'account_id': account_id,
                        'events': [],
                        'event_count': 0,
                        'critical_events': 0
                    }
                
                event_info = {
                    'arn': event['arn'],
                    'service': event['service'],
                    'event_type_code': event['eventTypeCode'],
                    'event_type_category': event['eventTypeCategory'],
                    'region': event.get('region', 'GLOBAL'),
                    'start_time': event['startTime'],
                    'status': event['eventStatus']
                }
                
                events_by_account[account_id]['events'].append(event_info)
                events_by_account[account_id]['event_count'] += 1
                
                # Contar eventos críticos
                if event['eventTypeCategory'] == 'issue':
                    events_by_account[account_id]['critical_events'] += 1
            
            return {
                'success': True,
                'organizational_health': events_by_account,
                'total_accounts': len(events_by_account),
                'total_events': sum(account['event_count'] for account in events_by_account.values())
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_health_dashboard(self, dashboard_config):
        """Crear dashboard de salud personalizado"""
        
        try:
            # Obtener eventos actuales
            health_status = self.get_service_health_status()
            
            if not health_status['success']:
                return health_status
            
            # Crear widgets para el dashboard
            widgets = []
            
            # Widget de eventos activos
            active_events = [e for e in health_status['events'] if e['status'] in ['open', 'upcoming']]
            
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/Health', 'ActiveEvents', 'Service', service, {'region': 'us-east-1'}]
                        for service in set(e['service'] for e in active_events)
                    ],
                    'view': 'timeSeries',
                    'stacked': False,
                    'region': 'us-east-1',
                    'title': 'Active Service Events',
                    'period': 300
                }
            })
            
            # Widget de eventos por categoría
            event_categories = {}
            for event in health_status['events']:
                category = event['event_type_category']
                event_categories[category] = event_categories.get(category, 0) + 1
            
            widgets.append({
                'type': 'metric',
                'properties': {
                    'metrics': [
                        ['AWS/Health', 'EventCount', 'Category', category, {'region': 'us-east-1'}]
                        for category in event_categories.keys()
                    ],
                    'view': 'pie',
                    'region': 'us-east-1',
                    'title': 'Events by Category'
                }
            })
            
            # Widget de timeline de eventos
            widgets.append({
                'type': 'log',
                'properties': {
                    'region': 'us-east-1',
                    'title': 'Recent Health Events',
                    'query': 'fields @timestamp, @message | filter @message like /AWS Health/',
                    'timeRange': '1h'
                }
            })
            
            # Crear el dashboard
            dashboard_body = {
                'widgets': widgets
            }
            
            cloudwatch = boto3.client('cloudwatch')
            response = cloudwatch.put_dashboard(
                DashboardName=dashboard_config['name'],
                DashboardBody=json.dumps(dashboard_body)
            )
            
            return {
                'success': True,
                'dashboard_name': dashboard_config['name'],
                'dashboard_arn': response['DashboardArn'],
                'widgets_count': len(widgets)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Notification Management

### **Configuración de Notificaciones**
```python
class HealthNotificationManager:
    def __init__(self):
        self.health = boto3.client('health')
        self.sns = boto3.client('sns')
        self.events = boto3.client('events')
    
    def setup_health_notifications(self, notification_config):
        """Configurar notificaciones de salud"""
        
        try:
            # Crear SNS topic para notificaciones
            topic_response = self.sns.create_topic(
                Name=notification_config['topic_name']
            )
            
            topic_arn = topic_response['TopicArn']
            
            # Configurar EventBridge rule para eventos de salud
            rule_name = f"health-events-{notification_config['name']}"
            
            event_pattern = {
                'source': ['aws.health'],
                'detail-type': ['AWS Health Event']
            }
            
            rule_response = self.events.put_rule(
                Name=rule_name,
                EventPattern=json.dumps(event_pattern),
                State='ENABLED'
            )
            
            # Configurar target para la rule
            self.events.put_targets(
                Rule=rule_name,
                Targets=[
                    {
                        'Id': 'HealthNotificationTarget',
                        'Arn': topic_arn,
                        'InputTransformer': {
                            'InputPathsMap': {
                                'eventArn': '$.detail.eventArn',
                                'service': '$.detail.service',
                                'eventType': '$.detail.eventTypeCode',
                                'eventCategory': '$.detail.eventTypeCategory',
                                'startTime': '$.detail.startTime'
                            },
                            'InputTemplate': '{ "eventArn": <eventArn>, "service": <service>, "eventType": <eventType>, "eventCategory": <eventCategory>, "startTime": <startTime> }'
                        }
                    }
                ]
            )
            
            return {
                'success': True,
                'topic_arn': topic_arn,
                'rule_name': rule_name,
                'rule_arn': rule_response['RuleArn']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_health_alert(self, event_data, recipients):
        """Enviar alerta de salud"""
        
        try:
            # Formatear mensaje
            subject = f"AWS Health Alert: {event_data['service']} - {event_data['eventType']}"
            
            message = f"""
AWS Health Event Alert

Service: {event_data['service']}
Event Type: {event_data['eventType']}
Category: {event_data['eventCategory']}
Start Time: {event_data['startTime']}
Event ARN: {event_data['eventArn']}

Please check the AWS Health Dashboard for more details.
            """.strip()
            
            # Enviar a todos los recipients
            for recipient in recipients:
                self.sns.publish(
                    TopicArn=recipient,
                    Subject=subject,
                    Message=message,
                    MessageStructure='string'
                )
            
            return {
                'success': True,
                'recipients_notified': len(recipients),
                'service': event_data['service']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_health_slack_integration(self, webhook_url, channel_name):
        """Crear integración con Slack"""
        
        try:
            # Crear Lambda function para Slack integration
            lambda_client = boto3.client('lambda')
            
            lambda_code = """
import json
import urllib3
import os

def lambda_handler(event, context):
    # Parsear evento de AWS Health
    event_data = json.loads(event['Records'][0]['Sns']['Message'])
    
    # Formatear mensaje para Slack
    slack_message = {
        "channel": os.environ['SLACK_CHANNEL'],
        "username": "AWS Health Bot",
        "text": f"AWS Health Alert: {event_data['service']}",
        "attachments": [
            {
                "color": "danger" if event_data['eventCategory'] == 'issue' else "warning",
                "fields": [
                    {
                        "title": "Service",
                        "value": event_data['service'],
                        "short": True
                    },
                    {
                        "title": "Event Type",
                        "value": event_data['eventType'],
                        "short": True
                    },
                    {
                        "title": "Category",
                        "value": event_data['eventCategory'],
                        "short": True
                    },
                    {
                        "title": "Start Time",
                        "value": event_data['startTime'],
                        "short": True
                    }
                ]
            }
        ]
    }
    
    # Enviar a Slack
    http = urllib3.PoolManager()
    webhook_url = os.environ['SLACK_WEBHOOK_URL']
    
    response = http.request(
        'POST',
        webhook_url,
        body=json.dumps(slack_message).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Alert sent to Slack'})
    }
            """
            
            # Crear función Lambda
            lambda_response = lambda_client.create_function(
                FunctionName='health-slack-integration',
                Runtime='python3.9',
                Role='arn:aws:iam::123456789012:role/health-slack-role',
                Handler='lambda_function.lambda_handler',
                Code={'ZipFile': lambda_code.encode()},
                Environment={
                    'Variables': {
                        'SLACK_WEBHOOK_URL': webhook_url,
                        'SLACK_CHANNEL': channel_name
                    }
                },
                Timeout=30
            )
            
            # Configurar la función Lambda como target de EventBridge
            self.events.put_targets(
                Rule='health-events-slack',
                Targets=[
                    {
                        'Id': 'SlackIntegrationTarget',
                        'Arn': lambda_response['FunctionArn']
                    }
                ]
            )
            
            return {
                'success': True,
                'lambda_function': lambda_response['FunctionArn'],
                'slack_channel': channel_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Enterprise Health Monitoring**
```python
class EnterpriseHealthMonitor:
    def __init__(self):
        self.health_dashboard = AWSHealthDashboard()
        self.notification_manager = HealthNotificationManager()
    
    def setup_enterprise_monitoring(self, config):
        """Configurar monitoring empresarial"""
        
        setup_results = {}
        
        # Configurar dashboard principal
        dashboard_config = {
            'name': 'enterprise-health-dashboard',
            'refresh_interval': 300
        }
        
        dashboard_result = self.health_dashboard.create_health_dashboard(dashboard_config)
        setup_results['dashboard'] = dashboard_result
        
        # Configurar notificaciones
        notification_config = {
            'name': 'enterprise-health-notifications',
            'topic_name': 'enterprise-health-alerts',
            'recipients': config['notification_recipients']
        }
        
        notification_result = self.notification_manager.setup_health_notifications(notification_config)
        setup_results['notifications'] = notification_result
        
        # Configurar integración con Slack
        if config.get('slack_webhook'):
            slack_result = self.notification_manager.create_health_slack_integration(
                config['slack_webhook'],
                config['slack_channel']
            )
            setup_results['slack'] = slack_result
        
        return setup_results
    
    def generate_health_report(self, hours=24):
        """Generar reporte de salud"""
        
        # Obtener eventos recientes
        health_status = self.health_dashboard.get_service_health_status()
        
        if not health_status['success']:
            return health_status
        
        # Filtrar eventos del período especificado
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_events = [
            event for event in health_status['events']
            if event['start_time'] > cutoff_time
        ]
        
        # Analizar eventos
        report = {
            'report_period': f"Last {hours} hours",
            'total_events': len(recent_events),
            'events_by_category': {},
            'events_by_service': {},
            'events_by_status': {},
            'critical_events': [],
            'upcoming_changes': [],
            'recommendations': []
        }
        
        for event in recent_events:
            # Categorización
            category = event['event_type_category']
            report['events_by_category'][category] = report['events_by_category'].get(category, 0) + 1
            
            # Por servicio
            service = event['service']
            report['events_by_service'][service] = report['events_by_service'].get(service, 0) + 1
            
            # Por estado
            status = event['status']
            report['events_by_status'][status] = report['events_by_status'].get(status, 0) + 1
            
            # Eventos críticos
            if category == 'issue' and status == 'open':
                report['critical_events'].append(event)
            
            # Cambios programados
            if category == 'scheduledChange' and status == 'upcoming':
                report['upcoming_changes'].append(event)
        
        # Generar recomendaciones
        if report['critical_events']:
            report['recommendations'].append('Review and address critical service issues immediately')
        
        if report['upcoming_changes']:
            report['recommendations'].append('Prepare for scheduled changes and maintenance')
        
        if len(report['events_by_service']) > 5:
            report['recommendations'].append('Consider implementing service-specific monitoring')
        
        return {
            'success': True,
            'health_report': report
        }
    
    def monitor_service_impact(self, service_name):
        """Monitorear impacto en servicio específico"""
        
        # Obtener eventos del servicio
        health_status = self.health_dashboard.get_service_health_status()
        
        if not health_status['success']:
            return health_status
        
        service_events = [
            event for event in health_status['events']
            if event['service'] == service_name
        ]
        
        # Analizar impacto
        impact_analysis = {
            'service_name': service_name,
            'total_events': len(service_events),
            'active_issues': 0,
            'upcoming_changes': 0,
            'recent_notifications': 0,
            'affected_resources': []
        }
        
        for event in service_events:
            if event['event_type_category'] == 'issue' and event['status'] == 'open':
                impact_analysis['active_issues'] += 1
                
                # Obtener entidades afectadas
                affected_entities = self.health_dashboard.get_affected_entities(event['arn'])
                if affected_entities['success']:
                    impact_analysis['affected_resources'].extend(affected_entities['affected_entities'])
            
            if event['event_type_category'] == 'scheduledChange' and event['status'] == 'upcoming':
                impact_analysis['upcoming_changes'] += 1
            
            if event['event_type_category'] == 'accountNotification':
                impact_analysis['recent_notifications'] += 1
        
        return {
            'success': True,
            'impact_analysis': impact_analysis
        }
```

### **2. Proactive Change Management**
```python
class ChangeManagementSystem:
    def __init__(self):
        self.health_dashboard = AWSHealthDashboard()
        self.notification_manager = HealthNotificationManager()
    
    def monitor_scheduled_changes(self, days_ahead=7):
        """Monitorear cambios programados"""
        
        # Obtener eventos de cambios programados
        health_status = self.health_dashboard.get_service_health_status()
        
        if not health_status['success']:
            return health_status
        
        # Filtrar cambios programados
        cutoff_time = datetime.utcnow() + timedelta(days=days_ahead)
        scheduled_changes = []
        
        for event in health_status['events']:
            if (event['event_type_category'] == 'scheduledChange' and 
                event['status'] == 'upcoming' and
                event['start_time'] <= cutoff_time):
                
                scheduled_changes.append(event)
        
        # Analizar cambios
        change_analysis = {
            'changes_ahead': days_ahead,
            'total_changes': len(scheduled_changes),
            'changes_by_service': {},
            'changes_by_timeline': {},
            'high_priority_changes': [],
            'resource_impacts': []
        }
        
        for change in scheduled_changes:
            service = change['service']
            change_analysis['changes_by_service'][service] = change_analysis['changes_by_service'].get(service, 0) + 1
            
            # Agrupar por timeline
            start_date = change['start_time'].date()
            if str(start_date) not in change_analysis['changes_by_timeline']:
                change_analysis['changes_by_timeline'][str(start_date)] = []
            change_analysis['changes_by_timeline'][str(start_date)].append(change)
            
            # Identificar cambios de alta prioridad
            if 'critical' in change['event_type_code'].lower() or 'urgent' in change['event_type_code'].lower():
                change_analysis['high_priority_changes'].append(change)
            
            # Obtener recursos afectados
            affected_entities = self.health_dashboard.get_affected_entities(change['arn'])
            if affected_entities['success']:
                change_analysis['resource_impacts'].extend(affected_entities['affected_entities'])
        
        return {
            'success': True,
            'change_analysis': change_analysis
        }
    
    def create_change_calendar(self, days_ahead=30):
        """Crear calendario de cambios"""
        
        changes_result = self.monitor_scheduled_changes(days_ahead)
        
        if not changes_result['success']:
            return changes_result
        
        change_analysis = changes_result['change_analysis']
        
        # Crear calendario estructurado
        calendar = {
            'period': f"Next {days_ahead} days",
            'total_changes': change_analysis['total_changes'],
            'daily_schedule': {},
            'service_impact': {},
            'recommendations': []
        }
        
        # Organizar por día
        for date_str, changes in change_analysis['changes_by_timeline'].items():
            calendar['daily_schedule'][date_str] = {
                'date': date_str,
                'change_count': len(changes),
                'services': list(set(change['service'] for change in changes)),
                'changes': changes
            }
        
        # Analizar impacto por servicio
        for service, count in change_analysis['changes_by_service'].items():
            calendar['service_impact'][service] = {
                'change_count': count,
                'impact_level': 'high' if count > 3 else 'medium' if count > 1 else 'low'
            }
        
        # Generar recomendaciones
        if change_analysis['high_priority_changes']:
            calendar['recommendations'].append('High priority changes require immediate attention')
        
        high_impact_services = [
            service for service, impact in calendar['service_impact'].items()
            if impact['impact_level'] == 'high'
        ]
        
        if high_impact_services:
            calendar['recommendations'].append(f'Services with high impact: {", ".join(high_impact_services)}')
        
        return {
            'success': True,
            'change_calendar': calendar
        }
    
    def notify_change_reminders(self, hours_before=24):
        """Enviar recordatorios de cambios"""
        
        # Obtener cambios en las próximas horas
        cutoff_time = datetime.utcnow() + timedelta(hours=hours_before)
        
        health_status = self.health_dashboard.get_service_health_status()
        
        if not health_status['success']:
            return health_status
        
        upcoming_changes = []
        
        for event in health_status['events']:
            if (event['event_type_category'] == 'scheduledChange' and 
                event['status'] == 'upcoming' and
                event['start_time'] <= cutoff_time):
                
                upcoming_changes.append(event)
        
        # Enviar notificaciones
        notifications_sent = 0
        
        for change in upcoming_changes:
            # Obtener detalles del cambio
            details = self.health_dashboard.get_event_details([change['arn']])
            
            if details['success'] and details['event_details']:
                event_detail = details['event_details'][0]
                
                # Enviar notificación
                notification_data = {
                    'eventArn': change['arn'],
                    'service': change['service'],
                    'eventType': change['event_type_code'],
                    'eventCategory': change['event_type_category'],
                    'startTime': change['start_time'].isoformat(),
                    'description': event_detail.get('event_description', {}).get('latestDescription', 'No description available')
                }
                
                notification_result = self.notification_manager.send_health_alert(
                    notification_data,
                    ['arn:aws:sns:us-east-1:123456789012:change-notifications']
                )
                
                if notification_result['success']:
                    notifications_sent += 1
        
        return {
            'success': True,
            'changes_found': len(upcoming_changes),
            'notifications_sent': notifications_sent
        }
```

## Integration con otros servicios

### **CloudWatch Integration**
```python
class HealthCloudWatchIntegration:
    def __init__(self):
        self.health = boto3.client('health')
        self.cloudwatch = boto3.client('cloudwatch')
    
    def create_health_metrics(self, service_name):
        """Crear métricas de salud en CloudWatch"""
        
        try:
            # Métrica de eventos activos
            self.cloudwatch.put_metric_data(
                Namespace='AWS/Health',
                MetricData=[
                    {
                        'MetricName': 'ActiveEvents',
                        'Value': 0,
                        'Unit': 'Count',
                        'Timestamp': datetime.utcnow(),
                        'Dimensions': [
                            {
                                'Name': 'Service',
                                'Value': service_name
                            }
                        ]
                    }
                ]
            )
            
            # Métrica de cambios programados
            self.cloudwatch.put_metric_data(
                Namespace='AWS/Health',
                MetricData=[
                    {
                        'MetricName': 'ScheduledChanges',
                        'Value': 0,
                        'Unit': 'Count',
                        'Timestamp': datetime.utcnow(),
                        'Dimensions': [
                            {
                                'Name': 'Service',
                                'Value': service_name
                            }
                        ]
                    }
                ]
            )
            
            return {
                'success': True,
                'service': service_name,
                'metrics_created': True
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_health_alarms(self, service_name):
        """Configurar alarmas de salud"""
        
        try:
            # Alarm para eventos activos
            self.cloudwatch.put_metric_alarm(
                AlarmName=f'Health-ActiveEvents-{service_name}',
                AlarmDescription=f'Active health events for {service_name}',
                MetricName='ActiveEvents',
                Namespace='AWS/Health',
                Statistic='Sum',
                Period=300,
                EvaluationPeriods=1,
                Threshold=1,
                ComparisonOperator='GreaterThanThreshold',
                Dimensions=[
                    {
                        'Name': 'Service',
                        'Value': service_name
                    }
                ],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:health-alerts'
                ]
            )
            
            # Alarm para cambios programados
            self.cloudwatch.put_metric_alarm(
                AlarmName=f'Health-ScheduledChanges-{service_name}',
                AlarmDescription=f'Scheduled changes for {service_name}',
                MetricName='ScheduledChanges',
                Namespace='AWS/Health',
                Statistic='Sum',
                Period=300,
                EvaluationPeriods=1,
                Threshold=1,
                ComparisonOperator='GreaterThanThreshold',
                Dimensions=[
                    {
                        'Name': 'Service',
                        'Value': service_name
                    }
                ],
                AlarmActions=[
                    'arn:aws:sns:us-east-1:123456789012:change-notifications'
                ]
            )
            
            return {
                'success': True,
                'service': service_name,
                'alarms_configured': 2
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Security y Best Practices

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "health:DescribeEvents",
        "health:DescribeEventDetails",
        "health:DescribeAffectedEntities",
        "health:DescribeEventAggregates",
        "health:DescribeAffectedAccountsForOrganization"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "health:DescribeEventsForOrganization",
        "health:DescribeAffectedEntitiesForOrganization",
        "health:DescribeEventDetailsForOrganization"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-1234567890"
        }
      }
    }
  ]
}
```

## Best Practices

### **1. Monitoring**
- Configurar notificaciones proactivas
- Monitorear eventos críticos
- Implementar dashboards personalizados
- Revisar eventos regularmente

### **2. Change Management**
- Planificar para cambios programados
- Comunicar cambios a equipos afectados
- Documentar impactos de cambios
- Implementar rollback plans

### **3. Organizational View**
- Usar management account para visibility
- Configurar cross-account monitoring
- Implementar escalas de responsabilidad
- Centralizar notificaciones

### **4. Automation**
- Automatizar respuestas a eventos
- Integrar con sistemas de ticketing
- Implementar auto-remediation
- Usar EventBridge para workflows

## Cost Management

### **Pricing Components**
- **AWS Health**: Gratuito
- **SNS notifications**: $0.50 por millón de publicaciones
- **CloudWatch metrics**: $0.30 por métrica por mes
- **CloudWatch alarms**: $0.10 por alarm por mes

### **Cost Optimization**
```python
def calculate_health_costs(sns_notifications, cloudwatch_metrics, cloudwatch_alarms):
    """Calcular costos de Health Dashboard"""
    
    # SNS notifications cost
    sns_cost = (sns_notifications / 1000000) * 0.50
    
    # CloudWatch metrics cost
    metrics_cost = cloudwatch_metrics * 0.30
    
    # CloudWatch alarms cost
    alarms_cost = cloudwatch_alarms * 0.10
    
    total_cost = sns_cost + metrics_cost + alarms_cost
    
    return {
        'sns_cost': sns_cost,
        'metrics_cost': metrics_cost,
        'alarms_cost': alarms_cost,
        'total_monthly_cost': total_cost
    }
```

## Conclusion

AWS Health Dashboard es fundamental para el monitoreo proactivo de la infraestructura AWS, proporcionando visibilidad centralizada sobre eventos de servicio, cambios programados y notificaciones de salud. Es esencial para la gestión de incidentes, planificación de cambios, y mantenimiento de la disponibilidad y salud de los servicios AWS en entornos empresariales y multi-cuenta.
