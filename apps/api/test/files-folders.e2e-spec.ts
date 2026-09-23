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
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'Documents' })
      .expect(201);

    const subfolder = await request(server)
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'Sous-dossier', parentId: documents.body.id })
      .expect(201);

    const rootListing = await request(server).get('/api/folders').set('Cookie', cookies).expect(200);
    expect(rootListing.body.folders.map((f: { id: string }) => f.id)).toContain(documents.body.id);

    const documentsListing = await request(server)
      .get(`/api/folders?parentId=${documents.body.id}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(documentsListing.body.folders.map((f: { id: string }) => f.id)).toContain(subfolder.body.id);

    // Upload d'un fichier de plusieurs dizaines de Mo dans le sous-dossier
    const fileContent = Buffer.alloc(30 * 1024 * 1024, 'a');
    const upload = await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', subfolder.body.id)
      .attach('file', fileContent, 'gros-fichier.bin')
      .expect(201);

    expect(upload.body.name).toBe('gros-fichier.bin');
    expect(Number(upload.body.sizeBytes)).toBe(fileContent.length);

    const subfolderListingAfterUpload = await request(server)
      .get(`/api/folders?parentId=${subfolder.body.id}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(subfolderListingAfterUpload.body.files.map((f: { id: string }) => f.id)).toContain(upload.body.id);

    // Telechargement : le contenu recu doit correspondre a ce qui a ete envoye
    const download = await request(server)
      .get(`/api/files/${upload.body.id}/download`)
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
      .patch(`/api/files/${upload.body.id}`)
      .set('Cookie', cookies)
      .send({ folderId: null })
      .expect(200);

    const rootListingAfterMove = await request(server).get('/api/folders').set('Cookie', cookies).expect(200);
    expect(rootListingAfterMove.body.files.map((f: { id: string }) => f.id)).toContain(upload.body.id);

    // Impossible de deplacer un dossier dans l'un de ses propres sous-dossiers (cycle)
    await request(server)
      .patch(`/api/folders/${documents.body.id}`)
      .set('Cookie', cookies)
      .send({ parentId: subfolder.body.id })
      .expect(400);

    // Suppression du fichier
    await request(server).delete(`/api/files/${upload.body.id}`).set('Cookie', cookies).expect(200);
    await request(server).get(`/api/files/${upload.body.id}/download`).set('Cookie', cookies).expect(404);

    // Suppression du dossier Documents (cascade sur Sous-dossier)
    await request(server).delete(`/api/folders/${documents.body.id}`).set('Cookie', cookies).expect(200);
    await request(server).get(`/api/folders?parentId=${subfolder.body.id}`).set('Cookie', cookies).expect(404);
  });

  it("empeche un utilisateur d'acceder aux dossiers et fichiers d'un autre utilisateur", async () => {
    const server = app.getHttpServer();

    const owner = await signUpAndSignIn(app, `owner2-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');
    const intruder = await signUpAndSignIn(app, `intruder-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    const ownerFolder = await request(server)
      .post('/api/folders')
      .set('Cookie', owner.cookies)
      .send({ name: 'Prive' })
      .expect(201);

    const ownerFile = await request(server)
      .post('/api/files')
      .set('Cookie', owner.cookies)
      .attach('file', Buffer.from('donnees privees'), 'prive.txt')
      .expect(201);

    // L'intrus ne doit voir ni le dossier ni le fichier du proprietaire
    await request(server).get(`/api/folders?parentId=${ownerFolder.body.id}`).set('Cookie', intruder.cookies).expect(404);
    await request(server).patch(`/api/folders/${ownerFolder.body.id}`).set('Cookie', intruder.cookies).send({ name: 'Vole' }).expect(404);
    await request(server).delete(`/api/folders/${ownerFolder.body.id}`).set('Cookie', intruder.cookies).expect(404);

    await request(server).get(`/api/files/${ownerFile.body.id}/download`).set('Cookie', intruder.cookies).expect(404);
    await request(server).patch(`/api/files/${ownerFile.body.id}`).set('Cookie', intruder.cookies).send({ name: 'vole.txt' }).expect(404);
    await request(server).delete(`/api/files/${ownerFile.body.id}`).set('Cookie', intruder.cookies).expect(404);

    // L'intrus ne peut pas non plus deplacer son propre fichier vers le dossier du proprietaire
    const intruderFile = await request(server)
      .post('/api/files')
      .set('Cookie', intruder.cookies)
      .attach('file', Buffer.from('fichier intrus'), 'intrus.txt')
      .expect(201);

    await request(server)
      .patch(`/api/files/${intruderFile.body.id}`)
      .set('Cookie', intruder.cookies)
      .send({ folderId: ownerFolder.body.id })
      .expect(404);
  });

  it('gere les favoris, la corbeille (suppression reversible), la restauration et la suppression definitive', async () => {
    const server = app.getHttpServer();
    const { cookies } = await signUpAndSignIn(app, `trash-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    const folder = await request(server).post('/api/folders').set('Cookie', cookies).send({ name: 'Projets' }).expect(201);

    const file = await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', folder.body.id)
      .attach('file', Buffer.from('contenu'), 'note.txt')
      .expect(201);

    // Favoris : marquer, retrouver dans /favorites, retirer
    await request(server).patch(`/api/files/${file.body.id}`).set('Cookie', cookies).send({ isFavorite: true }).expect(200);
    await request(server)
      .patch(`/api/folders/${folder.body.id}`)
      .set('Cookie', cookies)
      .send({ isFavorite: true })
      .expect(200);

    const favorites = await request(server).get('/api/favorites').set('Cookie', cookies).expect(200);
    expect(favorites.body.files.map((f: { id: string }) => f.id)).toContain(file.body.id);
    expect(favorites.body.folders.map((f: { id: string }) => f.id)).toContain(folder.body.id);

    await request(server).patch(`/api/files/${file.body.id}`).set('Cookie', cookies).send({ isFavorite: false }).expect(200);
    const favoritesAfterUnmark = await request(server).get('/api/favorites').set('Cookie', cookies).expect(200);
    expect(favoritesAfterUnmark.body.files.map((f: { id: string }) => f.id)).not.toContain(file.body.id);

    // Corbeille : le dossier supprime (avec le fichier dedans) apparait dans /trash, et une seule fois (racine)
    await request(server).delete(`/api/folders/${folder.body.id}`).set('Cookie', cookies).expect(200);

    const trash = await request(server).get('/api/trash').set('Cookie', cookies).expect(200);
    expect(trash.body.folders.map((f: { id: string }) => f.id)).toEqual([folder.body.id]);
    expect(trash.body.files.map((f: { id: string }) => f.id)).not.toContain(file.body.id);

    // Le dossier et son contenu ne sont plus visibles via les routes normales
    await request(server).get(`/api/folders?parentId=${folder.body.id}`).set('Cookie', cookies).expect(404);
    await request(server).get(`/api/files/${file.body.id}/download`).set('Cookie', cookies).expect(404);

    // Restauration : le dossier et son contenu reapparaissent, la corbeille se vide
    await request(server).post(`/api/folders/${folder.body.id}/restore`).set('Cookie', cookies).expect(200);
    await request(server).get(`/api/files/${file.body.id}/download`).set('Cookie', cookies).expect(200);

    const trashAfterRestore = await request(server).get('/api/trash').set('Cookie', cookies).expect(200);
    expect(trashAfterRestore.body.folders).toHaveLength(0);
    expect(trashAfterRestore.body.files).toHaveLength(0);

    // Suppression definitive : irreversible, meme via /restore
    await request(server).delete(`/api/folders/${folder.body.id}`).set('Cookie', cookies).expect(200);
    await request(server).delete(`/api/folders/${folder.body.id}/permanent`).set('Cookie', cookies).expect(200);
    await request(server).post(`/api/folders/${folder.body.id}/restore`).set('Cookie', cookies).expect(404);

    const trashAfterPurge = await request(server).get('/api/trash').set('Cookie', cookies).expect(200);
    expect(trashAfterPurge.body.folders).toHaveLength(0);
    expect(trashAfterPurge.body.files).toHaveLength(0);
  });

  it('empeche de creer/uploader dans un dossier passe a la corbeille, et libere son nom', async () => {
    const server = app.getHttpServer();
    const { cookies } = await signUpAndSignIn(app, `trash2-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    const folder = await request(server).post('/api/folders').set('Cookie', cookies).send({ name: 'Archives' }).expect(201);
    await request(server).delete(`/api/folders/${folder.body.id}`).set('Cookie', cookies).expect(200);

    await request(server)
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'Sous-dossier', parentId: folder.body.id })
      .expect(404);
    await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', folder.body.id)
      .attach('file', Buffer.from('x'), 'x.txt')
      .expect(404);

    // Le nom "Archives" redevient disponible a la racine malgre le dossier homonyme en corbeille
    await request(server).post('/api/folders').set('Cookie', cookies).send({ name: 'Archives' }).expect(201);
  });

  it("renvoie l'emplacement, la taille cumulee et le contenu (hors corbeille) via les proprietes", async () => {
    const server = app.getHttpServer();
    const { cookies } = await signUpAndSignIn(app, `props-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');
    const other = await signUpAndSignIn(app, `props-other-${Date.now()}@nimbus.local`, 'correct-horse-battery-staple');

    const a = await request(server).post('/api/folders').set('Cookie', cookies).send({ name: 'A' }).expect(201);
    const b = await request(server)
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'B', parentId: a.body.id })
      .expect(201);
    const c = await request(server)
      .post('/api/folders')
      .set('Cookie', cookies)
      .send({ name: 'C', parentId: a.body.id })
      .expect(201);

    const inA = await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', a.body.id)
      .attach('file', Buffer.alloc(10, 'a'), 'a.txt')
      .expect(201);
    const inB = await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', b.body.id)
      .attach('file', Buffer.alloc(100, 'b'), 'b.txt')
      .expect(201);
    const trashed = await request(server)
      .post('/api/files')
      .set('Cookie', cookies)
      .field('folderId', b.body.id)
      .attach('file', Buffer.alloc(1000, 'c'), 'c.txt')
      .expect(201);
    await request(server).delete(`/api/files/${trashed.body.id}`).set('Cookie', cookies).expect(200);
    // Un sous-dossier en corbeille (avec son contenu) n'est pas compte non plus.
    await request(server).delete(`/api/folders/${c.body.id}`).set('Cookie', cookies).expect(200);

    const folderProps = await request(server).get(`/api/folders/${a.body.id}/properties`).set('Cookie', cookies).expect(200);
    expect(folderProps.body).toEqual({ path: [], sizeBytes: 110, fileCount: 2, folderCount: 1 });

    const nestedFolderProps = await request(server)
      .get(`/api/folders/${b.body.id}/properties`)
      .set('Cookie', cookies)
      .expect(200);
    expect(nestedFolderProps.body).toEqual({ path: ['A'], sizeBytes: 100, fileCount: 1, folderCount: 0 });

    const fileProps = await request(server).get(`/api/files/${inB.body.id}/properties`).set('Cookie', cookies).expect(200);
    expect(fileProps.body).toEqual({ path: ['A', 'B'] });

    const rootFileProps = await request(server).get(`/api/files/${inA.body.id}/properties`).set('Cookie', cookies).expect(200);
    expect(rootFileProps.body).toEqual({ path: ['A'] });

    await request(server).get(`/api/folders/${a.body.id}/properties`).set('Cookie', other.cookies).expect(404);
    await request(server).get(`/api/files/${inB.body.id}/properties`).set('Cookie', other.cookies).expect(404);
  });
});
