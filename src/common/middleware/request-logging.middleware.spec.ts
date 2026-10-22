import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { RequestLoggingMiddleware } from './request-logging.middleware';

function armar(idRecibido?: string) {
  const respuesta = Object.assign(new EventEmitter(), {
    statusCode: 201,
    setHeader: vi.fn(),
  });
  const peticion = {
    method: 'POST',
    originalUrl: '/api/v1/rutas?buscar=Juan',
    header: () => idRecibido,
  };
  const siguiente = vi.fn();
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  new RequestLoggingMiddleware().use(
    peticion as never,
    respuesta as never,
    siguiente,
  );
  return { respuesta, siguiente, log };
}

describe('RequestLoggingMiddleware', () => {
  afterEach(() => vi.restoreAllMocks());

  it('genera un id, lo devuelve y registra al terminar, sin la query', () => {
    const { respuesta, siguiente, log } = armar();
    expect(siguiente).toHaveBeenCalled();
    const [, id] = respuesta.setHeader.mock.calls[0] as [string, string];
    expect(respuesta.setHeader).toHaveBeenCalledWith('X-Request-Id', id);
    expect(log).not.toHaveBeenCalled();
    respuesta.emit('finish');
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^${id} POST /api/v1/rutas 201 \\d+ms$`),
      ),
    );
  });

  it('usa el id que viene en la petición si es válido', () => {
    expect(armar('abc-123').respuesta.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      'abc-123',
    );
  });

  it('descarta un id con caracteres raros', () => {
    const { respuesta } = armar('malo\nINYECTADO');
    const [, id] = respuesta.setHeader.mock.calls[0] as [string, string];
    expect(id).not.toContain('INYECTADO');
  });
});
