import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

// Variables que el back necesita. Se validan al arrancar: si falta una o es
// inválida, el back no parte y dice cuál. En el código se leen siempre con
// ConfigService, nunca con process.env.
export class Entorno {
  @Type(() => Number)
  @IsInt()
  PORT = 3000;

  // Conexión a Postgres (en Docker, el contenedor de la base).
  @IsString()
  PGHOST: string;

  @Type(() => Number)
  @IsInt()
  PGPORT = 5432;

  @IsString()
  PGDATABASE: string;

  @IsString()
  PGUSER: string;

  @IsString()
  PGPASSWORD: string;

  // Contraseña con que parte toda cuenta nueva o restablecida.
  @IsString()
  @MinLength(8)
  CLAVE_INICIAL: string;

  // Correo del primer admin; solo se usa si todavía no hay ninguno.
  @IsOptional()
  @IsEmail()
  ADMIN_CORREO?: string;

  // Secreto para cifrar las contraseñas de las cuentas de los conductores. Si
  // falta, el back parte igual y esas cuentas responden 503.
  @IsOptional()
  @IsString()
  @MinLength(16)
  CLAVE_CUENTAS?: string;

  // Documentación de la API en /api/docs: "true" la prende.
  @Transform(({ value }: { value: unknown }) => value === 'true')
  @IsBoolean()
  SWAGGER_HABILITADO = false;
}

export function validarEntorno(variables: Record<string, unknown>): Entorno {
  const entorno = plainToInstance(Entorno, variables);
  const errores = validateSync(entorno);
  if (errores.length > 0) {
    // Al arrancar se puede lanzar Error: no hay ninguna petición que responder.
    const malas = errores.map((e) => e.property).join(', ');
    throw new Error(`Configuración inválida o incompleta: ${malas}`);
  }
  return entorno;
}
