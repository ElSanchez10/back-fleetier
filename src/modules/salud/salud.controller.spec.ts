import { DatabaseService } from '@/common/database/database.service';
import { controladorCon } from '@/common/testing/pruebas';
import { SaludController } from './salud.controller';

describe('SaludController', () => {
  it('responde ok si la base contesta', async () => {
    const bd = { consultar: vi.fn(() => Promise.resolve([])) };
    const controller = await controladorCon(
      SaludController,
      DatabaseService,
      bd,
    );
    expect(await controller.salud()).toEqual({ estado: 'ok' });
    expect(bd.consultar).toHaveBeenCalledWith('select 1');
  });

  it('falla si la base no contesta', async () => {
    const bd = { consultar: vi.fn(() => Promise.reject(new Error('caída'))) };
    const controller = await controladorCon(
      SaludController,
      DatabaseService,
      bd,
    );
    await expect(controller.salud()).rejects.toThrow('caída');
  });
});
