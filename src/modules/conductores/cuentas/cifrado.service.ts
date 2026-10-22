import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '@/common/config/env.validation';
import { cifrar, derivarLlave, descifrar } from './utils/cifrado.util';

// La llave sale de CLAVE_CUENTAS, que vive solo en el .env del servidor: con la
// base o un respaldo, sin esa variable, las contraseñas no se pueden leer. Si
// CLAVE_CUENTAS cambia o se pierde, lo ya guardado queda ilegible.
@Injectable()
export class CifradoService implements OnModuleInit {
  private readonly logger = new Logger(CifradoService.name);
  private readonly llave: Buffer | null;

  constructor(config: ConfigService<Entorno, true>) {
    const secreto = config.get('CLAVE_CUENTAS', { infer: true });
    this.llave = secreto ? derivarLlave(secreto) : null;
  }

  // Sin CLAVE_CUENTAS el back parte igual; solo las cuentas de los conductores
  // quedan sin poder guardarse ni leerse (responden 503).
  onModuleInit() {
    if (!this.llave) {
      this.logger.warn(
        'Falta CLAVE_CUENTAS: las cuentas de los conductores no se pueden guardar ni leer.',
      );
    }
  }

  cifrar(texto: string): string {
    return cifrar(this.llaveOFallar(), texto);
  }

  descifrar(cifrado: string): string {
    return descifrar(this.llaveOFallar(), cifrado);
  }

  private llaveOFallar(): Buffer {
    if (!this.llave) {
      throw new ServiceUnavailableException({
        codigo: 'cifrado_no_configurado',
        message:
          'El cifrado de las cuentas no está configurado en el servidor.',
      });
    }
    return this.llave;
  }
}
