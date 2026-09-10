import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, signUpAndSignIn } from './utils/create-test-app.js';

describe('Folders & Files (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('permet de creer une arborescence, uploader/deplacer/supprimer un fichier, avec verification de propriete', async () => {
    const server = app.getHttpServer();
    const { cookies } = await signUpAndSignIn(app, `owner-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    // Arborescence : Documents/Sous-dossier
    const documents = await request(server)
      .post('/folders')
      .set('Cookie', cookies)
      .send({ name: 'Documents' })
      .expect(201);

    const subfolder = await request(server)
      .post('/folders')
      .set('Cookie', cookies)
      .send({ name: 'Sous-dossier', parentId: documents.body.id })
      .expect(201);

    const rootListing = await request(server).get('/folders').set('Cookie', cookies).expect(200);
    expect(rootListing.body.folders.map((f: { id: string }) => f.id)).toContain(documents.body.id);

    const documentsListing = await request(server)
      .get(`/folders?parentId=${documents.body.id}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(documentsListing.body.folders.map((f: { id: string }) => f.id)).toContain(subfolder.body.id);

    // Upload d'un fichier de plusieurs dizaines de Mo dans le sous-dossier
    const fileContent = Buffer.alloc(30 * 1024 * 1024, 'a');
    const upload = await request(server)
      .post('/files')
      .set('Cookie', cookies)
      .field('folderId', subfolder.body.id)
      .attach('file', fileContent, 'gros-fichier.bin')
      .expect(201);

    expect(upload.body.name).toBe('gros-fichier.bin');
    expect(Number(upload.body.sizeBytes)).toBe(fileContent.length);

    const subfolderListingAfterUpload = await request(server)
      .get(`/folders?parentId=${subfolder.body.id}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(subfolderListingAfterUpload.body.files.map((f: { id: string }) => f.id)).toContain(upload.body.id);

    // Telechargement : le contenu recu doit correspondre a ce qui a ete envoye
    const download = await request(server)
      .get(`/files/${upload.body.id}/download`)
      .set('Cookie', cookies)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((download.body as Buffer).length).toBe(fileContent.length);

    // Deplacement du fichier vers la racine
    await request(server)
      .patch(`/files/${upload.body.id}`)
      .set('Cookie', cookies)
      .send({ folderId: null })
      .expect(200);

    const rootListingAfterMove = await request(server).get('/folders').set('Cookie', cookies).expect(200);
    expect(rootListingAfterMove.body.files.map((f: { id: string }) => f.id)).toContain(upload.body.id);

    // Impossible de deplacer un dossier dans l'un de ses propres sous-dossiers (cycle)
    await request(server)
      .patch(`/folders/${documents.body.id}`)
      .set('Cookie', cookies)
      .send({ parentId: subfolder.body.id })
      .expect(400);

    // Suppression du fichier
    await request(server).delete(`/files/${upload.body.id}`).set('Cookie', cookies).expect(200);
    await request(server).get(`/files/${upload.body.id}/download`).set('Cookie', cookies).expect(404);

    // Suppression du dossier Documents (cascade sur Sous-dossier)
    await request(server).delete(`/folders/${documents.body.id}`).set('Cookie', cookies).expect(200);
    await request(server).get(`/folders?parentId=${subfolder.body.id}`).set('Cookie', cookies).expect(404);
  });

  it("empeche un utilisateur d'acceder aux dossiers et fichiers d'un autre utilisateur", async () => {
    const server = app.getHttpServer();

    const owner = await signUpAndSignIn(app, `owner2-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');
    const intruder = await signUpAndSignIn(app, `intruder-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    const ownerFolder = await request(server)
      .post('/folders')
      .set('Cookie', owner.cookies)
      .send({ name: 'Prive' })
      .expect(201);

    const ownerFile = await request(server)
      .post('/files')
      .set('Cookie', owner.cookies)
      .attach('file', Buffer.from('donnees privees'), 'prive.txt')
      .expect(201);

    // L'intrus ne doit voir ni le dossier ni le fichier du proprietaire
    await request(server).get(`/folders?parentId=${ownerFolder.body.id}`).set('Cookie', intruder.cookies).expect(404);
    await request(server).patch(`/folders/${ownerFolder.body.id}`).set('Cookie', intruder.cookies).send({ name: 'Vole' }).expect(404);
    await request(server).delete(`/folders/${ownerFolder.body.id}`).set('Cookie', intruder.cookies).expect(404);

    await request(server).get(`/files/${ownerFile.body.id}/download`).set('Cookie', intruder.cookies).expect(404);
    await request(server).patch(`/files/${ownerFile.body.id}`).set('Cookie', intruder.cookies).send({ name: 'vole.txt' }).expect(404);
    await request(server).delete(`/files/${ownerFile.body.id}`).set('Cookie', intruder.cookies).expect(404);

    // L'intrus ne peut pas non plus deplacer son propre fichier vers le dossier du proprietaire
    const intruderFile = await request(server)
      .post('/files')
      .set('Cookie', intruder.cookies)
      .attach('file', Buffer.from('fichier intrus'), 'intrus.txt')
      .expect(201);

    await request(server)
      .patch(`/files/${intruderFile.body.id}`)
      .set('Cookie', intruder.cookies)
      .send({ folderId: ownerFolder.body.id })
      .expect(404);
  });
});
