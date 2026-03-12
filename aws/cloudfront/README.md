# AWS CloudFront

## Definición

AWS CloudFront es una Content Delivery Network (CDN) global de alta velocidad que entrega contenido estático y dinámico a los usuarios con baja latencia y alta transferencia de datos. Utiliza una red global de edge locations para cachear contenido cerca de los usuarios, mejorando significativamente el rendimiento y la experiencia del usuario.

## Características Principales

### 1. **CDN Global**
- 400+ edge locations worldwide
- Baja latencia global
- Alta disponibilidad
- Auto-scaling automático

### 2 **Caching Inteligente**
- Multiple cache behaviors
- Cache TTL configuration
- Cache invalidation
- Edge caching

### 3. **Seguridad**
- DDoS protection
- WAF integration
- SSL/TLS certificates
- Origin access control

### 4. **Flexibilidad**
- Static and dynamic content
- Multiple origins
- Custom domains
- Lambda@Edge functions

## Componentes Clave

### **Distribution**
- Configuración principal de CDN
- Cache behaviors
- Origins configuration
- Security settings

### **Origin**
- Fuente del contenido
- S3 buckets
- Custom origins
- Origin groups

### **Cache Behavior**
- Reglas de caché
- Path patterns
- Headers/cookies/query strings
- TTL settings

### **Edge Function**
- Lambda@Edge functions
- Custom logic at edge
- Request/response modification
- A/B testing

## Tipos de Distribuciones

### **Web Distribution**
```bash
# Crear web distribution
aws cloudfront create-distribution \
  --distribution-config file://web-distribution.json

# web-distribution.json
{
  "CallerReference": "my-web-distribution-2023",
  "Comment": "Web distribution for my application",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-my-app-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "MaxTTL": 31536000,
    "DefaultTTL": 86400,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    }
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-my-app-origin",
        "DomainName": "my-app-bucket.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/E1234567890ABCDEF"
        }
      }
    ]
  },
  "DefaultRootObject": "index.html",
  "Enabled": true,
  "PriceClass": "PriceClass_All",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
```

### **RTMP Distribution**
```bash
# Crear RTMP distribution para streaming
aws cloudfront create-streaming-distribution \
  --streaming-distribution-config file://rtmp-distribution.json

# rtmp-distribution.json
{
  "CallerReference": "my-rtmp-distribution-2023",
  "Comment": "RTMP distribution for video streaming",
  "S3Origin": {
    "DomainName": "my-video-bucket.s3.amazonaws.com",
    "OriginAccessIdentity": "origin-access-identity/cloudfront/E1234567890ABCDEF"
  },
  "Enabled": true,
  "TrustedSigners": {
    "Enabled": false,
    "Quantity": 0
  }
}
```

## Origins Configuration

### **S3 Origin**
```bash
# Crear Origin Access Identity (OAI)
aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config file://oai-config.json

# oai-config.json
{
  "CallerReference": "my-app-oai-2023",
  "Comment": "Origin Access Identity for my application"
}

# Configurar bucket policy para OAI
aws s3api put-bucket-policy \
  --bucket my-app-bucket \
  --policy file://bucket-policy.json

# bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E1234567890ABCDEF"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-app-bucket/*"
    }
  ]
}
```

### **Custom Origin**
```bash
# Custom origin para ALB
{
  "Id": "ALB-my-app-origin",
  "DomainName": "my-load-balancer-1234567890.us-east-1.elb.amazonaws.com",
  "CustomOriginConfig": {
    "HTTPPort": 80,
    "HTTPSPort": 443,
    "OriginProtocolPolicy": "https-only",
    "OriginSslProtocols": {
      "Quantity": 3,
      "Items": ["TLSv1.1", "TLSv1.2", "SSLv3"]
    },
    "OriginReadTimeout": 30,
    "OriginKeepaliveTimeout": 5
  }
}
```

### **Origin Groups**
```bash
# Origin group para failover
{
  "Id": "origin-group-1",
  "Members": {
    "Quantity": 2,
    "Items": [
      {
        "OriginId": "primary-origin",
        "OriginPath": ""
      },
      {
        "OriginId": "failover-origin",
        "OriginPath": ""
      }
    ]
  },
  "FailoverCriteria": {
    "StatusCodes": {
      "Quantity": 3,
      "Items": ["403", "404", "500"]
    }
  }
}
```

## Cache Behaviors

### **Multiple Cache Behaviors**
```bash
# Cache behavior para API endpoints
{
  "PathPattern": "/api/*",
  "TargetOriginId": "ALB-my-app-origin",
  "ViewerProtocolPolicy": "https-only",
  "MinTTL": 0,
  "MaxTTL": 300,
  "DefaultTTL": 60,
  "ForwardedValues": {
    "QueryString": true,
    "Headers": {
      "Quantity": 2,
      "Items": ["Authorization", "Content-Type"]
    },
    "Cookies": {
      "Forward": "whitelisted",
      "WhitelistedNames": {
        "Quantity": 1,
        "Items": ["session_id"]
      }
    }
  },
  "AllowedMethods": {
    "Quantity": 7,
    "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
    "CachedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"]
    }
  },
  "Compress": true,
  "SmoothStreaming": false
}

# Cache behavior para assets estáticos
{
  "PathPattern": "/assets/*",
  "TargetOriginId": "S3-my-app-origin",
  "ViewerProtocolPolicy": "redirect-to-https",
  "MinTTL": 2592000,
  "MaxTTL": 31536000,
  "DefaultTTL": 2592000,
  "ForwardedValues": {
    "QueryString": false,
    "Cookies": {
      "Forward": "none"
    }
  },
  "Compress": true
}
```

