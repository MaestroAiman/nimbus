import type { INestApplication } from '@nestjs/common';
import express from 'express';

// L'envoi d'un dossier transmet tous ses chemins de sous-dossiers dans un seul corps JSON
// (POST /folders/tree) : un gros projet en compte des dizaines de milliers, bien au-dela des
// 100 Ko par defaut de express.json(). Le plafond n'est releve que pour cette route : 10 Mo
// couvrent les 50 000 chemins maximum du DTO (CreateFolderTreeDto) a ~60 octets chacun (~3 Mo).
const FOLDER_TREE_BODY_LIMIT = '10mb';

// Doit etre monte avant les parseurs de corps globaux : le premier parseur qui traite une requete
// remplit req.body, les suivants l'ignorent.
export function useBodyParsers(app: INestApplication): void {
  app.use('/api/folders/tree', express.json({ limit: FOLDER_TREE_BODY_LIMIT }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}
