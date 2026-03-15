# AWS CodePipeline

## Definición

AWS CodePipeline es un servicio de CI/CD (Continuous Integration and Continuous Delivery) totalmente gestionado que permite modelar, visualizar y automatizar los pasos necesarios para liberar aplicaciones. Orquesta el build, test y despliegue de aplicaciones cada vez que hay un cambio en el código, permitiendo entregas rápidas y fiables.

## Características Principales

### 1. **Orquestación Completa**
- Workflow visual y configurable
- Múltiples etapas y acciones
- Integración con servicios AWS
- Custom actions

### 2. **Automatización**
- Desencadenado por cambios
- Ejecución automática de pasos
- Rollback automático
- Approvals manuales

### 3. **Visibilidad**
- Dashboard en tiempo real
- Historial de ejecuciones
- Logs detallados
- Métricas de rendimiento

### 4. **Flexibilidad**
- Múltiples entornos
- Branches específicos
- Custom integrations
- Conditional execution

## Componentes Clave

### **Pipeline**
- Flujo de trabajo completo
- Definición de etapas
- Configuración global
- Execution history

### **Stage**
- Agrupación lógica de acciones
- Entrada y salida de artefactos
- Transiciones entre etapas
- Conditional logic

### **Action**
- Tarea específica del pipeline
- Source, build, test, deploy
- Custom actions
- Third-party integrations

### **Artifact**
- Output de acciones
- Input de siguientes etapas
- Version control
- Storage management

## Estructura de Pipeline

### **Etapas Típicas**
```
Source → Build → Test → Staging → Production
```

### **Arquitectura Detallada**
```yaml
Pipeline:
  Stages:
    - Source (CodeCommit, GitHub, S3)
    - Build (CodeBuild, Jenkins)
    - Test (CodeBuild, third-party)
    - Staging (CodeDeploy, CloudFormation)
    - Approval (Manual approval)
    - Production (CodeDeploy, ECS, Lambda)
```

## Configuración de Pipeline

### **AWS CLI**
```bash
# Create pipeline
aws codepipeline create-pipeline \
  --cli-input-json file://pipeline-definition.json

# Start pipeline execution
aws codepipeline start-pipeline-execution \
  --name my-application-pipeline

# Get pipeline state
aws codepipeline get-pipeline-state \
  --name my-application-pipeline
```

### **Pipeline Definition JSON**
```json
{
  "pipeline": {
    "name": "my-application-pipeline",
    "roleArn": "arn:aws:iam::123456789012:role/CodePipelineServiceRole",
    "artifactStore": {
      "type": "S3",
      "location": "my-codepipeline-artifacts"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "SourceAction",
            "actionTypeId": {
              "category": "Source",
              "owner": "AWS",
              "provider": "CodeCommit",
              "version": "1"
            },
            "configuration": {
              "RepositoryName": "my-app",
              "BranchName": "main"
            },
            "outputArtifacts": [
              {
                "name": "SourceOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### **CloudFormation**
```yaml
Resources:
  MyPipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: my-application-pipeline
      RoleArn: !GetAtt CodePipelineRole.Arn
      ArtifactStore:
        Type: S3
        Location: my-codepipeline-artifacts
      Stages:
        - Name: Source
          Actions:
            - Name: SourceAction
              ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: "1"
              Configuration:
                RepositoryName: my-app
                BranchName: main
              OutputArtifacts:
                - Name: SourceOutput
```

## Source Actions

### **CodeCommit Source**
```yaml
- Name: Source
  Actions:
    - Name: CodeCommitSource
      ActionTypeId:
        Category: Source
        Owner: AWS
        Provider: CodeCommit
        Version: "1"
      Configuration:
        RepositoryName: my-app
        BranchName: main
        PollForSourceChanges: false
      OutputArtifacts:
        - Name: SourceOutput
      Triggers:
        - Type: Webhook
          WebhookFilters:
            - JsonPath: "$.ref"
              MatchEquals: refs/heads/{Branch}
```

### **GitHub Source**
```yaml
- Name: Source
  Actions:
    - Name: GitHubSource
      ActionTypeId:
        Category: Source
        Owner: ThirdParty
        Provider: GitHub
        Version: "1"
      Configuration:
        Owner: my-github-username
        Repo: my-app
        Branch: main
        OAuthToken: "{{resolve:secretsmanager:github-token:SecretString:token}}"
      OutputArtifacts:
        - Name: SourceOutput