### **Cache Key Configuration**
```bash
# Cache key avanzado
{
  "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
  "OriginRequestPolicyId": "88a5eaf4-2fd4-404c-8a7b-0b8d3e2f5a1b",
  "Compress": true,
  "MinTTL": 0,
  "MaxTTL": 86400,
  "DefaultTTL": 3600
}
```

## Lambda@Edge

### **Viewer Request Function**
```javascript
// viewer-request.js
'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // Añadir headers personalizados
    headers['x-custom-header'] = [{
        key: 'X-Custom-Header',
        value: 'Edge-Processing'
    }];
    
    // Redireccionar basado en User-Agent
    if (headers['user-agent']) {
        const userAgent = headers['user-agent'][0].value;
        if (userAgent.includes('mobile')) {
            const newUri = '/mobile' + request.uri;
            request.uri = newUri;
        }
    }
    
    callback(null, request);
};
```

### **Origin Request Function**
```javascript
// origin-request.js
'use strict';

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    
    // Modificar query parameters
    const querystring = require('querystring');
    const params = querystring.parse(request.querystring);
    params['edge_timestamp'] = Date.now();
    request.querystring = querystring.stringify(params);
    
    // Añadir headers para origin
    request.headers['x-forwarded-for'] = [{
        key: 'X-Forwarded-For',
        value: event.Records[0].cf.request.clientIp
    }];
    
    callback(null, request);
};
```

### **Viewer Response Function**
```javascript
// viewer-response.js
'use strict';

exports.handler = (event, context, callback) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;
    
    // Añadir security headers
    headers['x-xss-protection'] = [{
        key: 'X-XSS-Protection',
        value: '1; mode=block'
    }];
    
    headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    }];
    
    headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
    }];
    
    // Comprimir respuestas
    if (response.headers['content-type']) {
        const contentType = response.headers['content-type'][0].value;
        if (contentType.includes('text/') || contentType.includes('application/json')) {
            headers['content-encoding'] = [{
                key: 'Content-Encoding',
                value: 'gzip'
            }];
        }
    }
    
    callback(null, response);
};
```

### **Desplegar Lambda@Edge**
```bash
# Crear función Lambda
aws lambda create-function \
  --function-name edge-viewer-request \
  --runtime nodejs14.x \
  --role arn:aws:iam::123456789012:role/lambda-edge-role \
  --handler viewer-request.handler \
  --zip-file fileb://edge-function.zip \
  --description "Viewer request function for CloudFront"

# Publicar versión
aws lambda publish-version \
  --function-name edge-viewer-request \
  --description "Version 1 for edge deployment"

# Asociar a CloudFront
aws cloudfront get-distribution-config \
  --id E1234567890ABCDEF \
  --query 'DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations' \
  --output text > lambda-associations.json

# Actualizar configuración
aws cloudfront update-distribution \
  --id E1234567890ABCDEF \
  --distribution-config file://updated-distribution.json \
  --if-match E1234567890ABCDEF
```

## Security

### **SSL/TLS Configuration**
```bash
# Configurar certificado SSL
{
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    "CertificateSource": "acm"
  }
}
```

### **WAF Integration**
```bash
# Asociar WAF Web ACL
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-web-acl/12345678-1234-1234-1234-123456789012 \
  --resource-arn arn:aws:cloudfront::123456789012:distribution/E1234567890ABCDEF
```

### **Signed URLs y Cookies**
```python
# Generar signed URL
import boto3
from datetime import datetime, timedelta
from botocore.signers import CloudFrontSigner

cloudfront = boto3.client('cloudfront')
signer = CloudFrontSigner('KEY_ID', 'PRIVATE_KEY')

def generate_signed_url(url, expiration_minutes=60):
    expire_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)
    
    signed_url = signer.generate_presigned_url(
        url,
        expire_time=expire_time
    )
    
    return signed_url

# Generar signed cookies
def generate_signed_cookies(url, expiration_minutes=60):
    expire_time = datetime.utcnow() + timedelta(minutes=expiration_minutes)
    
    signed_cookies = signer.generate_presigned_cookie(
        url,
        expire_time=expire_time,
        policy_url=None
    )
    
    return signed_cookies
```

## Cache Invalidation

### **Invalidación Básica**
```bash
# Invalidar archivos específicos
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABCDEF \
  --invalidation-batch file://invalidation.json

# invalidation.json
{
  "Paths": {
    "Quantity": 3,
    "Items": [
      "/index.html",
      "/css/main.css",
      "/js/app.js"
    ]
  },
  "CallerReference": "invalidation-2023-03-15-001"
}
```

