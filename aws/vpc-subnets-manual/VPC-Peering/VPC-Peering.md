# AWS VPC Peering

## Definición

VPC Peering es una conexión de red entre dos VPCs que permite el tráfico entre ellas como si estuvieran en la misma red. Esta conexión no utiliza gateways ni dispositivos de red adicionales, proporcionando una comunicación de baja latencia y alto ancho de banda entre VPCs.

## Características Principales

### 1. **Conexión Directa**
- Comunicación privada entre VPCs
- Sin overhead de gateway
- Baja latencia
- Alto rendimiento

### 2. **Seguridad**
- Tráfico privado y seguro
- No atraviesa internet pública
- Control granular de acceso
- Aislamiento de red mantenido

### 3. **Flexibilidad**
- Misma región o diferentes regiones
- Misma cuenta o diferentes cuentas
- Configuración simétrica o asimétrica
- Soporte para IPv4 e IPv6

## Configuración de VPC Peering

### **Creación de Conexión Peering**
```python
import boto3

class VPCPeeringManager:
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_vpc_peering(self, requester_vpc_id, accepter_vpc_id, peer_region=None):
        """Crear conexión de VPC peering"""
        
        try:
            # Crear peering connection
            peering_params = {
                'VpcId': requester_vpc_id,
                'PeerVpcId': accepter_vpc_id,
                'TagSpecifications': [
                    {
                        'ResourceType': 'vpc-peering-connection',
                        'Tags': [
                            {'Key': 'Name', 'Value': f'peering-{requester_vpc_id}-{accepter_vpc_id}'}
                        ]
                    }
                ]
            }
            
            if peer_region and peer_region != self.region:
                peering_params['PeerRegion'] = peer_region
            
            response = self.ec2.create_vpc_peering_connection(**peering_params)
            peering_id = response['VpcPeeringConnection']['VpcPeeringConnectionId']
            
            return {
                'success': True,
                'peering_id': peering_id,
                'status': 'pending-acceptance'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def accept_vpc_peering(self, peering_id):
        """Aceptar conexión de VPC peering"""
        
        try:
            response = self.ec2.accept_vpc_peering_connection(
                VpcPeeringConnectionId=peering_id
            )
            
            return {
                'success': True,
                'peering_id': peering_id,
                'status': response['VpcPeeringConnection']['Status']['Code']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_peering_route_tables(self, peering_id, requester_vpc_id, accepter_vpc_id):
        """Actualizar route tables para peering"""
        
        try:
            # Obtener route tables del requester VPC
            requester_rts = self.ec2.describe_route_tables(
                Filters=[{'Name': 'vpc-id', 'Values': [requester_vpc_id]}]
            )
            
            # Agregar ruta al accepter VPC en route tables del requester
            for rt in requester_rts['RouteTables']:
                self.ec2.create_route(
                    RouteTableId=rt['RouteTableId'],
                    DestinationCidrBlock=self.get_vpc_cidr(accepter_vpc_id),
                    VpcPeeringConnectionId=peering_id
                )
            
            # Obtener route tables del accepter VPC
            accepter_rts = self.ec2.describe_route_tables(
                Filters=[{'Name': 'vpc-id', 'Values': [accepter_vpc_id]}]
            )
            
            # Agregar ruta al requester VPC en route tables del accepter
            for rt in accepter_rts['RouteTables']:
                self.ec2.create_route(
                    RouteTableId=rt['RouteTableId'],
                    DestinationCidrBlock=self.get_vpc_cidr(requester_vpc_id),
                    VpcPeeringConnectionId=peering_id
                )
            
            return {
                'success': True,
                'peering_id': peering_id,
                'message': 'Route tables updated successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_vpc_cidr(self, vpc_id):
        """Obtener CIDR block de VPC"""
        
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            if response['Vpcs']:
                return response['Vpcs'][0]['CidrBlock']
            else:
                return None
        except:
            return None
    
    def delete_vpc_peering(self, peering_id):
        """Eliminar conexión de VPC peering"""
        
        try:
            self.ec2.delete_vpc_peering_connection(
                VpcPeeringConnectionId=peering_id
            )
            
            return {
                'success': True,
                'peering_id': peering_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_vpc_peerings(self):
        """Listar conexiones de VPC peering"""
        
        try:
            response = self.ec2.describe_vpc_peering_connections()
            
            peerings = []
            for peering in response['VpcPeeringConnections']:
                peering_info = {
                    'peering_id': peering['VpcPeeringConnectionId'],
                    'requester_vpc_id': peering['RequesterVpcId'],
                    'accepter_vpc_id': peering['AccepterVpcId'],
                    'status': peering['Status']['Code'],
                    'requester_owner': peering['RequesterOwnerId'],
                    'accepter_owner': peering['AccepterOwnerId'],
                    'tags': peering.get('Tags', [])
                }
                peerings.append(peering_info)
            
            return {
                'success': True,
                'peerings': peerings,
                'count': len(peerings)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## Casos de Uso

### **1. Peering entre VPCs en la misma cuenta**
```python
# Ejemplo de uso
manager = VPCPeeringManager('us-east-1')

