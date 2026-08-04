import { IsString, IsEnum, IsOptional, IsUrl, IsBoolean, IsInt, Min, Max, IsDateString } from 'class-validator';
import { AdType, AdZone } from '@prisma/client';

export class CreateAdvertisementDto {
  @IsString()
  name: string;

  @IsEnum(AdType)
  type: AdType;

  @IsOptional()
  @IsUrl()
  imageUrlDesktop?: string;

  @IsOptional()
  @IsUrl()
  imageUrlMobile?: string;

  @IsOptional()
  @IsUrl()
  landingUrl?: string;

  @IsOptional()
  @IsString()
  scriptCode?: string;

  @IsEnum(AdZone)
  zone: AdZone;

  @IsBoolean()
  showOnDesktop: boolean;

  @IsBoolean()
  showOnMobile: boolean;

  @IsBoolean()
  isRoadblock: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  roadblockDelayMs?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  roadblockCookieTTL?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsBoolean()
  isActive: boolean;

  @IsInt()
  @Min(0)
  sortOrder: number;
}
