import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { MovieBoxOfficeSection } from '@prisma/client';

export class CreateMovieBoxOfficeDto {
  @IsEnum(MovieBoxOfficeSection)
  section: MovieBoxOfficeSection;

  @IsString()
  @MinLength(1)
  movieName: string;

  @IsString()
  @MinLength(1)
  linkUrl: string;

  @IsString()
  @MinLength(1)
  amount: string;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMovieBoxOfficeDto {
  @IsOptional()
  @IsEnum(MovieBoxOfficeSection)
  section?: MovieBoxOfficeSection;

  @IsOptional()
  @IsString()
  @MinLength(1)
  movieName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  linkUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  amount?: string;

  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class ListMovieBoxOfficeQueryDto {
  @IsOptional()
  @IsEnum(MovieBoxOfficeSection)
  section?: MovieBoxOfficeSection;
}
