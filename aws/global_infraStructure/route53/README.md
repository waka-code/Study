# AWS Route 53

## Definición

AWS Route 53 es un servicio de DNS (Domain Name System) escalable y altamente disponible que proporciona traducción de nombres de dominio a direcciones IP de manera confiable y rentable. Ofrece registro de dominios, enrutamiento inteligente, health checks y monitoreo, siendo fundamental para aplicaciones globales y distribuidas.

## Características Principales

### 1. **DNS Escalable**
- Alta disponibilidad (99.99% SLA)
- Baja latencia global
- Escalado automático
- Integración con otros servicios AWS

### 2. **Enrutamiento Inteligente**
- Multiple routing policies
- Geolocation routing
- Latency-based routing
- Weighted routing
- Failover routing

### 3. **Health Monitoring**
- Health checks automáticos
- Monitoreo de endpoints
- Failover automático
- Alerting integrado

### 4. **Registro de Dominios**
- Registro de dominios
- Transferencia de dominios
- Gestión de DNS
- Auto-renewal

## Componentes Clave

### **Hosted Zone**
- Contenedor de registros DNS
- Configuración por dominio
- Private vs Public zones
- Delegation sets

### **Record Sets**
- Registros DNS individuales
- Multiple types (A, AAAA, CNAME, MX, etc.)
- TTL configuration
- Routing policies

### **Health Checks**
- Monitoreo de endpoints
- Configuración de thresholds
- Geographic testing
- Integration with routing

### **Domain Registration**
- Registro de dominios
- WHOIS privacy
- DNSSEC
- Auto-renewal

## Tipos de Routing Policies

### **Simple Routing**
```bash
# Basic A record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://simple-record.json

# simple-record.json
{
  "Comment": "Simple A record",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.1"
          }
        ]
      }
    }
  ]
}
```

### **Weighted Routing**
```bash
# Weighted routing for A/B testing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://weighted-record.json

# weighted-record.json
{
  "Comment": "Weighted routing",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "Server-A",
        "Weight": 70,
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.1"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "Server-B",
        "Weight": 30,
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.2"
          }
        ]
      }
    }
  ]
}
```

### **Latency-Based Routing**
```bash
# Latency-based routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://latency-record.json

# latency-record.json
{
  "Comment": "Latency-based routing",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "US-East",
        "Region": "us-east-1",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "192.0.2.1"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "EU-West",
        "Region": "eu-west-1",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "192.0.2.2"
          }
        ]
      }
    }
  ]
}
```

### **Geolocation Routing**
```bash
# Geolocation routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://geolocation-record.json

# geolocation-record.json
{
  "Comment": "Geolocation routing",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "US",
        "GeoLocation": {
          "CountryCode": "US"
        },
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.1"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "EU",
        "GeoLocation": {
          "CountryCode": "DE"
        },
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.2"
          }
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "Default",
        "GeoLocation": {
          "CountryCode": "*"
        },
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "192.0.2.3"
          }
        ]
      }
    }
  ]
}
```

### **Failover Routing**
```bash
# Failover routing with health checks
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-record.json

# failover-record.json
{
  "Comment": "Failover routing",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "Primary",
        "Failover": "PRIMARY",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "192.0.2.1"
          }
        ],
        "HealthCheckId": "12345678-1234-1234-1234-123456789012"
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "SetIdentifier": "Secondary",
        "Failover": "SECONDARY",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "192.0.2.2"
          }
        ],
        "HealthCheckId": "87654321-4321-4321-4321-210987654321"
      }
    }
  ]
}
```

## Health Checks

### **Crear Health Check**
```bash
# Crear health check básico
aws route53 create-health-check \
  --caller-reference my-app-health-check-2023 \
  --health-check-config file://health-check-config.json

# health-check-config.json
{
  "IPAddress": "192.0.2.1",
  "Port": 80,
  "Type": "HTTP",
  "ResourcePath": "/health",
  "FullyQualifiedDomainName": "www.example.com",
  "SearchString": "OK",
  "RequestInterval": 30,
  "FailureThreshold": 3,
  "MeasureLatency": true,
  "EnableSNI": true,
  "Inverted": false,
  "Disabled": false,
  "HealthThreshold": 3
}
```

### **Health Check Avanzado**
```bash
# Health check con CloudWatch alarm
aws route53 create-health-check \
  --caller-reference cloudwatch-alarm-check \
  --health-check-config file://cloudwatch-health-check.json

# cloudwatch-health-check.json
{
  "Type": "CALCULATED",
  "CloudWatchAlarmRegion": "us-east-1",
  "CloudWatchAlarmName": "MyApp-Alarm",
  "InsufficientDataHealthStatus": "Failure",
  "EnableSNI": true,
  "FailureThreshold": 3
}
```

