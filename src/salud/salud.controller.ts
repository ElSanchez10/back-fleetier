import { Controller, Get } from '@nestjs/common';
import { Publico } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';

@Controller('salud')
export class SaludController {
  constructor(private readonly bd: BdService) {}

  // Responde solo si la base contesta: sirve para comprobar el despliegue completo.
  @Get()
  @Publico()
  async salud() {
    await this.bd.consultar('select 1');
    return { estado: 'ok' };
  }
}