### **Invalidación Masiva**
```bash
# Invalidar todo el sitio
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABCDEF \
  --paths "/*" \
  --caller-reference "full-site-invalidation-2023"

# Invalidar por patrón
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABCDEF \
  --paths "/images/*" "/videos/*" \
  --caller-reference "media-invalidation-2023"
```

### **Invalidación Automática**
```python
# Lambda function para invalidación automática
import boto3

def lambda_handler(event, context):
    cloudfront = cloudfront_client = boto3.client('cloudfront')
    
    # Obtener archivos modificados
    modified_files = event.get('modified_files', [])
    
    if modified_files:
        # Crear invalidación
        response = cloudfront.create_invalidation(
            DistributionId='E1234567890ABCDEF',
            InvalidationBatch={
                'Paths': {
                    'Quantity': len(modified_files),
                    'Items': modified_files
                },
                'CallerReference': f'auto-invalidation-{context.aws_request_id}'
            }
        )
        
        return {
            'statusCode': 200,
            'body': f'Invalidation created: {response["Invalidation"]["Id"]}'
        }
    
    return {
        'statusCode': 200,
        'body': 'No files to invalidate'
    }
```

## Monitoring y Logging

### **CloudWatch Metrics**
```bash
# Ver métricas de CloudFront
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E1234567890ABCDEF \
  --statistics Sum \
  --period 3600 \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-02T00:00:00Z
```

### **Real-time Logs**
```bash
# Configurar real-time logging
aws cloudfront create-realtime-log-config \
  --name my-realtime-log-config \
  --sampling-rate 100 \
  --fields "timestamp,time-to-first-byte,sc-bytes,c-status-method,sc-status,sc-content-type,c-cache-status,sc-bytes,cs-bytes,time-taken,cs-protocol,cs-host,cs-uri-stem,cs-uri-query,c-ip,x-forwarded-for,ssl-protocol,cipher,user-agent,cs-referer,cs-cookie,cs-user-agent,cs-uri-query,cs-method,cs-headers,cs-header-names,cs-headers-count,origin-fbl,origin-lbl,origin-connection-start,origin-dns-end,origin-connect-end,origin-ssl-end,origin-fbl-end,origin-lbl-end,origin-response-start,origin-response-end" \
  --sampling-rate 100 \
  --endpoint my-kinesis-stream.amazonaws.com \
  --iam-role-arn arn:aws:iam::123456789012:role/CloudFrontRealTimeLoggingRole
```

### **Access Logs**
```bash
# Configurar logging
{
  "Logging": {
    "Enabled": true,
    "IncludeCookies": false,
    "Bucket": "my-cloudfront-logs",
    "Prefix": "cloudfront-logs/"
  }
}
```

## Best Practices

### **1. Cache Optimization**
- TTL apropiados por tipo de contenido
- Cache keys eficientes
- Invalidación estratégica
- Edge caching

### **2. Performance**
- Comprimir contenido
- Optimizar imágenes
- HTTP/2 habilitado
- Edge locations cercanas

### **3. Security**
- HTTPS obligatorio
- WAF integration
- Signed URLs/Cookies
- Security headers

### **4. Cost Management**
- Price class optimization
- Cache hit ratio
- Data transfer optimization
- Regional edge caches

## Use Cases

### **1. Static Websites**
- CDN para assets estáticos
- Global distribution
- Low latency delivery
- High availability

### **2. Video Streaming**
- RTMP distributions
- Adaptive bitrate
- Global delivery
- DRM protection

### **3. API Acceleration**
- Lambda@Edge processing
- Cache API responses
- Geolocation routing
- Compression

### **4. E-commerce**
- Product images
- Dynamic content caching
- Personalization
- A/B testing

## Cost Management

### **Pricing Components**
- **Data Transfer**: $0.085 por GB (primer 10 TB)
- **Requests**: $0.0075 por 10,000 requests
- **Lambda@Edge**: $0.000004 por invocation
- **Real-time Logs**: $0.025 por millón de eventos

### **Cost Optimization**
```bash
# Monitor costos
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-01-31 \
  --filter file://cloudfront-cost-filter.json \
  --granularity MONTHLY

# cloudfront-cost-filter.json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon CloudFront"]
  }
}
```

## Troubleshooting

### **Common Issues**
- **Cache not updating**: TTL settings, invalidation
- **SSL errors**: Certificate configuration
- **Access denied**: Origin access, permissions
- **High latency**: Cache miss, origin performance

### **Debug Commands**
```bash
# Ver distribución status
aws cloudfront get-distribution --id E1234567890ABCDEF

# Ver invalidation status
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABCDEF \
  --id I1234567890ABCDEF

# Ver logs
aws s3 ls s3://my-cloudfront-logs/cloudfront-logs/

# Test con curl
curl -I https://d123456789.cloudfront.net/index.html
```

## Conclusion

AWS CloudFront es esencial para aplicaciones modernas que requieren entrega de contenido rápida y fiable a nivel global. Proporciona mejoras significativas de rendimiento, seguridad y escalabilidad, siendo fundamental para la experiencia del usuario y el éxito de aplicaciones distribuidas.
