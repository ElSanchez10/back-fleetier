import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '@/common/database/database.service';
import { Publico } from '@/common/decorators/publico.decorator';

// Sin versión: /api/salud, para que los despliegues lo comprueben siempre igual.
@ApiTags('Salud')
@Controller({ path: 'salud', version: VERSION_NEUTRAL })
export class SaludController {
  constructor(private readonly bd: DatabaseService) {}

  @Get()
  @Publico()
  @ApiOperation({
    summary: 'Responde solo si la base contesta: comprueba el despliegue',
  })
  @ApiOkResponse({ schema: { example: { estado: 'ok' } } })
  async salud() {
    await this.bd.consultar('select 1');
    return { estado: 'ok' };
  }
}
