# AWS Device Farm

AWS Device Farm es un servicio de pruebas en la nube que permite a los desarrolladores probar aplicaciones web, móviles y de escritorio en dispositivos reales alojados en AWS. Proporciona acceso a una amplia variedad de dispositivos y configuraciones para garantizar la calidad y compatibilidad de las aplicaciones.

## Características principales

- **Acceso a dispositivos reales:**
  - Pruebas en dispositivos reales, no emuladores.
- **Amplia selección de dispositivos:**
  - iOS, Android, Windows y dispositivos de navegador.
- **Pruebas automatizadas:**
  - Compatible con frameworks como Appium, Calabash, XCTest, Espresso.
- **Pruebas manuales:**
  - Acceso interactivo a dispositivos para pruebas manuales.
- **Integración con CI/CD:**
  - Compatible con Jenkins, AWS CodePipeline, GitLab CI.
- **Informes detallados:**
  - Screenshots, logs, videos de sesiones de prueba.
- **Escalabilidad:**
  - Ejecuta pruebas en paralelo en múltiples dispositivos.

## Casos de uso

- **Pruebas de compatibilidad:**
  - Verifica que tu aplicación funcione en múltiples dispositivos y versiones de SO.
- **Pruebas de rendimiento:**
  - Mide rendimiento en dispositivos con diferentes especificaciones.
- **Pruebas de aplicaciones móviles:**
  - Prueba apps iOS y Android antes del lanzamiento.
- **Pruebas de aplicaciones web:**
  - Prueba aplicaciones web en múltiples navegadores.
- **Pruebas de accesibilidad:**
  - Verifica accesibilidad en diferentes dispositivos.

## Beneficios

- **Calidad mejorada:**
  - Pruebas en dispositivos reales detectan problemas que los emuladores no.
- **Escalabilidad:**
  - Ejecuta cientos de pruebas en paralelo.
- **Costo-efectivo:**
  - No necesitas invertir en infraestructura de dispositivos.
- **Automatización:**
  - Integración con pipelines de CI/CD automatiza pruebas.

## Tipos de pruebas

### Pruebas automatizadas

Frameworks soportados:
- **Appium:**
  - Pruebas automatizadas para iOS y Android.
- **Espresso:**
  - Framework de pruebas para Android.
- **XCTest:**
  - Framework de pruebas nativo para iOS.
- **Calabash:**
  - BDD framework para pruebas de aplicaciones móviles.
- **Playwright/Selenium:**
  - Pruebas web automatizadas.

### Pruebas manuales

- Acceso interactivo a dispositivos
- Pruebas exploratorias
- Pruebas de usabilidad
- Screenshots y grabación de video

## Ejemplo de configuración

### Crear un proyecto con AWS CLI
```bash
aws devicefarm create-project \
    --name MiProyectoPruebas \
    --description "Pruebas de mi aplicación"
```

### Crear una configuración de dispositivo
```bash
aws devicefarm create-device-pool \
    --project-arn arn:aws:devicefarm:us-west-2:123456789012:project:12345678-1234-1234-1234-123456789012 \
    --name MiPoolDispositivos \
    --rules '[
        {
            "attribute": "PLATFORM",
            "operator": "EQUALS",
            "value": "ANDROID"
        },
        {
            "attribute": "OS_VERSION",
            "operator": "GREATER_THAN_OR_EQUALS",
            "value": "8.0"
        }
    ]'
```

### Ejecutar pruebas automatizadas con Appium
```bash
aws devicefarm schedule-run \
    --project-arn arn:aws:devicefarm:us-west-2:123456789012:project:PROJECT_ID \
    --app-arn arn:aws:devicefarm:us-west-2:123456789012:app:APP_ID \
    --device-pool-arn arn:aws:devicefarm:us-west-2:123456789012:devicepool:POOL_ID \
    --test type=APPIUM_JAVA_TESTNG,testPackageArn=arn:aws:devicefarm:us-west-2:123456789012:test:TEST_ID \
    --name MiPruebaAppium
```

## Arquitectura de AWS Device Farm

