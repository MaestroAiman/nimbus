import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