### **Monitoreo de Health Checks**
```bash
# Listar health checks
aws route53 list-health-checks

# Obtener detalles de health check
aws route53 get-health-check-status \
  --health-check-id 12345678-1234-1234-1234-123456789012

# Actualizar health check
aws route53 update-health-check \
  --health-check-id 12345678-1234-1234-1234-123456789012 \
  --failure-threshold 5 \
  --resource-path "/api/health"
```

## Domain Registration

### **Registrar Dominio**
```bash
# Verificar disponibilidad
aws route53 check-domain-availability --domain-name example.com

# Registrar dominio
aws route53 register-domain \
  --domain-name example.com \
  --duration-in-years 1 \
  --auto-renew \
  --admin-contact file://admin-contact.json \
  --registrant-contact file://registrant-contact.json \
  --tech-contact file://tech-contact.json

# admin-contact.json
{
  "FirstName": "John",
  "LastName": "Doe",
  "ContactType": "PERSON",
  "OrganizationName": "Example Corp",
  "AddressLine1": "123 Main St",
  "City": "Seattle",
  "State": "WA",
  "CountryCode": "US",
  "ZipCode": "98101",
  "PhoneNumber": "+1.2065551212",
  "Email": "john.doe@example.com"
}
```

### **Gestión de Dominios**
```bash
# Listar dominios
aws route53 list-domains

# Obtener detalles del dominio
aws route53 get-domain-detail --domain-name example.com

# Transferir dominio
aws route53 transfer-domain \
  --domain-name example.com \
  --auth-code "AUTH_CODE_HERE"

# Renovar dominio
aws route53 renew-domain \
  --domain-name example.com \
  --current-expiration-year 2023
```

## Private Hosted Zones

### **Crear Private Hosted Zone**
```bash
# Crear private hosted zone
aws route53 create-hosted-zone \
  --name example.local \
  --vpc VPCRegion=us-east-1,VPCId=vpc-12345678 \
  --caller-reference private-zone-2023

# Agregar registro privado
aws route53 change-resource-record-sets \
  --hosted-zone-id ZPRIVATE123456 \
  --change-batch file://private-record.json

# private-record.json
{
  "Comment": "Private A record",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "database.example.local",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "10.0.1.100"
          }
        ]
      }
    }
  ]
}
```

### **Associate VPC**
```bash
# Asociar VPC a hosted zone
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id ZPRIVATE123456 \
  --vpc VPCRegion=us-west-2,VPCId=vpc-87654321

# Listar VPCs asociadas
aws route53 get-hosted-zone \
  --id ZPRIVATE123456
```

## DNSSEC

### **Habilitar DNSSEC**
```bash
# Habilitar DNSSEC signing
aws route53 enable-hosted-zone-dnssec \
  --hosted-zone-id Z1234567890ABC

# Crear KSK
aws route53 create-key-signing-key \
  --hosted-zone-id Z1234567890ABC \
  --key-signing-key file://ksk-config.json

# ksk-config.json
{
  "Name": "ks1.example.com",
  "Status": "ACTIVE"
}

# Activar DNSSEC
aws route53 activate-key-signing-key \
  --hosted-zone-id Z1234567890ABC \
  --key-signing-key-id 12345678-1234-1234-1234-123456789012
```

## Resolver Rules

### **Resolver Endpoints**
```bash
# Crear resolver endpoint
aws route53 create-resolver-endpoint \
  --creator-request-id my-endpoint-2023 \
  --name MyResolverEndpoint \
  --direction INBOUND \
  --ip-addresses Ip=192.0.2.1,SubnetId=subnet-12345678 Ip=192.0.2.2,SubnetId=subnet-87654321 \
  --security-group-ids sg-12345678 sg-87654321

# Crear outbound endpoint
aws route53 create-resolver-endpoint \
  --creator-request-id outbound-endpoint-2023 \
  --name MyOutboundEndpoint \
  --direction OUTBOUND \
  --ip-addresses Ip=192.0.2.3,SubnetId=subnet-12345678 \
  --security-group-ids sg-12345678
```

### **Resolver Rules**
```bash
# Crear resolver rule
aws route53 create-resolver-rule \
  --creator-request-id my-rule-2023 \
  --name ForwardToOnPremDNS \
  --rule-type FORWARD \
  --domain-name corp.example.com \
  --target-ips Ip=192.168.1.10,Port=53 Ip=192.168.1.11,Port=53 \
  --resolver-endpoint-id rslvr-out-1234567890abcdef

# Asociar rule a VPC
aws route53 associate-resolver-rule \
  --resolver-rule-id rslvr-1234567890abcdef \
  --name my-association \
  --vpc-id vpc-12345678
```

## Integration con Servicios AWS

### **CloudFront Integration**
```bash
# Alias para CloudFront distribution
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://cloudfront-alias.json

# cloudfront-alias.json
{
  "Comment": "CloudFront alias",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "cdn.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d123456789.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
```

