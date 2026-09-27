# Bridge Pattern

## ¿Cuándo usarlo?
Cuando una clase crece en **dos dimensiones independientes** (por ejemplo, *forma* y *color*, o *control remoto* y *dispositivo*) y la herencia te obligaría a crear una clase por cada combinación. Bridge separa la **abstracción** de su **implementación** para que ambas evolucionen por separado.

## Explicación simple (analogía del control remoto)
Tienes controles remotos (básico, avanzado) y dispositivos (TV, radio). Con herencia necesitarías `ControlBasicoTV`, `ControlBasicoRadio`, `ControlAvanzadoTV`... (2 × 2 = 4 clases, y crece multiplicando). Con Bridge, el control **tiene** un dispositivo: 2 + 2 clases, y crece sumando.

## Ejemplo en .NET (C#)
```csharp
// Implementación
public interface IDevice {
    void SetVolume(int volume);
    int GetVolume();
}

public class Tv : IDevice {
    private int _volume;
    public void SetVolume(int volume) => _volume = volume;
    public int GetVolume() => _volume;
}

public class Radio : IDevice {
    private int _volume;
    public void SetVolume(int volume) => _volume = volume;
    public int GetVolume() => _volume;
}

// Abstracción
public class RemoteControl {
    protected readonly IDevice Device;
    public RemoteControl(IDevice device) { Device = device; }
    public void VolumeUp() => Device.SetVolume(Device.GetVolume() + 10);
}

public class AdvancedRemoteControl : RemoteControl {
    public AdvancedRemoteControl(IDevice device) : base(device) {}
    public void Mute() => Device.SetVolume(0);
}
```

## Ejemplo en TypeScript
```typescript
// Implementación
interface Device {
  setVolume(volume: number): void;
  getVolume(): number;
}

class Tv implements Device {
  private volume = 0;
  setVolume(v: number) { this.volume = v; }
  getVolume() { return this.volume; }
}

class Radio implements Device {
  private volume = 0;
  setVolume(v: number) { this.volume = v; }
  getVolume() { return this.volume; }
}

// Abstracción
class RemoteControl {
  constructor(protected device: Device) {}
  volumeUp() { this.device.setVolume(this.device.getVolume() + 10); }
}

class AdvancedRemoteControl extends RemoteControl {
  mute() { this.device.setVolume(0); }
}

// Uso: cualquier control con cualquier dispositivo
const remote = new AdvancedRemoteControl(new Radio());
remote.volumeUp();
remote.mute();
```

## Bridge vs Adapter
- **Adapter** se aplica *después*, para que cosas incompatibles que ya existen trabajen juntas.
- **Bridge** se diseña *desde el inicio*, para que abstracción e implementación varíen de forma independiente.
