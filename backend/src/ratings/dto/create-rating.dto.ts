import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  value: number;

  @IsString()
  @MinLength(1)
  fingerprint: string;
}
