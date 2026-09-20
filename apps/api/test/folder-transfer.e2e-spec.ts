import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, signUpAndSignIn } from './utils/create-test-app.js';

interface FolderBody {
  id: string;
  name: string;
}

interface TreeBody {
  root: FolderBody;
  folders: Record<string, string>;
}

describe('Envoi et telechargement de dossiers (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  async function newUser(label: string) {
    return signUpAndSignIn(app, `${label}-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');
  }

  function createTree(cookies: string[], body: { parentId?: string | null; rootName: string; dirs: string[] }) {
    return request(app.getHttpServer()).post('/api/folders/tree').set('Cookie', cookies).send(body);
  }

  function uploadInto(cookies: string[], folderId: string, name: string, content: string, silent = false) {
    const req = request(app.getHttpServer())
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', folderId)
      .attach('file', Buffer.from(content), name);
    return silent ? req.field('silent', 'true') : req;
  }

  function downloadZip(cookies: string[], folderId: string) {
    return request(app.getHttpServer())
      .get(`/api/folders/${folderId}/download`)
      .set('Cookie', cookies)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
  }

  it('cree une arborescence complete et renomme la racine en cas de conflit', async () => {
    const { cookies } = await newUser('tree');

    // "a/b" implique "a" : l'ancetre n'a pas besoin d'etre liste
    const first = await createTree(cookies, { rootName: 'Photos', dirs: ['2024', '2024/ete', 'vide'] }).expect(201);
    const body = first.body as TreeBody;

    expect(body.root.name).toBe('Photos');
    expect(Object.keys(body.folders).sort()).toEqual(['', '2024', '2024/ete', 'vide']);
    expect(body.folders['']).toBe(body.root.id);

    const level1 = await request(app.getHttpServer())
      .get(`/api/folders?parentId=${body.root.id}`)
      .set('Cookie', cookies)
      .expect(200);
    expect((level1.body.folders as FolderBody[]).map((f) => f.name).sort()).toEqual(['2024', 'vide']);

    const level2 = await request(app.getHttpServer())
      .get(`/api/folders?parentId=${body.folders['2024']}`)
      .set('Cookie', cookies)
      .expect(200);
    expect((level2.body.folders as FolderBody[]).map((f) => f.name)).toEqual(['ete']);

    // Meme nom envoye a nouveau : jamais de fusion, on suffixe
    const second = await createTree(cookies, { rootName: 'Photos', dirs: ['2024'] }).expect(201);
    const third = await createTree(cookies, { rootName: 'Photos', dirs: [] }).expect(201);
    expect((second.body as TreeBody).root.name).toBe('Photos (2)');
    expect((third.body as TreeBody).root.name).toBe('Photos (3)');

    const rootListing = await request(app.getHttpServer()).get('/api/folders').set('Cookie', cookies).expect(200);
    expect((rootListing.body.folders as FolderBody[]).map((f) => f.name).sort()).toEqual([
      'Photos',
      'Photos (2)',
      'Photos (3)',
    ]);
  });

  it("cree l'arborescence dans un dossier parent et ignore les dossiers en corbeille pour le nom libre", async () => {
    const { cookies } = await newUser('tree-parent');
    const parent = await request(app.getHttpServer())
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'Parent' })
      .expect(201);

    const first = await createTree(cookies, { parentId: parent.body.id, rootName: 'Docs', dirs: [] }).expect(201);
    expect((first.body as TreeBody).root.name).toBe('Docs');

    // Un dossier en corbeille ne bloque pas son nom (index unique partiel)
    await request(app.getHttpServer()).delete(`/api/folders/${(first.body as TreeBody).root.id}`).set('Cookie', cookies).expect(200);
    const again = await createTree(cookies, { parentId: parent.body.id, rootName: 'Docs', dirs: [] }).expect(201);
    expect((again.body as TreeBody).root.name).toBe('Docs');
  });

  it('refuse les chemins invalides et les parents qui ne nous appartiennent pas', async () => {
    const owner = await newUser('tree-owner');
    const intruder = await newUser('tree-intruder');

    for (const dirs of [['..'], ['a/../b'], ['a//b'], ['/a'], ['a/'], ['a\\b'], ['.'], ['']]) {
      await createTree(owner.cookies, { rootName: 'X', dirs }).expect(400);
    }
    for (const rootName of ['..', 'a/b', 'a\\b', '.']) {
      await createTree(owner.cookies, { rootName, dirs: [] }).expect(400);
    }

    const ownerFolder = await request(app.getHttpServer())
      .post('/api/folders')
      .set('Cookie', owner.cookies)
      .send({ name: 'Prive' })
      .expect(201);
    await createTree(intruder.cookies, { parentId: ownerFolder.body.id, rootName: 'X', dirs: [] }).expect(404);

    // Rien n'a ete cree par les requetes refusees
    const listing = await request(app.getHttpServer()).get('/api/folders').set('Cookie', owner.cookies).expect(200);
    expect((listing.body.folders as FolderBody[]).map((f) => f.name)).toEqual(['Prive']);
  });

  it('telecharge un dossier en ZIP avec son arborescence, sans la corbeille', async () => {
    const { cookies } = await newUser('zip');
    const tree = (await createTree(cookies, { rootName: 'Projet', dirs: ['docs', 'docs/vide', 'img'] }).expect(201))
      .body as TreeBody;

    await uploadInto(cookies, tree.folders[''], 'lisez-moi.txt', 'racine').expect(201);
    await uploadInto(cookies, tree.folders['docs'], 'notes.txt', 'notes').expect(201);
    const trashed = await uploadInto(cookies, tree.folders['docs'], 'supprime.txt', 'oups').expect(201);
    await request(app.getHttpServer()).delete(`/api/files/${trashed.body.id}`).set('Cookie', cookies).expect(200);

    // Sous-dossier en corbeille : ni lui ni son contenu ne doivent apparaitre
    await uploadInto(cookies, tree.folders['img'], 'photo.jpg', 'pixels').expect(201);
    await request(app.getHttpServer()).delete(`/api/folders/${tree.folders['img']}`).set('Cookie', cookies).expect(200);

    // Deux fichiers homonymes dans le meme dossier (autorise par le schema) : deux entrees distinctes
    await uploadInto(cookies, tree.folders['docs'], 'double.txt', 'un').expect(201);
    await uploadInto(cookies, tree.folders['docs'], 'double.txt', 'deux').expect(201);

    const response = await downloadZip(cookies, tree.root.id).expect(200);
    const zip = response.body as Buffer;
    const text = zip.toString('latin1');

    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('Projet.zip');
    expect(response.headers['content-length']).toBeUndefined();
    expect(response.headers['x-accel-buffering']).toBe('no');
    expect(zip.subarray(0, 2).toString('latin1')).toBe('PK');

    for (const name of [
      'Projet/',
      'Projet/lisez-moi.txt',
      'Projet/docs/',
      'Projet/docs/vide/',
      'Projet/docs/notes.txt',
      'Projet/docs/double.txt',
      'Projet/docs/double (2).txt',
    ]) {
      expect(text).toContain(name);
    }
    expect(text).not.toContain('supprime.txt');
    expect(text).not.toContain('photo.jpg');
    expect(text).not.toContain('Projet/img/');
  });

  it("protege le telechargement d'un dossier (autre utilisateur, dossier en corbeille)", async () => {
    const owner = await newUser('zip-owner');
    const intruder = await newUser('zip-intruder');
    const tree = (await createTree(owner.cookies, { rootName: 'Secret', dirs: [] }).expect(201)).body as TreeBody;

    await request(app.getHttpServer())
      .get(`/api/folders/${tree.root.id}/download`)
      .set('Cookie', intruder.cookies)
      .expect(404);

    await request(app.getHttpServer()).delete(`/api/folders/${tree.root.id}`).set('Cookie', owner.cookies).expect(200);
    await request(app.getHttpServer()).get(`/api/folders/${tree.root.id}/download`).set('Cookie', owner.cookies).expect(404);
    await request(app.getHttpServer()).get('/api/folders/inconnu/download').set('Cookie', owner.cookies).expect(404);
  });

  it("n'enregistre qu'un evenement pour un envoi de dossier (fichiers silencieux)", async () => {
    const { cookies } = await newUser('silent');
    const tree = (await createTree(cookies, { rootName: 'Lot', dirs: ['a', 'b'] }).expect(201)).body as TreeBody;

    await uploadInto(cookies, tree.folders['a'], 'un.txt', '1', true).expect(201);
    await uploadInto(cookies, tree.folders['b'], 'deux.txt', '2', true).expect(201);

    const quiet = await request(app.getHttpServer()).get('/api/activity').set('Cookie', cookies).expect(200);
    expect((quiet.body as { action: string }[]).map((event) => event.action)).toEqual(['folder.created']);

    await uploadInto(cookies, tree.folders['a'], 'trois.txt', '3').expect(201);
    const loud = await request(app.getHttpServer()).get('/api/activity').set('Cookie', cookies).expect(200);
    expect((loud.body as { action: string }[]).map((event) => event.action).sort()).toEqual([
      'file.created',
      'folder.created',
    ]);
  });
});