```
┌──────────────────────────────────────────────────────┐
│            AWS Device Farm                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │        Upload Application                    │  │
│  │  (APK, IPA, WebApp)                         │  │
│  └──────────┬───────────────────────────────────┘  │
│             │                                       │
│  ┌──────────▼───────────────────────────────────┐  │
│  │    Configure Test Suite & Device Pool        │  │
│  └──────────┬───────────────────────────────────┘  │
│             │                                       │
│  ┌──────────▼───────────────────────────────────┐  │
│  │       Schedule Test Runs                     │  │
│  └──────────┬───────────────────────────────────┘  │
│             │                                       │
│     ┌───────┴──────────┬──────────────┐            │
│     │                  │              │            │
│  ┌──▼──┐  ┌──────┐  ┌──▼──┐  ┌──────┐            │
│  │iOS  │  │Android│ │Tablet│  │Web   │            │
│  │Dev  │  │Device │ │Devices│ │Browsers            │
│  │     │  │       │ │      │  │      │            │
│  └──┬──┘  └──┬───┘  └──┬───┘  └──┬───┘            │
│     │        │         │         │                │
│     └────┬───┴────┬────┴────┬────┘                │
│          │        │         │                     │
│  ┌───────▼────────▼────────▼────────┐            │
│  │    Collect Test Results          │            │
│  │  (Logs, Screenshots, Videos)     │            │
│  └───────┬────────────────────────────┘            │
│          │                                         │
│  ┌───────▼────────────────────────────┐          │
│  │   Generate Reports & Metrics      │          │
│  └──────────────────────────────────────┘          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Ejemplo de script de prueba (Appium - Java)

```java
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.testng.annotations.Test;

public class SampleTest {
    
    @Test
    public void testApp() {
        DesiredCapabilities capabilities = new DesiredCapabilities();
        capabilities.setCapability("platformName", "Android");
        capabilities.setCapability("appPackage", "com.example.app");
        capabilities.setCapability("appActivity", ".MainActivity");
        
        AppiumDriver<MobileElement> driver = 
            new AndroidDriver(new URL("http://localhost:4723/wd/hub"), capabilities);
        
        // Realizar pruebas
        MobileElement button = driver.findElementById("com.example.app:id/button");
        button.click();
        
        // Verificar resultados
        assert driver.findElementById("com.example.app:id/result").isDisplayed();
        
        driver.quit();
    }
}
```

## Dispositivos disponibles

### Dispositivos iOS
- iPhone 12, 12 Pro, 12 Pro Max
- iPhone 11, 11 Pro, 11 Pro Max
- iPad Pro, iPad Air, iPad Mini
- Versiones de iOS: 14, 15, 16

### Dispositivos Android
- Samsung Galaxy S21, S21+, S21 Ultra
- Google Pixel 6, 6 Pro
- OnePlus 9, 9 Pro
- Versiones de Android: 10, 11, 12, 13

### Navegadores
- Chrome
- Firefox
- Safari
- Edge

## Integración con CI/CD

### AWS CodePipeline
```yaml
Stages:
  - Build
  - Test:
      Provider: DeviceFarm
      Configuration:
        ProjectArn: arn:aws:devicefarm:...
        AppArn: arn:aws:devicefarm:...
        DevicePoolArn: arn:aws:devicefarm:...
```

### Jenkins
```groovy
pipeline {
    stages {
        stage('Test') {
            steps {
                script {
                    sh 'aws devicefarm schedule-run \
                        --project-arn $PROJECT_ARN \
                        --app-arn $APP_ARN \
                        --device-pool-arn $DEVICE_POOL_ARN \
                        --test type=APPIUM_JAVA_TESTNG,testPackageArn=$TEST_ARN'
                }
            }
        }
    }
}
```

## Tipos de pruebas disponibles

| Tipo | Framework | Plataforma |
|---|---|---|
| Appium | Java, Python, Ruby | iOS, Android |
| Espresso | Java | Android |
| XCTest | Swift, Objective-C | iOS |
| Calabash | Ruby | iOS, Android |
| Pytest | Python | Web |
| Selenium | Java, Python, Ruby | Web |

## Buenas prácticas

1. **Cobertura de dispositivos:**
   - Prueba en dispositivos populares y diferentes configuraciones.

2. **Automatización:**
   - Automatiza pruebas frecuentes para reducir costos manuales.

3. **Pruebas en paralelo:**
   - Ejecuta múltiples pruebas en paralelo para acelerar ciclos de prueba.

4. **Análisis de resultados:**
   - Revisa logs y videos para diagnosticar fallos.

5. **Integración CI/CD:**
   - Integra pruebas en pipeline de despliegue.

## Limitaciones

- **Costo:**
  - Costo por minuto de dispositivo utilizado.

- **Dispositivos limitados:**
  - Solo dispositivos en el inventario de AWS.

- **Latencia de red:**
  - Conexión de red puede afectar experiencia interactiva.

## Recursos adicionales

- [Documentación oficial de AWS Device Farm](https://docs.aws.amazon.com/devicefarm/)
- [Guía de inicio rápido](https://docs.aws.amazon.com/devicefarm/latest/userguide/what-is-device-farm.html)
- [Ejemplos de pruebas](https://github.com/aws-samples/aws-device-farm-samples)
- [Appium Documentation](http://appium.io/)