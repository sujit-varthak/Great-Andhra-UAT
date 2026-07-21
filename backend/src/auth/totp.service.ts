import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  generateSecret() {
    return authenticator.generateSecret();
  }

  async generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(email, 'GreatAndhra CMS', secret);
    return QRCode.toDataURL(otpauth);
  }

  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }
}
