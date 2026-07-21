import { IsDateString, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateEpaperImageDto {
  @IsDateString()
  editionDate: string;

  @IsInt()
  @Min(1)
  pageNumber: number;

  @IsString()
  @MinLength(1)
  imageUrl: string;
}
