import { SesionAbiertaResponseDto } from './sesion.response.dto';

describe('SesionAbiertaResponseDto', () => {
  it('una sesión abierta, usada como callback', () => {
    expect(
      [
        {
          navegador: 'Firefox',
          ip: '10.8.0.6',
          ultima_actividad: 't',
          actual: true,
        },
      ].map(SesionAbiertaResponseDto.fromRow),
    ).toEqual([
      {
        navegador: 'Firefox',
        ip: '10.8.0.6',
        ultimaActividad: 't',
        actual: true,
      },
    ]);
  });
});
