import { StreamableFile } from '@nestjs/common';
import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import type { FiltroActividadLocalesDto } from './dto/filtro-actividad-locales.query.dto';
import { ResumenController } from './resumen.controller';
import { ResumenService } from './resumen.service';

describe('ResumenController', () => {
  const actividad = [
    {
      localId: 1,
      local: 'Lider Temuco',
      ciudad: 'Temuco',
      rutas: 3,
      ordenes: 40,
    },
  ];
  const servicio = {
    resumen: vi.fn(() => Promise.resolve({ rutasActivas: 1 })),
    actividadLocales: vi.fn(() => Promise.resolve(actividad)),
  };
  let controller: ResumenController;
  const q = { mes: '2026-10' } as FiltroActividadLocalesDto;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      ResumenController,
      ResumenService,
      servicio,
    );
  });

  it('el resumen y la actividad son los de la cuenta', async () => {
    const u = usuario('encargado', 1);
    await controller.resumen(u);
    expect(servicio.resumen).toHaveBeenCalledWith(u);
    expect(await controller.locales(q, u)).toBe(actividad);
    expect(servicio.actividadLocales).toHaveBeenCalledWith(q, u);
  });

  it('la planilla trae las columnas de Laravel', async () => {
    const archivo = await controller.localesExcel(q, usuario('admin'));
    expect(archivo).toBeInstanceOf(StreamableFile);
    const [titulos, fila] = await filasDeExcel(archivo);
    expect(titulos).toEqual(['Ciudad', 'Local', 'Cantidad Ordenes de Pedido']);
    expect(fila).toEqual(['Temuco', 'Lider Temuco', 40]);
  });
});