# Crear peering
peering_result = manager.create_vpc_peering(
    requester_vpc_id='vpc-1234567890abcdef0',
    accepter_vpc_id='vpc-0987654321fedcba0'
)

if peering_result['success']:
    peering_id = peering_result['peering_id']
    
    # Aceptar peering
    accept_result = manager.accept_vpc_peering(peering_id)
    
    if accept_result['success']:
        # Actualizar route tables
        route_result = manager.update_peering_route_tables(
            peering_id,
            'vpc-1234567890abcdef0',
            'vpc-0987654321fedcba0'
        )
        
        print(f"Peering established: {peering_id}")
```

### **2. Peering entre diferentes regiones**
```python
# Peering entre regiones
peering_result = manager.create_vpc_peering(
    requester_vpc_id='vpc-1234567890abcdef0',
    accepter_vpc_id='vpc-0987654321fedcba0',
    peer_region='us-west-2'
)
```

## Configuración con AWS CLI

### **Crear VPC Peering**
```bash
# Crear conexión de peering
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-1234567890abcdef0 \
  --peer-vpc-id vpc-0987654321fedcba0 \
  --peer-region us-west-2

# Aceptar conexión (en la región/cuenta del accepter)
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-1234567890abcdef0

# Agregar ruta a route table
aws ec2 create-route \
  --route-table-id rtb-1234567890abcdef0 \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-1234567890abcdef0
```

## Best Practices

### **1. Planificación de CIDR**
- Evitar solapamiento de rangos IP
- Usar rangos IP únicos por VPC
- Documentar asignaciones de CIDR

### **2. Seguridad**
- Implementar security groups restrictivos
- Usar Network ACLs adicionales
- Monitorear tráfico con flow logs

### **3. Monitoreo**
- Configurar alarmas para conexiones caídas
- Monitorear transferencia de datos
- Auditar conexiones de peering

### **4. Gestión**
- Etiquetar todas las conexiones
- Documentar propósito y dueño
- Revisar periódicamente conexiones activas

## Limitaciones

### **Restricciones de VPC Peering**
- No soporta transitivity (no es enrutable a través de múltiples VPCs)
- No puede haber solapamiento de CIDR blocks
- Límite de conexiones por VPC (50 por defecto)
- No soporta comunicación con VPCs en diferentes plataformas AWS

### **Alternativas**
- AWS Transit Gateway para múltiples VPCs
- AWS PrivateLink para conexión a servicios
- VPN para conectividad híbrida
- Direct Connect para conexión dedicada

## Troubleshooting

### **Problemas Comunes**
1. **Conexión no establecida**: Verificar que ambas partes aceptaron el peering
2. **Sin conectividad**: Revisar configuración de route tables
3. **Conflictos de CIDR**: Asegurar rangos IP no solapados
4. **Permisos insuficientes**: Verificar IAM permissions

### **Comandos de Diagnóstico**
```bash
# Verificar estado del peering
aws ec2 describe-vpc-peering-connections \
  --vpc-peering-connection-ids pcx-1234567890abcdef0

# Verificar route tables
aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=vpc-1234567890abcdef0

# Verificar conectividad
ping 10.1.0.10  # Desde instancia en VPC conectada
```
