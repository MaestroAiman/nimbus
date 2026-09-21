import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFolderTreeDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  rootName!: string;

  // Chemins relatifs a la racine (ex. "2024", "2024/ete"). Le plafond tient dans la limite de 10 Mo
  // du parseur JSON de cette route (config/body-parsers.ts). Chaque segment est verifie par
  // FoldersService.createTree.
  @IsArray()
  @ArrayMaxSize(50_000)
  @IsString({ each: true })
  @MaxLength(1024, { each: true })
  dirs!: string[];
}
