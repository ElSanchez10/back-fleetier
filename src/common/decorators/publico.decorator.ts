import { SetMetadata } from '@nestjs/common';

export const META_PUBLICO = 'publico';

// Ruta que no exige sesión.
export const Publico = () => SetMetadata(META_PUBLICO, true);

export const META_CON_CLAVE_INICIAL = 'conClaveInicial';

// Ruta que se puede usar aunque la cuenta aún tenga la contraseña inicial.
export const ConClaveInicial = () => SetMetadata(META_CON_CLAVE_INICIAL, true);
