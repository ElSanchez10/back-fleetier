import pg from 'pg';
import { bdFalsa, codigoDe, usuario } from '../comun/pruebas.js';
import type { OperacionesService } from '../rutas/operaciones.service.js';
import type { EditarCoolerDto, NuevoCoolerDto } from './cooler.dto.js';
import type { Cooler, CoolersRepositorio } from './coolers.repositorio.js';
import { CoolersService } from './coolers.service.js';

// Las reglas de los coolers con un repositorio emulado.

const COOLER: Cooler = {
  id: 7,
  nombre: '7',
  codigo: '12345678',
  fechaAdquisicion: '2026-01-01',
  tieneTapa: true,
  estado: 'en_ruta',
  tipoCoolerId: 1,
  marca: 'Coleman',
  capacidad: 'mediano',
  color: 'azul',
  localId: 1,
  local: 'Lider Temuco',
  ciudad: 'Temuco',
};

function codigoRepetido() {
  const error = new pg.DatabaseError('repetido', 0, 'error');
  error.constraint = 'cooler_codigo_uk';
  return error;
}

function armar() {
  const datos = {
    porId: vi.fn((id: number, localId: number | null) =>
      Promise.resolve(
        id === COOLER.id && (localId === null || localId === COOLER.localId)
          ? COOLER
          : undefined,
      ),
    ),
    porCodigo: vi.fn((codigo: string) =>
      Promise.resolve(codigo === COOLER.codigo ? COOLER : undefined),
    ),
    insertar: vi.fn(() => Promise.resolve(COOLER.id)),
    actualizar: vi.fn(() => Promise.resolve()),
  };
  const operaciones = { liberar: vi.fn(() => Promise.resolve(null)) };
  const servicio = new CoolersService(
    bdFalsa,
    datos as unknown as CoolersRepositorio,
    operaciones as unknown as OperacionesService,
  );
  return { datos, operaciones, servicio };
}

const NUEVO = {
  nombre: '8',
  fechaAdquisicion: '2026-01-01',
  tieneTapa: false,
  localId: 1,
  tipoCoolerId: 1,
};

describe('CoolersService', () => {
  it('una cuenta con local no ve coolers de otro local', async () => {
    const { servicio } = armar();
    expect(await codigoDe(servicio.buscar(7, usuario('encargado', 2)))).toBe(
      'cooler_no_existe',
    );
    expect((await servicio.buscar(7, usuario('admin'))).id).toBe(7);
  });

  it('la pistola encuentra un cooler de cualquier local, y quita espacios', async () => {
    const { servicio } = armar();
    expect((await servicio.porCodigo(' 12345678 ')).id).toBe(7);
    expect(await codigoDe(servicio.porCodigo('000'))).toBe('cooler_no_existe');
  });

  describe('crear', () => {
    it('solo en el local de la cuenta', async () => {
      const { servicio, datos } = armar();
      expect(
        await codigoDe(
          servicio.crear(
            { ...NUEVO, localId: 2 } as NuevoCoolerDto,
            usuario('encargado', 1),
          ),
        ),
      ).toBe('otro_local');
      expect(datos.insertar).not.toHaveBeenCalled();
    });

    it('si el código sale repetido, prueba con otro', async () => {
      const { servicio, datos } = armar();
      const codigos = ['11111111', '22222222'];
      servicio.nuevoCodigo = () => codigos.shift()!;
      datos.insertar.mockRejectedValueOnce(codigoRepetido());
      await servicio.crear(NUEVO as NuevoCoolerDto, usuario('admin'));
      expect(datos.insertar).toHaveBeenCalledTimes(2);
      expect(datos.insertar.mock.calls.map((c) => (c as unknown[])[1])).toEqual(
        ['11111111', '22222222'],
      );
    });

    it('se rinde después de cinco códigos repetidos', async () => {
      const { servicio, datos } = armar();
      datos.insertar.mockRejectedValue(codigoRepetido());
      await expect(
        servicio.crear(NUEVO as NuevoCoolerDto, usuario('admin')),
      ).rejects.toBeInstanceOf(pg.DatabaseError);
      expect(datos.insertar).toHaveBeenCalledTimes(5);
    });

    it('otro error no se reintenta', async () => {
      const { servicio, datos } = armar();
      datos.insertar.mockRejectedValue(new Error('otra cosa'));
      await expect(
        servicio.crear(NUEVO as NuevoCoolerDto, usuario('admin')),
      ).rejects.toThrow('otra cosa');
      expect(datos.insertar).toHaveBeenCalledTimes(1);
    });
  });

  describe('editar', () => {
    const edicion = (estado: EditarCoolerDto['estado']) =>
      ({ ...COOLER, estado }) as EditarCoolerDto;

    it('no deja poner a mano un estado de ruta', async () => {
      const { servicio, datos } = armar();
      expect(
        await codigoDe(
          servicio.editar(7, edicion('en_espera'), usuario('admin')),
        ),
      ).toBe('cooler_estado_de_ruta');
      expect(datos.actualizar).not.toHaveBeenCalled();
    });

    it('si cambia a otro estado, saca al cooler de su ruta como si hubiera vuelto', async () => {
      const { servicio, operaciones, datos } = armar();
      await servicio.editar(7, edicion('danado'), usuario('admin'));
      expect(datos.actualizar).toHaveBeenCalled();
      expect(operaciones.liberar).toHaveBeenCalledWith(
        expect.anything(),
        7,
        'danado',
      );
    });

    it('si el estado no cambia, no toca su ruta (aunque sea un estado de ruta)', async () => {
      const { servicio, operaciones, datos } = armar();
      await servicio.editar(7, edicion('en_ruta'), usuario('admin'));
      expect(datos.actualizar).toHaveBeenCalled();
      expect(operaciones.liberar).not.toHaveBeenCalled();
    });
  });
});
