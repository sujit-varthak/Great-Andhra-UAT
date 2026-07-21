import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  inviteToken: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  password: string;
}
