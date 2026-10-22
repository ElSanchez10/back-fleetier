import {
  controladorCon,
  filasDeExcel,
  usuario,
} from '@/common/testing/pruebas';
import { ConductoresController } from './conductores.controller';
import { ConductoresService } from './conductores.service';
import type { ConductorDto } from './dto/conductor.request.dto';
import type { FiltroConductoresDto } from './dto/filtro-conductores.query.dto';

const JUAN = {
  id: 1,
  nombre: 'Juan Pérez',
  run: '12345678-5',
  fechaNacimiento: '1990-05-05',
  telefono: '912345678',
  email: 'juan@x.cl',
  tipoConductor: 'Planta',
};

describe('ConductoresController', () => {
  const servicio = {
    listar: vi.fn(() => Promise.resolve({ items: [], total: 0, resumen: {} })),
    todos: vi.fn(() => Promise.resolve([JUAN])),
    buscar: vi.fn(() => Promise.resolve(JUAN)),
    rutas: vi.fn(() => Promise.resolve([])),
    actividad: vi.fn(() => Promise.resolve({ locales: [], ordenes: 0 })),
    crear: vi.fn(() => Promise.resolve(JUAN)),
    editar: vi.fn(() => Promise.resolve(JUAN)),
  };
  let controller: ConductoresController;
  const u = usuario('encargado', 1);
  const rango = { desde: '2026-10-01', hasta: '2026-10-31' };

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(
      ConductoresController,
      ConductoresService,
      servicio,
    );
  });

  it('la planilla trae las columnas de Laravel, con el RUN con puntos', async () => {
    const [titulos, fila] = await filasDeExcel(
      await controller.excel({} as FiltroConductoresDto, u),
    );
    expect(titulos).toEqual([
      'Identificador',
      'Nombre',
      'RUN',
      'Fecha de Nacimiento',
      'Contacto',
      'Correo',
      'Clasificación',
    ]);
    expect(fila).toContain('12.345.678-5');
  });

  it('la ficha, sus rutas y su actividad son las que la cuenta ve', async () => {
    await controller.uno(1, u);
    expect(servicio.buscar).toHaveBeenCalledWith(1, u);
    await controller.rutas(1, rango, u);
    expect(servicio.rutas).toHaveBeenCalledWith(1, rango, u);
    await controller.actividad(1, rango, u);
    expect(servicio.actividad).toHaveBeenCalledWith(1, rango, u);
  });

  it('listar, crear y editar pasan los datos y la cuenta', async () => {
    const q = {} as FiltroConductoresDto;
    const dto = { nombre: 'Juan' } as ConductorDto;
    await controller.listar(q, u);
    expect(servicio.listar).toHaveBeenCalledWith(q, u);
    await controller.crear(dto, u);
    expect(servicio.crear).toHaveBeenCalledWith(dto, u);
    await controller.editar(1, dto, u);
    expect(servicio.editar).toHaveBeenCalledWith(1, dto, u);
  });
});
