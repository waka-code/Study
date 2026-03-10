# AWS OpsWorks

## Definición

AWS OpsWorks es un servicio de gestión de configuración que automatiza el aprovisionamiento, configuración, despliegue y gestión de aplicaciones utilizando Chef o Puppet. Proporciona una plataforma completa para gestionar el ciclo de vida completo de aplicaciones, desde el desarrollo hasta la producción, con capacidades de escalado automático y monitoreo.

## Características Principales

### 1. **Gestión de Configuración**
- Chef y Puppet integrados
- Recipes y cookbooks
- Configuración automatizada
- Version control

### 2. **Automatización**
- Despliegue automático
- Auto-scaling
- Health monitoring
- Event-driven actions

### 3. **Flexibilidad**
- Custom stacks
- Multiple layers
- Hybrid deployments
- Custom recipes

### 4. **Monitoring**
- Integrated CloudWatch
- Health checks
- Performance metrics
- Alerting

## Componentes Clave

### **Stack**
- Contenedor principal
- Configuración global
- Chef/Puppet settings
- Security groups

### **Layer**
- Agrupación de instancias
- Configuración específica
- Auto-scaling rules
- Load balancing

### **Instance**
- Servidores individuales
- EC2 instances
- Configuration management
- Monitoring

### **Application**
- Código de aplicación
- Deployment configuration
- Version control
- Environment settings

### **Recipe**
- Scripts de configuración
- Chef recipes
- Puppet manifests
- Custom scripts

## OpsWorks Stacks

### **Tipos de Stacks**
```bash
# Linux stacks
- Ubuntu 20.04 LTS
- Amazon Linux 2
- CentOS 7
- Red Hat Enterprise Linux

# Windows stacks
- Windows Server 2019
- Windows Server 2016

# Custom stacks
- Custom AMIs
- Custom configurations
- Hybrid environments
```

### **Stack Configuration**
```bash
# Crear stack
aws opsworks create-stack \
  --name my-web-stack \
  --region us-east-1 \
  --service-role-arn arn:aws:iam::123456789012:role/opsworks-service-role \
  --default-instance-profile-arn arn:aws:iam::123456789012:instance-profile/opsworks-instance-profile \
  --configuration-manager Name=Chef,Version=12 \
  --custom-json file://stack-config.json

# stack-config.json
{
  "apache": {
    "version": "2.4",
    "listen_ports": ["80", "443"]
  },
  "mysql": {
    "server_root_password": "secure_password",
    "server_repl_password": "repl_password"
  }
}
```

## Layers

### **Built-in Layers**
```bash
# Web server layer
aws opsworks create-layer \
  --stack-id my-stack-id \
  --type web \
  --name "Web Servers" \
  --shortname web \
  --auto-assign-elastic-ips \
  --auto-assign-public-ips \
  --custom-recipes file://web-recipes.json

# web-recipes.json
{
  "setup": [
    "myapp::install_dependencies",
    "myapp::configure_apache"
  ],
  "configure": [
    "myapp::configure_vhosts"
  ],
  "deploy": [
    "myapp::deploy_application"
  ],
  "undeploy": [
    "myapp::cleanup"
  ]
}
```

### **Custom Layers**
```bash
# Database layer
aws opsworks create-layer \
  --stack-id my-stack-id \
  --type custom \
  --name "Database Servers" \
  --shortname db \
  --attributes '{"EbsOptimized": "true"}' \
  --volume-configurations file://volume-config.json

# volume-config.json
[
  {
    "MountPoint": "/var/lib/mysql",
    "NumberOfDisks": 1,
    "Size": 100,
    "VolumeType": "gp2"
  }
]
```