```

### **S3 Source**
```yaml
- Name: Source
  Actions:
    - Name: S3Source
      ActionTypeId:
        Category: Source
        Owner: AWS
        Provider: S3
        Version: "1"
      Configuration:
        S3Bucket: my-source-bucket
        S3ObjectKey: source-code.zip
        PollForSourceChanges: true
      OutputArtifacts:
        - Name: SourceOutput
```

## Build Actions

### **CodeBuild Build**
```yaml
- Name: Build
  Actions:
    - Name: CodeBuild
      ActionTypeId:
        Category: Build
        Owner: AWS
        Provider: CodeBuild
        Version: "1"
      Configuration:
        ProjectName: my-build-project
        PrimarySource: SourceOutput
      InputArtifacts:
        - Name: SourceOutput
      OutputArtifacts:
        - Name: BuildOutput
      EnvironmentVariables:
        - Name: BUILD_ENV
          Value: production
```

### **Jenkins Build**
```yaml
- Name: Build
  Actions:
    - Name: JenkinsBuild
      ActionTypeId:
        Category: Build
        Owner: Custom
        Provider: Jenkins
        Version: "1"
      Configuration:
        ProjectName: my-jenkins-job
        ServerURL: https://jenkins.example.com
        ProviderName: MyJenkinsProvider
      InputArtifacts:
        - Name: SourceOutput
      OutputArtifacts:
        - Name: BuildOutput
```

## Test Actions

### **Unit Testing**
```yaml
- Name: Test
  Actions:
    - Name: UnitTests
      ActionTypeId:
        Category: Test
        Owner: AWS
        Provider: CodeBuild
        Version: "1"
      Configuration:
        ProjectName: my-test-project
        PrimarySource: SourceOutput
      InputArtifacts:
        - Name: SourceOutput
      OutputArtifacts:
        - Name: TestOutput
```

### **Integration Testing**
```yaml
- Name: IntegrationTest
  Actions:
    - Name: IntegrationTests
      ActionTypeId:
        Category: Test
        Owner: AWS
        Provider: CodeBuild
        Version: "1"
      Configuration:
        ProjectName: integration-test-project
        EnvironmentVariables:
          - Name: TEST_ENV
            Value: staging
      InputArtifacts:
        - Name: BuildOutput
      OutputArtifacts:
        - Name: IntegrationTestOutput
```

## Deploy Actions

### **CodeDeploy Deploy**
```yaml
- Name: Deploy
  Actions:
    - Name: DeployToProduction
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
        Version: "1"
      Configuration:
        ApplicationName: my-app
        DeploymentGroupName: production
      InputArtifacts:
        - Name: BuildOutput
```

### **CloudFormation Deploy**
```yaml
- Name: DeployInfrastructure
  Actions:
    - Name: CloudFormationDeploy
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CloudFormation
        Version: "1"
      Configuration:
        ActionMode: CREATE_UPDATE
        StackName: my-app-infrastructure
        TemplateConfiguration: BuildOutput::cloudformation-config.json
        TemplatePath: BuildOutput::infrastructure.yml
        Capabilities: CAPABILITY_IAM
        RoleArn: arn:aws:iam::123456789012:role/CloudFormationDeployRole
      InputArtifacts:
        - Name: BuildOutput
```

### **ECS Deploy**
```yaml
- Name: Deploy
  Actions:
    - Name: DeployToECS
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: ECS
        Version: "1"
      Configuration:
        ClusterName: my-ecs-cluster
        ServiceName: my-ecs-service
        FileName: imagedefinitions.json
      InputArtifacts:
        - Name: BuildOutput
```

### **Lambda Deploy**
```yaml
- Name: Deploy
  Actions:
    - Name: DeployLambda
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: Lambda
        Version: "1"
      Configuration:
        FunctionName: my-lambda-function
        UserParameters: BuildOutput::lambda-function.zip
      InputArtifacts:
        - Name: BuildOutput
