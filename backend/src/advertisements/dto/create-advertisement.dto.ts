import { IsString, IsEnum, IsOptional, IsUrl, IsBoolean, IsInt, Min, Max, IsDateString } from 'class-validator';
import { AdType, AdZone, GaPageType, InterstitialTriggerType } from '@prisma/client';

export class CreateAdvertisementDto {
  @IsString()
  name: string;

  @IsEnum(AdType)
  type: AdType;

  // `null` explicitly clears the field on update (see AdvertisementForm's payload comment) -
  // @IsOptional() skips the @IsUrl() check for both undefined and null.
  @IsOptional()
  @IsUrl()
  imageUrlDesktop?: string | null;

  @IsOptional()
  @IsUrl()
  imageUrlMobile?: string | null;

  @IsOptional()
  @IsUrl()
  landingUrl?: string | null;

  @IsOptional()
  @IsString()
  scriptCode?: string | null;

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

  // FULLSCREEN_INTERSTITIAL_AD-specific
  @IsOptional()
  @IsEnum(InterstitialTriggerType)
  interstitialTriggerType?: InterstitialTriggerType;

  @IsOptional()
  @IsEnum(GaPageType)
  interstitialFromPage?: GaPageType;

  @IsOptional()
  @IsEnum(GaPageType)
  interstitialToPage?: GaPageType;

  @IsOptional()
  @IsInt()
  @Min(1)
  interstitialTimerSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  interstitialFrequencyHours?: number;

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
