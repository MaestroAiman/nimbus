import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/api/folders/tree' }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as { message: unknown } };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('conserve le statut et la reponse d\'une HttpException', () => {
    const { status, body } = run(new BadRequestException('nom invalide'));

    expect(status).toBe(400);
    expect(body.message).toMatchObject({ message: 'nom invalide' });
  });

  it('renvoie 413 avec un message clair pour un corps trop volumineux (erreur du parseur JSON)', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), { status: 413, statusCode: 413 });

    const { status, body } = run(tooLarge);

    expect(status).toBe(413);
    expect(body.message).toBe('Requete trop volumineuse');
  });

  it('conserve le statut 4xx et le message des autres erreurs du parseur (JSON invalide)', () => {
    const invalidJson = Object.assign(new SyntaxError('Unexpected token'), { status: 400 });

    const { status, body } = run(invalidJson);

    expect(status).toBe(400);
    expect(body.message).toBe('Unexpected token');
  });

  it('reste en 500 generique pour toute autre erreur, sans exposer son message', () => {
    for (const error of [new Error('connection refused'), { status: 503 }, { status: 'oops' }, null, 'boom']) {
      const { status, body } = run(error);

      expect(status).toBe(500);
      expect(body.message).toBe('Erreur interne du serveur');
    }
  });
});
