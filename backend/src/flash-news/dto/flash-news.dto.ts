import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFlashNewsDto {
  @IsString()
  @MinLength(1)
  headline: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateFlashNewsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  headline?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