### **Auto-scaling Configuration**
```bash
# Configurar auto-scaling
aws opsworks set-load-based-auto-scaling \
  --layer-id my-layer-id \
  --up-scaling file://up-scaling.json \
  --down-scaling file://down-scaling.json

# up-scaling.json
{
  "InstanceCount": 2,
  "ThresholdsWaitTime": 5,
  "IgnoreMetricsTime": 5,
  "Alarms": [
    {
      "AlarmName": "CPU-High",
      "MetricName": "CPUUtilization",
      "Namespace": "AWS/EC2",
      "Statistic": "Average",
      "Threshold": 70,
      "Period": 300,
      "EvaluationPeriods": 2,
      "ComparisonOperator": "GreaterThanThreshold",
      "Unit": "Percent"
    }
  ]
}
```

## Instances

### **Instance Management**
```bash
# Crear instancia
aws opsworks create-instance \
  --stack-id my-stack-id \
  --layer-ids my-layer-id \
  --instance-type t3.medium \
  --hostname web-01 \
  --os "Ubuntu 20.04 LTS" \
  --ssh-key-name my-keypair \
  --install-updates-on-boot

# Iniciar instancia
aws opsworks start-instance \
  --instance-id my-instance-id

# Detener instancia
aws opsworks stop-instance \
  --instance-id my-instance-id
```

### **Instance Configuration**
```bash
# Configurar atributos
aws opsworks assign-instance \
  --instance-id my-instance-id \
  --layer-ids my-layer-id

# Configurar auto-assignment
aws opsworks register-elastic-ip \
  --elastic-ip 54.123.45.67 \
  --instance-id my-instance-id
```

## Applications

### **Application Types**
```bash
# Static web app
aws opsworks create-app \
  --stack-id my-stack-id \
  --name "My Static Website" \
  --type static \
  --app-source '{"Type": "git", "Url": "https://github.com/user/my-static-site.git"}' \
  --domains ["myapp.example.com"]

# PHP application
aws opsworks create-app \
  --stack-id my-stack-id \
  --name "My PHP App" \
  --type php \
  --app-source '{"Type": "git", "Url": "https://github.com/user/my-php-app.git", "Revision": "main"}' \
  --document-root "public" \
  --environment-variables "DATABASE_URL=mysql://user:pass@localhost/db"

# Node.js application
aws opsworks create-app \
  --stack-id my-stack-id \
  --name "My Node App" \
  --type nodejs \
  --app-source '{"Type": "git", "Url": "https://github.com/user/my-node-app.git"}' \
  --nodejs-version "14.x"
```

### **Deployment Configuration**
```bash
# Deploy aplicación
aws opsworks create-deployment \
  --stack-id my-stack-id \
  --app-id my-app-id \
  --command '{"Name": "deploy"}'

# Deploy con variables de entorno
aws opsworks create-deployment \
  --stack-id my-stack-id \
  --app-id my-app-id \
  --command '{"Name": "deploy"}' \
  --custom-json '{"env": {"NODE_ENV": "production"}}'

# Deploy rollback
aws opsworks create-deployment \
  --stack-id my-stack-id \
  --app-id my-app-id \
  --command '{"Name": "rollback"}'
```

## Chef Recipes

### **Recipe Structure**
```ruby
# recipes/install_dependencies.rb
package 'apache2'
package 'php'
package 'php-mysql'
package 'php-gd'

# Enable and start services
service 'apache2' do
  action [:enable, :start]
end

# Configure Apache
template '/etc/apache2/sites-available/myapp.conf' do
  source 'apache_vhost.erb'
  owner 'root'
  group 'root'
  mode '0644'
  notifies :restart, 'service[apache2]', :immediately
end

# Enable site
execute 'enable-site' do
  command 'a2ensite myapp.conf'
  notifies :restart, 'service[apache2]', :immediately
end
```

### **Templates**
```erb
# templates/default/apache_vhost.erb
<VirtualHost *:80>
  ServerName <%= node['myapp']['server_name'] %>
  DocumentRoot <%= node['myapp']['document_root'] %>
  
  <Directory <%= node['myapp']['document_root'] %>>
    AllowOverride All
    Require all granted
  </Directory>
  
  ErrorLog ${APACHE_LOG_DIR}/myapp_error.log
  CustomLog ${APACHE_LOG_DIR}/myapp_access.log combined
</VirtualHost>
```

