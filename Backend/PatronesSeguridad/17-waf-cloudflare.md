# WAF / Cloudflare

Un WAF (Web Application Firewall) es una solución de seguridad que filtra, monitorea y bloquea tráfico HTTP malicioso hacia tu aplicación web. Cloudflare es un proveedor de servicios de seguridad y rendimiento que incluye WAF, protección contra DDoS, CDN y reglas de firewall.

## ¿Qué es un WAF?
Un WAF inspecciona las solicitudes HTTP/HTTPS y aplica reglas para detectar y bloquear ataques como:
- SQL Injection
- Cross-Site Scripting (XSS)
- CSRF
- Path Traversal
- Bots y scraping

## ¿Qué es Cloudflare?
Cloudflare es una plataforma que actúa como proxy entre el usuario y tu servidor, ofreciendo:
- WAF gestionado
- Protección DDoS
- CDN (Content Delivery Network)
- SSL/TLS
- Reglas personalizadas de firewall

## Ventajas
- Reduce el riesgo de ataques comunes.
- Mejora la disponibilidad y velocidad de tu API.
- Permite definir reglas específicas para bloquear o permitir tráfico.
- Protege contra ataques de bots y automatizados.

## Ejemplo de reglas WAF
- Bloquear solicitudes con payload sospechoso.
- Permitir solo ciertos métodos HTTP.
- Limitar el acceso por IP o país.

## Ejemplo Cloudflare
- Configurar reglas para bloquear ataques DDoS.
- Activar WAF para filtrar ataques OWASP Top 10.
- Usar "Rate Limiting" para limitar peticiones por usuario.

## Caso de uso
Si tu API recibe tráfico público, un WAF y Cloudflare pueden protegerla de ataques automatizados, intentos de explotación y sobrecarga por DDoS.

**Ejemplo:**
- Cloudflare: protección DDoS, reglas de firewall
- WAF: filtra tráfico malicioso
