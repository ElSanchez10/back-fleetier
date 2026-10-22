// Apoyo para las pruebas (*.spec.ts): datos emulados, sin base de datos. No
// entra en el build (tsconfig.build.json).
import type { StreamableFile, Type } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import type { Entorno } from '../config/env.validation';
import type { DatabaseService, Consultar } from '../database/database.service';
import type {
  Rol,
  UsuarioSesion,
} from '../interfaces/usuario-sesion.interface';

// Una consulta que nunca se usa: los repositorios de las pruebas son falsos.
export const sqlFalso = (() => Promise.resolve([])) as unknown as Consultar;

// Un BdService cuya transacción solo ejecuta el trabajo.
export const bdFalsa = {
  consultar: sqlFalso,
  transaccion: <R>(trabajo: (sql: Consultar) => Promise<R>) =>
    trabajo(sqlFalso),
} as unknown as DatabaseService;

// Un ConfigService con solo las variables que la prueba necesita.
export function configFalsa(
  valores: Partial<Entorno>,
): ConfigService<Entorno, true> {
  return {
    get: (clave: keyof Entorno) => valores[clave],
    getOrThrow: (clave: keyof Entorno) => {
      if (valores[clave] === undefined) throw new Error(`Falta ${clave}`);
      return valores[clave];
    },
  } as unknown as ConfigService<Entorno, true>;
}

export function usuario(
  rol: Rol,
  localId: number | null = null,
): UsuarioSesion {
  return {
    id: 1,
    nombre: 'Prueba',
    correo: 'p@p.cl',
    rol,
    debeCambiarClave: false,
    localId,
  };
}

// El `codigo` del error que lanzó la promesa, o 'sin error'.
export async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return 'sin error';
  } catch (error) {
    const e = error as { getResponse?: () => { codigo?: string } };
    return e.getResponse?.().codigo ?? String(error);
  }
}

// Arma un controller con su servicio reemplazado por `servicio` (mocks de
// vitest), como lo haría Nest: sirve para probar que cada endpoint llama al
// servicio con lo que corresponde.
export async function controladorCon<C, S extends object>(
  Controlador: Type<C>,
  Servicio: Type<unknown> | string,
  servicio: S,
): Promise<C> {
  const modulo = await Test.createTestingModule({
    controllers: [Controlador],
    providers: [{ provide: Servicio, useValue: servicio }],
  }).compile();
  return modulo.get(Controlador);
}

// Las filas de una planilla Excel que devolvió un endpoint (StreamableFile).
export async function filasDeExcel(
  archivo: StreamableFile,
): Promise<unknown[][]> {
  const trozos: Buffer[] = [];
  for await (const trozo of archivo.getStream()) {
    trozos.push(trozo as Buffer);
  }
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(Buffer.concat(trozos) as unknown as ExcelJS.Buffer);
  const filas: unknown[][] = [];
  libro.worksheets[0].eachRow((fila) => {
    filas.push((fila.values as unknown[]).slice(1));
  });
  return filas;
}