### **Attributes**
```ruby
# attributes/default.rb
default['myapp']['server_name'] = 'myapp.example.com'
default['myapp']['document_root'] = '/var/www/html'
default['myapp']['database_host'] = 'localhost'
default['myapp']['database_name'] = 'myapp_db'
default['myapp']['database_user'] = 'myapp_user'
```

### **Deploy Recipe**
```ruby
# recipes/deploy_application.rb
# Get deployment information
deploy = node[:deploy]['myapp']

# Create deploy directory
directory deploy[:deploy_to] do
  group deploy[:group]
  owner deploy[:user]
  mode '0755'
  recursive true
end

# Clone repository
git deploy[:deploy_to] do
  repository deploy[:scm][:repository]
  revision deploy[:scm][:revision]
  user deploy[:user]
  group deploy[:group]
  action deploy[:action]
end

# Install dependencies
execute 'npm install' do
  cwd deploy[:deploy_to]
  user deploy[:user]
  only_if { File.exist?(File.join(deploy[:deploy_to], 'package.json')) }
end

# Build application
execute 'npm run build' do
  cwd deploy[:deploy_to]
  user deploy[:user]
  only_if { File.exist?(File.join(deploy[:deploy_to], 'package.json')) }
end

# Restart application
service 'myapp' do
  action :restart
end
```

## Puppet Manifests

### **Puppet Configuration**
```puppet
# manifests/init.pp
class myapp {
  # Install packages
  package { ['nginx', 'php-fpm', 'php-mysql']:
    ensure => installed,
  }
  
  # Configure nginx
  file { '/etc/nginx/sites-available/myapp':
    ensure  => file,
    content => template('myapp/nginx.conf.erb'),
    notify  => Service['nginx'],
  }
  
  # Enable site
  file { '/etc/nginx/sites-enabled/myapp':
    ensure  => link,
    target  => '/etc/nginx/sites-available/myapp',
    notify  => Service['nginx'],
  }
  
  # Ensure services are running
  service { ['nginx', 'php-fpm']:
    ensure => running,
    enable => true,
  }
}
```

### **Puppet Templates**
```erb
# templates/nginx.conf.erb
server {
  listen 80;
  server_name <%= @domain %>;
  root <%= @document_root %>;
  index index.php index.html;
  
  location / {
    try_files $uri $uri/ /index.php?$query_string;
  }
  
  location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
  }
}
```

## Monitoring y Logging

### **CloudWatch Integration**
```bash
# Configurar métricas personalizadas
aws opsworks set-load-based-auto-scaling \
  --layer-id my-layer-id \
  --up-scaling file://up-scaling.json

# Ver métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/OpsWorks \
  --metric-name cpu_idle \
  --dimensions Name=LayerId,Value=my-layer-id \
  --statistics Average \
  --period 300
```

### **Custom Metrics**
```ruby
# recipes/metrics.rb
# Custom metrics to CloudWatch
node[:opsworks][:instance][:layers].each do |layer|
  Chef::Log.info("Reporting metrics for layer: #{layer}")
  
  # CPU usage
  cpu_usage = `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1`
  node[:opsworks][:instance][:cpu_idle] = 100 - cpu_usage.to_f
  
  # Memory usage
  memory_info = `free -m | grep Mem`
  total_memory = memory_info.split[1].to_f
  used_memory = memory_info.split[2].to_f
  memory_usage = (used_memory / total_memory) * 100
  
  node[:opsworks][:instance][:memory_used] = memory_usage
end
```

### **Log Management**
```bash
# Configurar log rotation
template '/etc/logrotate.d/myapp' do
  source 'logrotate.erb'
  owner 'root'
  group 'root'
  mode '0644'
end

# Log rotation template
# templates/logrotate.erb
/var/log/myapp/*.log {
  daily
  missingok
  rotate 30
  compress
  delaycompress
  notifempty
  create 644 www-data www-data
  postrotate
    service nginx reload
  endscript
}
```

