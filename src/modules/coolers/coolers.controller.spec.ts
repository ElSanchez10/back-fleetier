import { StreamableFile } from '@nestjs/common';
import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import { CoolersController } from './coolers.controller';
import { CoolersService } from './coolers.service';
import type { EditarCoolerDto } from './dto/editar-cooler.request.dto';
import type { FiltroCoolersDto } from './dto/filtro-coolers.query.dto';
import type { FiltroRutasCoolerDto } from './dto/filtro-rutas-cooler.query.dto';
import type { NuevoCoolerDto } from './dto/nuevo-cooler.request.dto';

const COOLER = {
  id: 7,
  nombre: '7',
  codigo: '37681389',
  fechaAdquisicion: '2026-01-01',
  tieneTapa: true,
  estado: 'danado' as const,
  tipoCoolerId: 1,
  marca: 'Coleman',
  capacidad: 'pequeno' as const,
  color: 'azul' as const,
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
};

describe('CoolersController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [], total: 0, resumen: {} })),
    todos: vi.fn(() => Promise.resolve([COOLER])),
    porCodigo: vi.fn(() => Promise.resolve(COOLER)),
    buscar: vi.fn(() => Promise.resolve(COOLER)),
    rutas: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    crear: vi.fn(() => Promise.resolve(COOLER)),
    editar: vi.fn(() => Promise.resolve(COOLER)),
  };
  let controller: CoolersController;
  const u = usuario('encargado', 1);
  const q = {} as FiltroCoolersDto;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      CoolersController,
      CoolersService,
      servicio,
    );
  });

  it('la planilla trae las columnas de Laravel, con nombres legibles', async () => {
    const [titulos, fila] = await filasDeExcel(await controller.excel(q, u));
    expect(titulos).toEqual([
      'Identificador',
      'Cooler',
      'Adquisición',
      'Tiene Tapa (sí:1)',
      'Marca',
      'Capacidad',
      'Color',
      'Local',
      'Ciudad',
      'Estado',
    ]);
    expect(fila).toEqual(
      expect.arrayContaining([
        7,
        '7',
        1,
        'Coleman',
        'Pequeño',
        'Azul',
        'Dañado',
      ]),
    );
  });

  it('las etiquetas salen en PDF, del filtro o de un cooler', async () => {
    const todas = await controller.etiquetas(q, u);
    expect(todas).toBeInstanceOf(StreamableFile);
    expect(todas.getHeaders().type).toBe('application/pdf');
    expect(todas.getHeaders().disposition).toContain('all-barcode.pdf');
    const una = await controller.etiqueta(7, u);
    expect(una.getHeaders().disposition).toContain('barcode.pdf');
    expect(servicio.buscar).toHaveBeenCalledWith(7, u);
  });

  it('el código de barras de la ficha es un SVG', async () => {
    expect(await controller.barras(7, u)).toMatch(/^<svg/);
  });

  it('el resto de los endpoints pasan los datos y la cuenta', async () => {
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.porCodigo('37681389');
    expect(servicio.porCodigo).toHaveBeenCalledWith('37681389');
    await controller.uno(7, u);
    expect(servicio.buscar).toHaveBeenCalledWith(7, u);
    const rq = {} as FiltroRutasCoolerDto;
    await controller.rutas(7, rq, u);
    expect(servicio.rutas).toHaveBeenCalledWith(7, rq, u);
    const nuevo = { nombre: '8' } as NuevoCoolerDto;
    await controller.crear(nuevo, u);
    expect(servicio.crear).toHaveBeenCalledWith(nuevo, u);
    const editado = { nombre: '7' } as EditarCoolerDto;
    await controller.editar(7, editado, u);
    expect(servicio.editar).toHaveBeenCalledWith(7, editado, u);
  });
});