```

## Approval Actions

### **Manual Approval**
```yaml
- Name: Approval
  Actions:
    - Name: ManualApproval
      ActionTypeId:
        Category: Approval
        Owner: AWS
        Provider: Manual
        Version: "1"
      Configuration:
        CustomData: "Please review and approve this deployment to production"
        ExternalEntityLink: "https://example.com/review"
```

### **SNS Notification Approval**
```yaml
- Name: Approval
  Actions:
    - Name: SNSApproval
      ActionTypeId:
        Category: Approval
        Owner: AWS
        Provider: SNS
        Version: "1"
      Configuration:
        TopicArn: arn:aws:sns:us-east-1:123456789012:approval-topic
        Message: "Please approve deployment to production"
```

## Webhooks y Triggers

### **GitHub Webhook**
```yaml
Triggers:
  - Type: Webhook
    WebhookFilters:
      - JsonPath: "$.ref"
        MatchEquals: refs/heads/{Branch}
      - JsonPath: "$.head_commit.message"
        MatchEquals: "[deploy]"
```

### **CodeCommit Webhook**
```yaml
Triggers:
  - Type: Webhook
    WebhookFilters:
      - JsonPath: "$.referenceType"
        MatchEquals: branch
      - JsonPath: "$.referenceName"
        MatchEquals: main
```

## Conditional Execution

### **Branch-based Pipelines**
```yaml
# Pipeline para main branch
- Name: Source
  Actions:
    - Name: SourceAction
      Configuration:
        BranchName: main