### **ELB Integration**
```bash
# Alias para ELB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://elb-alias.json

# elb-alias.json
{
  "Comment": "ELB alias",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-load-balancer-1234567890.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

### **API Gateway Integration**
```bash
# Alias para API Gateway
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://api-gateway-alias.json

# api-gateway-alias.json
{
  "Comment": "API Gateway alias",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z1UJRXO18O2OVW",
          "DNSName": "d123456789.execute-api.us-east-1.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

## Monitoring y Logging

### **CloudWatch Metrics**
```bash
# Métricas de Route 53
aws cloudwatch get-metric-statistics \
  --namespace AWS/Route53 \
  --metric-name HealthCheckPercentageHealthy \
  --dimensions Name=HealthCheckId,Value=12345678-1234-1234-1234-123456789012 \
  --statistics Average \
  --period 300 \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

### **Query Logging**
```bash
# Habilitar query logging
aws route53 create-query-logging-config \
  --hosted-zone-id Z1234567890ABC \
  --cloud-watch-logs-log-group-arn arn:aws:logs:us-east-1:123456789012:log-group:route53-queries

# Listar query logging configs
aws route53 list-query-logging-configs

# Ver detalles de logging
aws route53 get-query-logging-config \
  --id 12345678-1234-1234-1234-123456789012
```

## Security

### **IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:GetHostedZone",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:CreateHealthCheck",
        "route53:UpdateHealthCheck",
        "route53:DeleteHealthCheck"
      ],
      "Resource": "*"
    }
  ]
}
```

### **DNS Firewall**
```bash
# Crear DNS firewall rule group
aws route53resolver create-firewall-rule-group \
  --name MyFirewallRuleGroup \
  --creator-request-id firewall-2023 \
  --rule-group file://firewall-rules.json

# firewall-rules.json
{
  "Rules": [
    {
      "Name": "BlockMaliciousDomains",
      "Action": "BLOCK",
      "BlockOverrideDomain": "blocked.example.com",
      "BlockOverrideDnsType": "CNAME",
      "BlockOverrideTtl": 300,
      "FirewallDomainListId": "fdl-1234567890abcdef"
    }
  ]
}

# Asociar firewall a VPC
aws route53resolver associate-firewall-rule-group \
  --firewall-rule-group-id frg-1234567890abcdef \
  --vpc-id vpc-12345678 \
  --name my-firewall-association \
  --priority 100
```

## Best Practices

### **1. Routing Strategy**
- Usar latency-based routing para performance
- Implementar failover para alta disponibilidad
- Configurar geolocation para cumplimiento regulatorio
- Weighted routing para testing gradual

### **2. Health Monitoring**
- Health checks para todos los endpoints críticos
- Configurar thresholds apropiados
- Monitorear desde múltiples ubicaciones
- Integrar con alerting

### **3. Security**
- DNSSEC para integridad de DNS
- Private hosted zones para recursos internos
- DNS firewall para protección
- IAM permissions granulares

### **4. Performance**
- TTL optimizado para balance entre cache y updates
- Edge locations para baja latencia
- Query logging para debugging
- Regular DNS monitoring

## Use Cases

### **1. Global Applications**
- Latency-based routing
- Geolocation routing
- Multi-region failover
- CDN integration

### **2. Disaster Recovery**
- Failover routing
- Health checks automáticos
- Regional redundancy
- Quick failover

### **3. Multi-tenant SaaS**
- Subdomain routing
- Tenant-specific routing
- Load balancing
- Custom DNS

### **4. Enterprise DNS**
- Private hosted zones
- DNS resolver rules
- On-premises integration
- Security policies

## Cost Management

### **Pricing**
- **Hosted Zones**: $0.50 por mes por hosted zone
- **Health Checks**: $0.50 por health check por mes
- **Queries**: $0.40 por millón de queries (primer billón)
- **Domain Registration**: Variable por TLD

### **Cost Optimization**
```bash
# Monitor DNS query costs
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-01-31 \
  --filter file://route53-cost-filter.json \
  --granularity MONTHLY

# route53-cost-filter.json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Route 53"]
  }
}
```

## Troubleshooting

### **Common Issues**
- **DNS propagation**: TTL settings
- **Health check failures**: Endpoint availability
- **Routing issues**: Policy configuration
- **Domain registration**: WHOIS verification

### **Debug Commands**
```bash
# Verificar DNS resolution
nslookup www.example.com
dig www.example.com

# Verificar health check status
aws route53 get-health-check-status \
  --health-check-id 12345678-1234-1234-1234-123456789012

# Verificar change status
aws route53 get-change --id C1234567890

# Listar hosted zones
aws route53 list-hosted-zones
```

## Conclusion

AWS Route 53 es fundamental para aplicaciones modernas, proporcionando DNS escalable, enrutamiento inteligente y monitoreo de salud. Es esencial para aplicaciones globales, disaster recovery y optimización de rendimiento, integrándose perfectamente con el ecosistema AWS para proporcionar infraestructura DNS robusta y flexible.