## Security

### **IAM Roles**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeImages",
        "ec2:DescribeSnapshots",
        "ec2:DescribeVolumes",
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Security Groups**
```bash
# Configurar security groups
aws opsworks create-stack \
  --name my-secure-stack \
  --service-role-arn arn:aws:iam::123456789012:role/opsworks-service-role \
  --default-instance-profile-arn arn:aws:iam::123456789012:instance-profile/opsworks-instance-profile \
  --default-os "Ubuntu 20.04 LTS" \
  --configuration-manager Name=Chef,Version=12 \
  --custom-ssh-key my-keypair \
  --default-ssh-key-name my-keypair
```

## Best Practices

### **1. Stack Design**
- Logical layer separation
- Appropriate instance types
- Security group configuration
- Backup strategies

### **2. Recipe Development**
- Idempotent recipes
- Error handling
- Resource cleanup
- Version control

### **3. Deployment Strategy**
- Blue/green deployments
- Rolling updates
- Health checks
- Rollback procedures

### **4. Monitoring**
- Comprehensive logging
- Performance metrics
- Alerting setup
- Regular health checks

## Use Cases

### **1. Web Applications**
- Multi-tier web apps
- Load balancing
- Auto-scaling
- Content delivery

### **2. Microservices**
- Service orchestration
- Configuration management
- Service discovery
- Deployment automation

### **3. Enterprise Applications**
- Complex deployments
- Compliance requirements
- Multi-environment management
- Integration with existing systems

### **4. Development Environments**
- Rapid provisioning
- Consistent environments
- Team collaboration
- Testing automation

## Migration

### **Desde Chef/Puppet Standalone**
```bash
# Import existing cookbooks
aws opsworks create-stack \
  --name migrated-stack \
  --configuration-manager Name=Chef,Version=12 \
  --custom-cookbooks-source '{"Type": "git", "Url": "https://github.com/company/cookbooks.git"}'

# Migrate recipes
# 1. Review existing recipes
# 2. Adapt for OpsWorks
# 3. Test in staging
# 4. Deploy to production
```

### **Hacia Otros Servicios**
```bash
# Migrate to ECS
# 1. Containerize applications
# 2. Create ECS task definitions
# 3. Set up ECS services
# 4. Migrate configurations

# Migrate to CloudFormation
# 1. Export infrastructure
# 2. Create CloudFormation templates
# 3. Deploy with CloudFormation
# 4. Decommission OpsWorks
```

## Cost Management

### **Cost Components**
- **EC2 instances**: Instance hours
- **EBS volumes**: Storage costs
- **Data transfer**: Network costs
- **OpsWorks service**: No additional charge

### **Cost Optimization**
```bash
# Monitor costs
aws ce get-cost-and-usage \
  --time-period Start=2023-01-01,End=2023-01-31 \
  --filter file://opsworks-cost-filter.json \
  --granularity MONTHLY

# Cost optimization strategies
- Right-sizing instances
- Auto-scaling configuration
- Volume optimization
- Reserved instances
```

## Comparison with Other Services

### **OpsWorks vs ECS**
- **OpsWorks**: Configuration management, Chef/Puppet
- **ECS**: Container orchestration, Docker

### **OpsWorks vs Elastic Beanstalk**
- **OpsWorks**: More control, custom configurations
- **Elastic Beanstalk**: Simpler, managed platform

### **OpsWorks vs CloudFormation**
- **OpsWorks**: Configuration management focus
- **CloudFormation**: Infrastructure as code

## Conclusion

AWS OpsWorks es ideal para equipos que necesitan gestión de configuración avanzada con Chef o Puppet, especialmente para aplicaciones complejas, entornos multi-tier y organizaciones con requisitos específicos de configuración y compliance. Es particularmente útil para empresas que ya utilizan Chef o Puppet y quieren una solución gestionada en AWS.