# Pipeline para feature branches
- Name: Source
  Actions:
    - Name: SourceAction
      Configuration:
        BranchName: feature/*
```

### **Environment-specific Deployments**
```yaml
- Name: StagingDeploy
  Actions:
    - Name: DeployToStaging
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: staging

- Name: ProductionDeploy
  Actions:
    - Name: DeployToProduction
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: production
```

## Parallel Actions

### **Parallel Testing**
```yaml
- Name: Test
  Actions:
    - Name: UnitTests
      ActionTypeId:
        Category: Test
        Owner: AWS
        Provider: CodeBuild
      Configuration:
        ProjectName: unit-test-project
      RunOrder: 1

    - Name: IntegrationTests
      ActionTypeId:
        Category: Test
        Owner: AWS
        Provider: CodeBuild
      Configuration:
        ProjectName: integration-test-project
      RunOrder: 1

    - Name: SecurityTests
      ActionTypeId:
        Category: Test
        Owner: AWS
        Provider: CodeBuild
      Configuration:
        ProjectName: security-test-project
      RunOrder: 1
```

### **Parallel Deployments**
```yaml
- Name: Deploy
  Actions:
    - Name: DeployToRegion1
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: production-us-east-1
      Region: us-east-1
      RunOrder: 1

    - Name: DeployToRegion2
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: production-us-west-2
      Region: us-west-2
      RunOrder: 1
```

## Variables y Parámetros

### **Pipeline Variables**
```yaml
Variables:
  - Name: Environment
    DefaultValue: staging
  - Name: BuildNumber
    DefaultValue: "#{CodePipeline.BuildNumber}"
  - Name: CommitId
    DefaultValue: "#{CodePipeline.SourceCommitId}"

# Uso en configuración
Configuration:
  EnvironmentVariables:
    - Name: ENV
      Value: "#{Variables.Environment}"
    - Name: BUILD_ID
      Value: "#{Variables.BuildNumber}"
```

### **Dynamic Configuration**
```yaml
- Name: Deploy
  Actions:
    - Name: DeployAction
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        ApplicationName: my-app-#{Variables.Environment}
        DeploymentGroupName: #{Variables.Environment}
```

## Monitoring y Logging

### **CloudWatch Metrics**
```bash
# Pipeline execution metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodePipeline \
  --metric-name PipelineExecutionTime \
  --dimensions Name=PipelineName,Value=my-application-pipeline \
  --statistics Average \
  --period 3600
```

### **CloudWatch Events**
```json
{
  "source": ["aws.codepipeline"],
  "detail-type": ["CodePipeline Pipeline Execution State Change"],
  "detail": {
    "pipeline": ["my-application-pipeline"],
    "state": ["SUCCEEDED", "FAILED"]
  }
}
```

### **SNS Notifications**
```yaml
# Lambda function for notifications
import boto3
import json

def lambda_handler(event, context):
    pipeline = event['detail']['pipeline']
    state = event['detail']['state']
    
    sns = boto3.client('sns')
    
    message = f"Pipeline {pipeline} {state}"
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:pipeline-notifications',
        Subject=f'Pipeline {state}',
        Message=message
    )
    
    return {'statusCode': 200}
```

## Security

### **IAM Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codepipeline:*",
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "codecommit:*",
        "codebuild:*",
        "codedeploy:*",
        "cloudformation:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Resource Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/CodeBuildServiceRole"
      },
      "Action": "codepipeline:PutApprovalResult",
      "Resource": "arn:aws:codepipeline:us-east-1:123456789012:my-application-pipeline"
    }
  ]
}
```

## Best Practices

### **1. Pipeline Design**
- Stages lógicas y secuenciales
- Parallel actions cuando sea posible
- Manual approvals para producción
- Rollback strategies

### **2. Artifact Management**
- Clean artifacts regularly
- Use appropriate storage
- Version artifacts
- Secure sensitive data

### **3. Security**
- Least privilege IAM roles
- Encrypt artifacts
- Audit pipeline changes
- Secure secrets

### **4. Monitoring**
- Comprehensive logging
- Metrics and alerts
- Failure notifications
- Performance monitoring

## Use Cases

### **1. Web Applications**
- Frontend build and deploy
- Backend API deployment
- Database migrations
- Static asset deployment

### **2. Microservices**
- Independent service pipelines
- Shared infrastructure
- Service mesh updates
- Canary deployments

### **3. Mobile Applications**
- iOS/Android builds
- App store deployment
- Beta distribution
- OTA updates

### **4. Infrastructure**
- Infrastructure as code
- Environment provisioning
- Configuration updates
- Compliance checks

## Advanced Patterns

### **Multi-Environment Pipeline**
```yaml
Stages:
  - Name: Source
  - Name: Build
  - Name: Test
  - Name: StagingDeploy
  - Name: StagingTest
  - Name: ManualApproval
  - Name: ProductionDeploy
  - Name: ProductionTest
```

### **Blue/Green Deployment**
```yaml
- Name: BlueGreenDeploy
  Actions:
    - Name: DeployBlue
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: blue-green

    - Name: HealthCheck
      ActionTypeId:
        Category: Invoke
        Owner: AWS
        Provider: Lambda
      Configuration:
        FunctionName: health-check-function

    - Name: SwitchTraffic
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: blue-green
        DeploymentAction: stop-deployment
```

### **Canary Deployment**
```yaml
- Name: CanaryDeploy
  Actions:
    - Name: DeployCanary
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: canary
        DeploymentConfigName: CodeDeployDefault.Canary10Percent5Minutes

    - Name: MonitorCanary
      ActionTypeId:
        Category: Invoke
        Owner: AWS
        Provider: Lambda
      Configuration:
        FunctionName: canary-monitor

    - Name: PromoteCanary
      ActionTypeId:
        Category: Deploy
        Owner: AWS
        Provider: CodeDeploy
      Configuration:
        DeploymentGroupName: canary
        DeploymentAction: continue-deployment
```

## Costos

### **Pricing**
- **$1.00 por pipeline activo por mes**
- **$0.008 por minuto de ejecución**
- **Costos de servicios relacionados**
- **Data transfer costs**

### **Cost Optimization**
- Pipeline optimization
- Parallel execution
- Artifact cleanup
- Efficient resource usage

## Comparison with Other Services

### **CodePipeline vs Jenkins**
- **CodePipeline**: Gestionado, integración AWS, serverless
- **Jenkins**: Customizable, plugins, self-hosted

### **CodePipeline vs CircleCI**
- **CodePipeline**: Mejor integración AWS, más flexible
- **CircleCI**: Más features, mejor UI, más community

### **CodePipeline vs GitHub Actions**
- **CodePipeline**: Más poderoso, mejor para AWS
- **GitHub Actions**: Mejor integración GitHub, más community

## Conclusion

AWS CodePipeline es el corazón de los pipelines CI/CD modernos en AWS, proporcionando orquestación completa, automatización y visibilidad para el ciclo de vida completo de aplicaciones. Es ideal para equipos que necesitan un servicio de CI/CD gestionado, escalable y perfectamente integrado con el ecosistema AWS.
